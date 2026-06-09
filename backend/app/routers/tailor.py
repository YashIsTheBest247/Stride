import base64
import io
import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..services.latex import CompileResult, LatexCompileError, compile_latex_to_pdf
from ..services.llm import distill_job_description, fix_latex_compile_error, tailor_resume
from ..services.preprocess import (
    MAX_SHRINK_LEVEL,
    count_achievement_items,
    sanitize_for_tectonic,
    shrink_to_fit,
)

logger = logging.getLogger("uvicorn.error")

router = APIRouter(tags=["tailor"])

MAX_LATEX_CHARS = 250_000
MAX_JD_CHARS = 20_000

# A one-page render with an Overfull \vbox taller than this (points) has its
# bottom clipped → treat as "doesn't fit" and shrink. Small overfulls (a stray
# rule/last line a hair too tall) are visually harmless and shouldn't trigger
# the aggressive 10pt squeeze on an otherwise-fitting resume.
_OVERFLOW_PT_THRESHOLD = 3.0


class TailorRequest(BaseModel):
    latex_source: str = Field(..., min_length=1, max_length=MAX_LATEX_CHARS)
    job_description: str = Field(..., min_length=1, max_length=MAX_JD_CHARS)


def _compile_with_repair(latex: str) -> CompileResult:
    """Compile with one LLM-assisted retry on failure.

    Tectonic is strict; the original LaTeX (or the LLM-tailored output) often
    has small issues another engine would tolerate (e.g. wrong-case option
    `dvipsNames`). If the first compile fails, we send the .tex + the actual
    Tectonic error back to the LLM and ask for a minimal repair, then retry.
    Only a second failure surfaces to the user as 422.
    """
    try:
        return compile_latex_to_pdf(latex)
    except LatexCompileError as first_exc:
        logger.warning(
            "[STRIDE Tectonic] first compile failed (%s) — attempting LLM repair",
            first_exc,
        )
        error_blob = f"{first_exc}\n\n--- log tail ---\n{first_exc.log_tail or '(no log)'}"
        try:
            repaired = fix_latex_compile_error(latex, error_blob)
        except (ValueError, RuntimeError) as repair_exc:
            logger.error("[STRIDE Tectonic] repair LLM failed: %s", repair_exc)
            raise first_exc  # surface the ORIGINAL error to the user
        logger.info("[STRIDE Tectonic] repair produced %d chars, retrying compile", len(repaired))
        try:
            pdf = compile_latex_to_pdf(repaired)
            logger.info("[STRIDE Tectonic] repaired compile succeeded")
            return pdf
        except LatexCompileError as second_exc:
            logger.error(
                "[STRIDE Tectonic] repaired compile ALSO failed: %s\n--- log tail ---\n%s",
                second_exc, second_exc.log_tail or "(no log)",
            )
            raise second_exc


@router.post("/tailor")
def tailor(payload: TailorRequest):
    # NB: deliberately a SYNC `def`, not `async def`. The body makes blocking
    # calls — the Gemini SDK (`generate_content`, plus blocking `time.sleep`
    # retries) and Tectonic via `subprocess.run` — that together run 60-90s.
    # Under a single uvicorn worker an `async def` would run all that on the
    # event loop, starving `/api/health`; Render then judges the instance
    # unhealthy and restarts it mid-request → empty-body 502. A sync handler
    # is dispatched to FastAPI's threadpool, keeping the loop free for health
    # checks so the request can finish and stream back the PDF.
    logger.info(
        "[STRIDE /tailor] received latex=%d chars  jd=%d chars",
        len(payload.latex_source),
        len(payload.job_description),
    )

    if not payload.latex_source.strip():
        raise HTTPException(status_code=400, detail="LaTeX source is empty.")
    if not payload.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description is required.")

    # Strip packages that crash Tectonic on Windows (fontawesome5 etc.)
    # before the LLM ever sees them — that way the rewritten output won't
    # re-introduce the problem either.
    sanitized_input = sanitize_for_tectonic(payload.latex_source)
    if len(sanitized_input) != len(payload.latex_source):
        logger.info(
            "[STRIDE /tailor] sanitized input: %d -> %d chars",
            len(payload.latex_source), len(sanitized_input),
        )

    def _diff_ratio(a: str, b: str) -> float:
        # Quick char-position diff. Cheap signal of "did the LLM rewrite?"
        if not a or not b:
            return 1.0
        differing = sum(1 for x, y in zip(a, b) if x != y)
        return differing / max(len(a), len(b))

    try:
        result = tailor_resume(sanitized_input, payload.job_description)
        # Echo detection — if the LLM (often a fallback model under load) just
        # echoed the input, retry once with the same prompt. Generation
        # temperature jitter usually breaks the echo on second attempt.
        if _diff_ratio(sanitized_input, result.latex) < 0.03:
            logger.warning(
                "[STRIDE /tailor] suspected echo (diff <3%%); retrying tailor once"
            )
            result = tailor_resume(sanitized_input, payload.job_description)
    except RuntimeError as exc:
        logger.error("[STRIDE LLM] config error: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        logger.error("[STRIDE LLM] parse error: %s", exc)
        raise HTTPException(status_code=502, detail=f"LLM response invalid: {exc}") from exc
    except Exception as exc:
        logger.exception("[STRIDE LLM] unexpected error")
        raise HTTPException(status_code=500, detail=f"LLM call failed: {exc}") from exc

    logger.info(
        "[STRIDE /tailor] LLM ok — name=%s company=%s role=%s latex=%d chars",
        result.full_name, result.company, result.role, len(result.latex),
    )

    # Sanity check: achievement points preserved? The Achievements list is the
    # one the LLM most often trims to save space — count before vs after and
    # flag any drop loudly (the prompt forbids dropping bullets).
    in_ach = count_achievement_items(sanitized_input)
    out_ach = count_achievement_items(result.latex)
    if out_ach < in_ach:
        logger.warning(
            "[STRIDE /tailor] ACHIEVEMENTS DROPPED: input=%d output=%d points (LLM trimmed the list)",
            in_ach, out_ach,
        )
    else:
        logger.info("[STRIDE /tailor] achievements preserved: input=%d output=%d points", in_ach, out_ach)

    # Sanity check: existing bullets preserved? (Adding new ones is now
    # explicitly allowed for JD-relevant augmentation — only a DROP is bad.)
    in_bullets = sanitized_input.count("\\resumeItem{") + sanitized_input.count("\\item ")
    out_bullets = result.latex.count("\\resumeItem{") + result.latex.count("\\item ")
    if out_bullets < in_bullets:
        logger.warning(
            "[STRIDE /tailor] BULLET COUNT DROPPED: input=%d output=%d (LLM violated preserve rule)",
            in_bullets, out_bullets,
        )
    elif out_bullets > in_bullets:
        logger.info(
            "[STRIDE /tailor] bullets augmented: input=%d output=%d (+%d JD-relevant adds)",
            in_bullets, out_bullets, out_bullets - in_bullets,
        )
    else:
        logger.info("[STRIDE /tailor] bullet count unchanged: %d", in_bullets)

    # Sanity check: did the LLM actually rewrite anything? If the output is
    # basically the input verbatim, the user got a useless PDF.
    in_chars = set(sanitized_input)  # cheap presence check; below is the real diff
    _ = in_chars  # unused, kept for future use
    changed_chars = sum(1 for a, b in zip(sanitized_input, result.latex) if a != b)
    longer = max(len(sanitized_input), len(result.latex))
    diff_ratio = changed_chars / longer if longer else 0
    if diff_ratio < 0.05:
        logger.warning(
            "[STRIDE /tailor] LOW DIFF: only %.1f%% of chars changed — LLM may have echoed input. "
            "Check the prompt: keyword injection isn't happening.",
            diff_ratio * 100,
        )
    else:
        logger.info("[STRIDE /tailor] char-diff vs input: %.1f%%", diff_ratio * 100)

    # Defence-in-depth: sanitize + finalize the LLM output (strip crash-y
    # packages, undo added bolds, repair/re-bullet lists). Compile at NATURAL
    # size first — only force the one-page shrink (10pt + extra textheight) if
    # the document actually overflows a page. This keeps short resumes from
    # being over-compressed into a sparse page with a big empty bottom.
    finalized = sanitize_for_tectonic(result.latex, finalize=True)

    def _fits_one_page(c: CompileResult) -> bool:
        # Confidently one page: exactly 1 page AND not overflowing the bottom.
        # A page == 1 with a big Overfull \vbox is content taller than the
        # printable area — the tail (e.g. Achievements) gets CLIPPED — so it
        # does NOT count as fitting.
        return c.pages == 1 and c.overfull_pt <= _OVERFLOW_PT_THRESHOLD

    try:
        compiled = _compile_with_repair(finalized)
        if not _fits_one_page(compiled):
            # If the page count was unreadable AND we saw no overflow, we can't
            # measure fit — apply a single gentle shrink as the safe default
            # rather than escalating blindly.
            unknown = compiled.pages == 0 and compiled.overfull_pt == 0
            max_level = 1 if unknown else MAX_SHRINK_LEVEL
            level = 1
            while level <= max_level:
                logger.info(
                    "[STRIDE /tailor] doesn't fit one page (pages=%s, overfull=%.1fpt); shrink level %d/%d",
                    compiled.pages or "unknown", compiled.overfull_pt, level, max_level,
                )
                compiled = _compile_with_repair(shrink_to_fit(finalized, level=level))
                if _fits_one_page(compiled):
                    break
                level += 1
            if not _fits_one_page(compiled):
                logger.warning(
                    "[STRIDE /tailor] content still overflows after max shrink (pages=%s, overfull=%.1fpt) — resume may be too long",
                    compiled.pages or "unknown", compiled.overfull_pt,
                )
        else:
            logger.info("[STRIDE /tailor] natural compile fits one page; no shrink applied")
        pdf_bytes = compiled.pdf
    except LatexCompileError as exc:
        raise HTTPException(
            status_code=422,
            detail={"message": str(exc), "log_tail": exc.log_tail},
        ) from exc
    except Exception as exc:
        logger.exception("[STRIDE Tectonic] unexpected error")
        raise HTTPException(status_code=500, detail=f"Tectonic call failed: {exc}") from exc

    logger.info("[STRIDE /tailor] PDF emitted — %d bytes", len(pdf_bytes))

    filename = f"{result.full_name}_{result.role}.pdf"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "X-Resume-Filename": filename,
        "X-Resume-Company": result.company,
        "X-Resume-Role": result.role,
        "Access-Control-Expose-Headers": "Content-Disposition, X-Resume-Filename, X-Resume-Company, X-Resume-Role",
    }
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf", headers=headers)


# ── Streaming variant: live per-step progress over Server-Sent Events ────────
# Same pipeline as /tailor, but yields a `data: {...}\n\n` event before/after
# each phase so the UI can show real progress (sanitize → tailor → compile →
# shrink → done). The final event carries the PDF as base64. The route is a
# sync def and the generator is sync, so Starlette iterates it in a threadpool
# — the blocking Gemini/Tectonic calls never stall the event loop (keeps
# /api/health responsive, which is what stops Render killing the worker).
_SHRINK_FONT = {1: "10pt", 2: "10pt (tighter)", 3: "9pt", 4: "8pt"}


def _sse(obj: dict) -> str:
    return f"data: {json.dumps(obj)}\n\n"


def _fits(c: CompileResult) -> bool:
    return c.pages == 1 and c.overfull_pt <= _OVERFLOW_PT_THRESHOLD


def _stream_tailor(payload: TailorRequest):
    try:
        yield _sse({"step": "sanitize", "label": "Sanitizing your LaTeX"})
        sanitized_input = sanitize_for_tectonic(payload.latex_source)

        yield _sse({"step": "tailor", "label": "Tailoring with Gemini — weaving in the job's keywords"})
        result = tailor_resume(sanitized_input, payload.job_description)

        in_b = sanitized_input.count("\\resumeItem{") + sanitized_input.count("\\item ")
        out_b = result.latex.count("\\resumeItem{") + result.latex.count("\\item ")
        in_ach = count_achievement_items(sanitized_input)
        out_ach = count_achievement_items(result.latex)
        delta = out_b - in_b
        bump = f"+{delta}" if delta > 0 else str(delta)
        yield _sse({
            "step": "tailor_done",
            "label": f"Keywords injected — {out_b} bullets ({bump}), {out_ach}/{in_ach} achievements kept",
        })

        finalized = sanitize_for_tectonic(result.latex, finalize=True)

        yield _sse({"step": "compile", "label": "Compiling with Tectonic"})
        try:
            compiled = compile_latex_to_pdf(finalized)
        except LatexCompileError as exc:
            yield _sse({"step": "repair", "label": "Hit a LaTeX error — repairing with AI and recompiling"})
            finalized = fix_latex_compile_error(finalized, f"{exc}\n\n{exc.log_tail or ''}")
            compiled = compile_latex_to_pdf(finalized)

        if _fits(compiled):
            yield _sse({"step": "fit", "label": "Fits on one page — no shrink needed"})
        else:
            unknown = compiled.pages == 0 and compiled.overfull_pt == 0
            max_level = 1 if unknown else MAX_SHRINK_LEVEL
            level = 1
            while level <= max_level:
                pages_txt = f"{compiled.pages} pages" if compiled.pages and compiled.pages > 1 else "content overflowing"
                yield _sse({
                    "step": "shrink",
                    "label": f"Doesn't fit ({pages_txt}) — shrinking to {_SHRINK_FONT.get(level, 'smaller')} ({level}/{max_level})",
                })
                compiled = compile_latex_to_pdf(shrink_to_fit(finalized, level=level))
                if _fits(compiled):
                    break
                level += 1
            yield _sse({"step": "fit", "label": "Squeezed onto one page" if _fits(compiled) else "Fit as tight as possible"})

        filename = f"{result.full_name}_{result.role}.pdf"
        yield _sse({
            "step": "done",
            "label": "Ready",
            "filename": filename,
            "company": result.company,
            "role": result.role,
            "pdf": base64.b64encode(compiled.pdf).decode("ascii"),
        })
    except (LatexCompileError, ValueError, RuntimeError) as exc:
        logger.error("[STRIDE /tailor/stream] %s", exc)
        yield _sse({"step": "error", "message": str(exc)})
    except Exception as exc:  # noqa: BLE001
        logger.exception("[STRIDE /tailor/stream] unexpected error")
        yield _sse({"step": "error", "message": f"Unexpected error: {exc}"})


@router.post("/tailor/stream")
def tailor_stream(payload: TailorRequest):
    if not payload.latex_source.strip():
        raise HTTPException(status_code=400, detail="LaTeX source is empty.")
    if not payload.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description is required.")
    return StreamingResponse(
        _stream_tailor(payload),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Job-description PDF distillation ─────────────────────────────────────────
class DistillRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=MAX_JD_CHARS * 3)


@router.post("/distill-jd")
def distill_jd(payload: DistillRequest):
    """Reduce raw extracted PDF text to just the role, responsibilities,
    requirements, and required skills — dropping company boilerplate, benefits,
    legal, and application/navigation noise."""
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="No text to distill.")
    try:
        cleaned = distill_job_description(text)
    except (ValueError, RuntimeError) as exc:
        # On any LLM hiccup, fall back to the raw text so the user still gets the JD.
        logger.warning("[STRIDE /distill-jd] falling back to raw text: %s", exc)
        cleaned = text
    return {"job_description": cleaned}

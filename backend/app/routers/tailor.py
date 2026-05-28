import io
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..services.latex import LatexCompileError, compile_latex_to_pdf
from ..services.llm import fix_latex_compile_error, tailor_resume
from ..services.preprocess import sanitize_for_tectonic

logger = logging.getLogger("uvicorn.error")

router = APIRouter(tags=["tailor"])

MAX_LATEX_CHARS = 250_000
MAX_JD_CHARS = 20_000


class TailorRequest(BaseModel):
    latex_source: str = Field(..., min_length=1, max_length=MAX_LATEX_CHARS)
    job_description: str = Field(..., min_length=1, max_length=MAX_JD_CHARS)


def _compile_with_repair(latex: str) -> bytes:
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
async def tailor(payload: TailorRequest):
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

    try:
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

    # Sanity check: did the LLM preserve the bullet count?
    in_bullets = sanitized_input.count("\\resumeItem{") + sanitized_input.count("\\item ")
    out_bullets = result.latex.count("\\resumeItem{") + result.latex.count("\\item ")
    if out_bullets < in_bullets:
        logger.warning(
            "[STRIDE /tailor] BULLET COUNT DROPPED: input=%d output=%d (LLM ignored preserve rule)",
            in_bullets, out_bullets,
        )
    elif out_bullets > in_bullets:
        logger.warning(
            "[STRIDE /tailor] bullet count INCREASED: input=%d output=%d",
            in_bullets, out_bullets,
        )
    else:
        logger.info("[STRIDE /tailor] bullet count preserved: %d", in_bullets)

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

    # Defence-in-depth: sanitize the LLM output too, in case it added back
    # any crash-triggering packages despite the preserve-rules in the prompt.
    # `shrink=True` forces the final document to 10pt + extra textheight so
    # the tailored resume reliably fits on one page.
    safe_latex = sanitize_for_tectonic(result.latex, shrink=True)

    try:
        pdf_bytes = _compile_with_repair(safe_latex)
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

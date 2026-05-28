import json
import logging
import re
import time
from dataclasses import dataclass

from google import genai
from google.genai import types

from ..config import get_settings
from ..prompts import SYSTEM_PROMPT, build_user_prompt

logger = logging.getLogger("uvicorn.error")

# Tunables for transient-error retries (Gemini 503 / 429 / 500).
_RETRY_STATUSES = ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED", "500", "INTERNAL")
_MAX_RETRIES = 3
_BACKOFFS_SEC = (2.0, 5.0, 10.0)  # exponential-ish


@dataclass
class TailorResult:
    latex: str
    full_name: str
    company: str
    role: str


_LATEX_BLOCK = re.compile(r"```(?:latex|tex)?\s*\n(.*?)```", re.DOTALL)
# Accepts either the new "full_name" field or the legacy "first_name" key.
_METADATA_LINE = re.compile(
    r"\{[^{}\n]*\"(?:full_name|first_name)\"[^{}\n]*\}", re.DOTALL
)


_REPAIR_SYSTEM_PROMPT = """You are a LaTeX compile-error fixer for the STRIDE pipeline.

You receive:
  1. A .tex source that failed to compile under Tectonic (XeLaTeX, strict mode).
  2. The Tectonic error message (with log tail).

Return ONLY the FULL fixed .tex source inside a single fenced code block tagged `latex`.

RULES:
- Make the MINIMUM edits required to compile. Do not refactor.
- Preserve content, structure, layout, fonts, packages, and section ordering.
- Common fixes to consider:
  * Option case errors (e.g. `dvipsNames` → `dvipsnames`)
  * Switch `color` to `xcolor` when the option list requires it
    (`dvipsnames`, `svgnames`, `x11names`, `table`, etc. are xcolor-only)
  * Escape unescaped special chars in plain prose (%, &, _, #, $)
  * Balance braces, env begin/end pairs
  * Remove options that are unsupported by the listed package
  * Add missing \\usepackage{} for commands that aren't defined
- Do NOT add new sections, jobs, or content. Do NOT change wording.
- Do NOT add commentary, only the code block.

Output format example:
```latex
\\documentclass{...}
...full fixed file...
```
"""


def _sanitize_segment(value: str, fallback: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]+", "_", (value or "").strip()).strip("_")
    return cleaned or fallback


# Words that almost always appear in a job title. Used by the JD-side
# fallback extractor when the LLM returns the literal "Role" placeholder.
_ROLE_NOUNS = (
    "engineer", "developer", "designer", "scientist", "analyst", "manager",
    "intern", "associate", "consultant", "specialist", "architect",
    "researcher", "lead", "director", "head", "administrator",
    "programmer", "coordinator", "strategist", "marketer",
)
_ROLE_NOUNS_RE = re.compile(
    r"\b(?:" + "|".join(_ROLE_NOUNS) + r")s?\b", re.IGNORECASE
)

# Labelled-line patterns: "Position: Backend Developer", "Role: ...", etc.
_LABELLED_ROLE = re.compile(
    r"^(?:\s*[*#>\-]+\s*)?"                          # optional bullet/header prefix
    r"(?:job\s*title|position|role|title|hiring\s*for)"
    r"\s*[:\-]\s*"
    r"([^\n]+)",
    re.IGNORECASE | re.MULTILINE,
)

# Verb-phrase patterns inside prose: "We are hiring a Senior Backend Engineer..."
_PROSE_ROLE = re.compile(
    r"\b(?:hiring|seeking|looking\s+for|recruiting|join\s+us\s+as|in\s+search\s+of)\s+"
    r"(?:a|an|the|our\s+next)?\s*"
    r"([A-Z][A-Za-z0-9/+\-]*(?:\s+[A-Za-z0-9/+\-]+){0,5})",
)


def _extract_role_from_jd(jd: str) -> str | None:
    """Best-effort regex extraction of a job title from a free-form JD.

    Tried in priority order:
      1. Labelled lines: "Position: X" / "Role: X" / "Job Title: X".
      2. Hiring-verb prose: "We are hiring a Senior Backend Engineer ...".
      3. First short line (≤ 80 chars) that contains a role noun.
    Returns None if nothing usable is found.
    """
    if not jd:
        return None
    text = jd.strip()

    # 1. Labelled line — take only up to the first sentence-ending punctuation
    #    or pipe/bullet/comma, then trim role nouns out from any noise after.
    m = _LABELLED_ROLE.search(text)
    if m:
        candidate = re.split(r"[|•·,.;\n]", m.group(1), maxsplit=1)[0].strip()
        candidate = re.sub(r"\s+", " ", candidate).strip(" -–—:")
        if candidate and len(candidate) <= 80:
            return candidate

    # 2. Prose verb match — only accept if the captured phrase has a role noun
    for m in _PROSE_ROLE.finditer(text):
        phrase = m.group(1).strip()
        if _ROLE_NOUNS_RE.search(phrase):
            # trim trailing "to ...", "who ...", "with ..." clauses
            phrase = re.split(r"\b(?:to|who|that|with|for|in|at)\b", phrase, maxsplit=1)[0].strip()
            if phrase and len(phrase) <= 80:
                return phrase

    # 3. First short line with a role noun (typical for JDs that lead with the
    #    title as a header). Skip lines that look like company taglines.
    for line in text.splitlines()[:20]:
        stripped = line.strip(" -–—*#>").strip()
        if not stripped or len(stripped) > 80:
            continue
        if _ROLE_NOUNS_RE.search(stripped):
            return stripped

    return None


# Trailing tokens we strip from the role to keep the filename short. The user
# wants the *position* in the filename, not employment-type fluff.
_ROLE_TRAIL_NOISE = (
    "internship", "interns", "intern",
    "part_time", "parttime", "part",
    "full_time", "fulltime",
    "contract", "contractor", "freelance",
    "temporary", "temp",
    "remote", "onsite", "hybrid",
    "summer", "winter", "spring", "fall",
)


def _clean_role_for_filename(role_segment: str) -> str:
    """Strip Internship/Part_Time/Intern/etc. suffix tokens from the role.

    Operates on the already-sanitized Title_Case_With_Underscores form.
    Strips one trailing noise token at a time until none remain.
    """
    parts = [p for p in role_segment.split("_") if p]
    while parts and parts[-1].lower() in _ROLE_TRAIL_NOISE:
        parts.pop()
    # Also handle compound trailing tokens like "Part" + "Time" left as
    # separate parts after one strip round
    while len(parts) >= 2 and (parts[-2].lower() + "_" + parts[-1].lower()) in _ROLE_TRAIL_NOISE:
        parts.pop()
        parts.pop()
    return "_".join(parts) if parts else role_segment


def _parse_response(raw: str) -> TailorResult:
    latex_match = _LATEX_BLOCK.search(raw)
    if not latex_match:
        raise ValueError("LLM did not return a ```latex code block.")
    latex = latex_match.group(1).rstrip() + "\n"

    metadata_match = _METADATA_LINE.search(raw[: latex_match.start()])
    if not metadata_match:
        metadata_match = _METADATA_LINE.search(raw)
    if not metadata_match:
        raise ValueError("LLM did not return the metadata JSON line.")

    try:
        meta = json.loads(metadata_match.group(0))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Could not parse metadata JSON: {exc}") from exc

    raw_name = meta.get("full_name") or meta.get("first_name") or ""
    role_clean = _clean_role_for_filename(_sanitize_segment(meta.get("role", ""), "Role"))
    return TailorResult(
        latex=latex,
        full_name=_sanitize_segment(raw_name, "Candidate"),
        company=_sanitize_segment(meta.get("company", ""), "Company"),
        role=role_clean or "Role",
    )


def _get_client() -> "genai.Client":
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")
    return genai.Client(api_key=settings.gemini_api_key)


def _is_transient(exc: Exception) -> bool:
    """True if the Gemini exception looks like a temporary capacity/quota blip."""
    msg = str(exc).upper()
    return any(token in msg for token in _RETRY_STATUSES)


def _attempt_with_retries(model: str, contents: str, system_instruction: str, temperature: float):
    """One model + the configured retry policy. Raises on final failure."""
    client = _get_client()
    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES + 1):
        try:
            return client.models.generate_content(
                model=model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=temperature,
                    max_output_tokens=16000,
                ),
            )
        except Exception as exc:
            last_exc = exc
            if attempt >= _MAX_RETRIES or not _is_transient(exc):
                raise
            delay = _BACKOFFS_SEC[min(attempt, len(_BACKOFFS_SEC) - 1)]
            logger.warning(
                "[STRIDE Gemini:%s] transient error (attempt %d/%d), retrying in %.1fs: %s",
                model, attempt + 1, _MAX_RETRIES + 1, delay, str(exc)[:200],
            )
            time.sleep(delay)
    raise last_exc if last_exc else RuntimeError("Gemini call failed without exception")


def _call_gemini(model: str, contents: str, system_instruction: str, temperature: float):
    """Try primary model with retries; on persistent transient failure, fall
    back to the configured backup model (different capacity pool) for one
    more retry cycle. This catches Gemini 2.5 Flash "high demand" hiccups."""
    settings = get_settings()
    try:
        return _attempt_with_retries(model, contents, system_instruction, temperature)
    except Exception as exc:
        fallback = settings.gemini_model_fallback.strip()
        if fallback and fallback != model and _is_transient(exc):
            logger.warning(
                "[STRIDE Gemini] primary %s exhausted retries; falling back to %s",
                model, fallback,
            )
            return _attempt_with_retries(fallback, contents, system_instruction, temperature)
        raise


def tailor_resume(latex_source: str, job_description: str) -> TailorResult:
    settings = get_settings()
    response = _call_gemini(
        model=settings.gemini_model,
        contents=build_user_prompt(latex_source, job_description),
        system_instruction=SYSTEM_PROMPT,
        # Higher temp than the repair pass — we WANT creative rewrites that
        # weave JD keywords into existing bullets, not a verbatim echo.
        temperature=0.45,
    )
    raw = (response.text or "").strip()
    if not raw:
        raise ValueError("Gemini returned an empty response.")
    try:
        result = _parse_response(raw)
    except ValueError:
        # Log a short head of the unparseable response so we can debug from the
        # terminal without polluting the working directory with dump files.
        head = raw[:400].replace("\n", "\\n")
        logger.error("[STRIDE LLM] parse failed (len=%d) head=%r", len(raw), head)
        raise

    # JD-side fallback: if the LLM returned the literal "Role" placeholder
    # (i.e. it couldn't pull a title from the JD), try regex extraction over
    # the JD ourselves. Same for company via a simple "at <Company>" sweep.
    if result.role == "Role":
        extracted = _extract_role_from_jd(job_description)
        if extracted:
            cleaned = _clean_role_for_filename(_sanitize_segment(extracted, "Role"))
            if cleaned and cleaned != "Role":
                logger.info(
                    "[STRIDE LLM] LLM returned placeholder role; extracted %r from JD",
                    cleaned,
                )
                result.role = cleaned
    return result


def fix_latex_compile_error(latex: str, tectonic_error: str) -> str:
    """Ask Gemini to repair a .tex that Tectonic failed to compile.

    Returns the repaired .tex string. Raises ValueError if the model didn't
    return a parseable ```latex block.
    """
    settings = get_settings()
    user_prompt = (
        "TECTONIC ERROR:\n"
        "----------------\n"
        f"{tectonic_error.strip()}\n\n"
        "BROKEN .tex:\n"
        "------------\n"
        f"{latex}\n\n"
        "Return the FULL fixed .tex inside a ```latex code block."
    )
    response = _call_gemini(
        model=settings.gemini_model,
        contents=user_prompt,
        system_instruction=_REPAIR_SYSTEM_PROMPT,
        temperature=0.0,
    )
    raw = (response.text or "").strip()
    if not raw:
        raise ValueError("Repair LLM returned an empty response.")
    match = _LATEX_BLOCK.search(raw)
    if not match:
        raise ValueError("Repair LLM did not return a ```latex code block.")
    return match.group(1).rstrip() + "\n"

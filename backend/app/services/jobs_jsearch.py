"""JSearch (RapidAPI) fetcher — aggregates LinkedIn, Indeed, Glassdoor,
ZipRecruiter into one paid API. Skipped silently if RAPIDAPI_KEY is unset.

Docs: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from ..config import get_settings

logger = logging.getLogger("uvicorn.error")

_HOST = "jsearch.p.rapidapi.com"
_URL = f"https://{_HOST}/search"
_TIMEOUT = httpx.Timeout(20.0, connect=5.0)


_CURRENCY_SYMBOL = {
    "USD": "$", "EUR": "€", "GBP": "£", "INR": "₹", "CAD": "C$", "AUD": "A$", "JPY": "¥",
}


def _fmt_salary_amount(n: float | int | None) -> str:
    if not n:
        return ""
    n = float(n)
    if n >= 1000:
        # 50000 -> 50K, 80000 -> 80K, 5000 -> 5K
        whole = int(n // 1000)
        rem = int(round((n / 1000 - whole) * 10))
        return f"{whole}K" if rem == 0 else f"{whole}.{rem}K"
    return f"{int(n)}"


def _build_stipend(raw: dict[str, Any]) -> str:
    """Format JSearch's structured salary fields into 'min – max / period'."""
    lo = raw.get("job_min_salary")
    hi = raw.get("job_max_salary")
    cur = (raw.get("job_salary_currency") or "USD").upper()
    period = (raw.get("job_salary_period") or "").upper()
    if not lo and not hi:
        return ""
    sym = _CURRENCY_SYMBOL.get(cur, cur + " ")
    if lo and hi and lo != hi:
        amount = f"{sym}{_fmt_salary_amount(lo)}–{sym}{_fmt_salary_amount(hi)}"
    else:
        amount = f"{sym}{_fmt_salary_amount(hi or lo)}"
    suffix = {"HOUR": "/hr", "MONTH": "/mo", "WEEK": "/wk", "YEAR": "/yr"}.get(period, "")
    return f"{amount}{suffix}".strip()


def _normalize(raw: dict[str, Any]) -> dict[str, Any]:
    """Map a JSearch result to our internal Job-shaped dict."""
    city = raw.get("job_city") or ""
    state = raw.get("job_state") or ""
    country = raw.get("job_country") or ""
    is_remote = bool(raw.get("job_is_remote"))
    parts = [p for p in (city, state, country) if p]
    location = ", ".join(parts)
    if is_remote:
        location = ("Remote · " + location) if location else "Remote"

    publisher = (raw.get("job_publisher") or "JSearch").strip() or "JSearch"

    logo = (raw.get("employer_logo") or "").strip()
    if not logo:
        website = (raw.get("employer_website") or "").strip()
        if website:
            try:
                from urllib.parse import urlparse
                host = urlparse(
                    website if website.startswith(("http://", "https://")) else f"https://{website}"
                ).hostname or ""
                host = host.replace("www.", "")
                if host:
                    logo = f"https://www.google.com/s2/favicons?domain={host}&sz=128"
            except Exception:
                pass

    description = (raw.get("job_description") or "").strip()
    stipend = _build_stipend(raw)
    # Duration: JSearch doesn't have a structured field, so heuristic-extract
    # from the description (same regex used for board jobs).
    from .jobs import _extract_duration, _extract_stipend
    if not stipend:
        stipend = _extract_stipend(description)
    duration = _extract_duration(description)

    return {
        "company": (raw.get("employer_name") or "Unknown").strip(),
        "role": (raw.get("job_title") or "").strip(),
        "location": location,
        "description": description,
        "url": raw.get("job_apply_link") or raw.get("job_google_link") or "",
        "source": publisher.lower(),
        "posted_at": raw.get("job_posted_at_datetime_utc") or "",
        "logo_url": logo,
        "stipend": stipend,
        "duration": duration,
    }


async def fetch_jsearch(
    role: str,
    location: str,
    *,
    internship_only: bool,
    num_pages: int = 1,
) -> list[dict[str, Any]]:
    """Fetch jobs from JSearch. Returns list of Job-shaped dicts (NOT Job
    objects — keeps this module decoupled from services.jobs)."""
    settings = get_settings()
    key = settings.rapidapi_key.strip()
    if not key:
        return []

    # Build a single free-text query — JSearch doesn't take structured fields.
    query_parts = [role.strip(), location.strip()]
    query = " ".join(p for p in query_parts if p) or "intern"

    params: dict[str, Any] = {
        "query": query,
        "page": "1",
        "num_pages": str(num_pages),
    }
    if internship_only:
        params["employment_types"] = "INTERN"
    if "remote" in location.lower():
        params["remote_jobs_only"] = "true"

    headers = {
        "x-rapidapi-key": key,
        "x-rapidapi-host": _HOST,
    }

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(_URL, params=params, headers=headers)
            r.raise_for_status()
            payload = r.json()
    except Exception as exc:
        logger.warning("[jobs/jsearch] request failed: %s", exc)
        return []

    raw_jobs = payload.get("data") or []
    logger.info("[jobs/jsearch] returned %d results for query=%r", len(raw_jobs), query)
    return [_normalize(j) for j in raw_jobs]

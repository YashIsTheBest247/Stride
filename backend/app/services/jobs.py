"""Fetch + filter job postings.

Sources (each fetcher is independent; missing API keys are silently skipped):
  - Greenhouse public boards          (free, see app/data/companies.py)
  - Lever public boards               (free, see app/data/companies.py)
  - JSearch on RapidAPI               (paid; aggregates LinkedIn + Indeed +
                                       Glassdoor + ZipRecruiter)

Pipeline:
  fetch_all_jobs(role, location, internship_only) → list[Job]
  filter_jobs(jobs, role, location, internship_only) → list[Job]   (exact-token filter)

No scoring or ranking — every job that matches the hard filters is returned,
sorted by posted_at desc (newest first) when available, then by company name.
"""
from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass
from html import unescape

import httpx

from ..data.companies import COMPANIES, Company
from .jobs_jsearch import fetch_jsearch

logger = logging.getLogger("uvicorn.error")

_TIMEOUT = httpx.Timeout(15.0, connect=5.0)
_USER_AGENT = "stride-jobs/0.1 (+https://github.com/YashIsTheBest247/Stride)"
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")
_WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9+#.\-]+")

_INTERN_TOKENS = {"intern", "interns", "internship", "internships"}


@dataclass
class Job:
    company: str
    role: str
    location: str
    description: str        # plain text (HTML stripped)
    url: str
    source: str             # "greenhouse" | "lever" | "linkedin" | "indeed" | "glassdoor" | …
    posted_at: str = ""
    logo_url: str = ""      # company logo (favicon API or JSearch employer_logo)
    stipend: str = ""       # human-readable, e.g. "$25/hr" or "$50K–$80K / yr"
    duration: str = ""      # human-readable, e.g. "12 weeks" or "Summer 2026"


def _favicon(domain: str) -> str:
    """Google's free favicon service. 128px is sharp on retina cards."""
    if not domain:
        return ""
    return f"https://www.google.com/s2/favicons?domain={domain}&sz=128"


# ── Stipend + duration heuristics (for sources without structured fields) ───

# $50,000 - $80,000 / year   |   $25/hr   |   ₹25,000 per month
_STIPEND_RE = re.compile(
    r"(?:[$€£¥₹]|INR|USD|EUR|GBP|CAD|AUD)\s*[\d,]+(?:\.\d+)?\s*(?:k|K)?"
    r"(?:\s*[-–to]+\s*(?:[$€£¥₹]|INR|USD|EUR|GBP|CAD|AUD)?\s*[\d,]+(?:\.\d+)?\s*(?:k|K)?)?"
    r"\s*(?:/|\bper\b)\s*"
    r"(?:hour|hr|week|wk|month|mo|year|yr|annum)",
    re.IGNORECASE,
)

# 12 weeks | 3-month | summer 2026 | spring/fall/winter <year>
_DURATION_RE = re.compile(
    r"\b(?:\d{1,2}|three|four|five|six|seven|eight|nine|ten|twelve|sixteen)"
    r"\s*[-\s]?\s*(?:week|month)s?\b"
    r"|\b(?:summer|spring|fall|autumn|winter)\s+(?:20\d{2})\b",
    re.IGNORECASE,
)


def _extract_stipend(text: str) -> str:
    if not text:
        return ""
    m = _STIPEND_RE.search(text)
    return m.group(0).strip() if m else ""


def _extract_duration(text: str) -> str:
    if not text:
        return ""
    m = _DURATION_RE.search(text)
    return m.group(0).strip().title() if m else ""


def _strip_html(html: str) -> str:
    if not html:
        return ""
    text = _TAG_RE.sub(" ", unescape(html))
    return _WS_RE.sub(" ", text).strip()


def _tokenize(text: str) -> set[str]:
    """Lowercase word-token set. Keeps tech tokens like c++, node.js, ci/cd."""
    return {w.lower() for w in _WORD_RE.findall(text or "")}


# ── Source fetchers ─────────────────────────────────────────────────────────

async def _fetch_greenhouse(client: httpx.AsyncClient, c: Company) -> list[Job]:
    url = f"https://boards-api.greenhouse.io/v1/boards/{c.slug}/jobs?content=true"
    try:
        r = await client.get(url, headers={"User-Agent": _USER_AGENT})
        r.raise_for_status()
        payload = r.json()
    except Exception as exc:
        logger.warning("[jobs/greenhouse] fetch failed for %s: %s", c.slug, exc)
        return []
    jobs: list[Job] = []
    logo = _favicon(c.domain)
    for j in payload.get("jobs") or []:
        loc = (j.get("location") or {}).get("name") or ""
        desc = _strip_html(j.get("content") or "")
        jobs.append(Job(
            company=c.name,
            role=(j.get("title") or "").strip(),
            location=loc,
            description=desc,
            url=j.get("absolute_url") or "",
            source="greenhouse",
            posted_at=j.get("updated_at") or "",
            logo_url=logo,
            stipend=_extract_stipend(desc),
            duration=_extract_duration(desc),
        ))
    return jobs


async def _fetch_lever(client: httpx.AsyncClient, c: Company) -> list[Job]:
    url = f"https://api.lever.co/v0/postings/{c.slug}?mode=json"
    try:
        r = await client.get(url, headers={"User-Agent": _USER_AGENT})
        r.raise_for_status()
        payload = r.json()
    except Exception as exc:
        logger.warning("[jobs/lever] fetch failed for %s: %s", c.slug, exc)
        return []
    jobs: list[Job] = []
    logo = _favicon(c.domain)
    for j in payload or []:
        cats = j.get("categories") or {}
        desc = (j.get("descriptionPlain") or _strip_html(j.get("description") or "")).strip()
        jobs.append(Job(
            company=c.name,
            role=(j.get("text") or "").strip(),
            location=cats.get("location") or "",
            description=desc,
            url=j.get("hostedUrl") or "",
            source="lever",
            posted_at=str(j.get("createdAt") or ""),
            logo_url=logo,
            stipend=_extract_stipend(desc),
            duration=_extract_duration(desc),
        ))
    return jobs


async def _fetch_company_boards() -> list[Job]:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        tasks = []
        for c in COMPANIES:
            if c.ats == "greenhouse":
                tasks.append(_fetch_greenhouse(client, c))
            elif c.ats == "lever":
                tasks.append(_fetch_lever(client, c))
        results = await asyncio.gather(*tasks, return_exceptions=True)
    out: list[Job] = []
    for result in results:
        if isinstance(result, list):
            out.extend(result)
    return out


async def _fetch_jsearch_jobs(role: str, location: str, internship_only: bool) -> list[Job]:
    # num_pages=2 → ~20 results per search, costs 2 RapidAPI credits.
    # On the free tier (100/mo) that's 50 searches; on Pro (10k) it's 5000.
    raw = await fetch_jsearch(role, location, internship_only=internship_only, num_pages=2)
    return [Job(**r) for r in raw]


async def fetch_all_jobs(role: str = "", location: str = "", internship_only: bool = False) -> list[Job]:
    """Fetch every configured source concurrently. JSearch is queried with the
    user's filters server-side; company boards return everything and we filter
    client-side."""
    boards_task = _fetch_company_boards()
    jsearch_task = _fetch_jsearch_jobs(role, location, internship_only)
    boards, jsearch = await asyncio.gather(boards_task, jsearch_task)

    # JSearch first — pre-filtered by the aggregator with the user's exact
    # query, so those are the most relevant results.
    all_jobs = jsearch + boards
    logger.info(
        "[jobs] fetched %d total: %d jsearch + %d boards (%d companies)",
        len(all_jobs), len(jsearch), len(boards), len(COMPANIES),
    )
    return all_jobs


# ── Filtering (no scoring) ───────────────────────────────────────────────────

_BOARD_SOURCES = {"greenhouse", "lever"}
_MIN_RESULTS_BEFORE_RELAX = 10


def _passes(
    job: Job,
    *,
    role_tokens: set[str],
    location_tokens: set[str],
    internship_only: bool,
) -> bool:
    """Single-job hard filter. JSearch results pass through unconditionally
    since they were already filtered server-side by the aggregator."""
    if job.source not in _BOARD_SOURCES:
        return True

    title_tokens = _tokenize(job.role)
    location_field_tokens = _tokenize(job.location)
    location_pool = location_field_tokens | _tokenize(job.description[:1500])
    all_tokens = title_tokens | location_field_tokens | _tokenize(job.description)

    if internship_only and not (title_tokens & _INTERN_TOKENS):
        return False
    if role_tokens and not (role_tokens & all_tokens):
        return False
    if location_tokens and not (location_tokens & location_pool):
        return False
    return True


def filter_jobs(
    jobs: list[Job],
    *,
    role: str = "",
    location: str = "",
    internship_only: bool = False,
    top_n: int = 100,
) -> list[Job]:
    """Return matching jobs with progressive relaxation.

    Goal: always surface ~10+ results when any exist in the data, even if the
    exact filter (role + location + internship) is too narrow.

    Pass 1 (strict)  : role ANY-of + location ANY-of + internship
    Pass 2 (drop loc): role ANY-of + internship
    Pass 3 (drop role): internship only

    Each loosening only adds jobs that weren't already in the previous pass,
    so stricter matches always sit at the top of the list. internship_only is
    never relaxed — if the user wanted only interns, we respect that.
    """
    role_tokens = _tokenize(role)
    location_tokens = _tokenize(location)

    def collect(roles: set[str], locs: set[str]) -> list[Job]:
        return [j for j in jobs if _passes(
            j, role_tokens=roles, location_tokens=locs, internship_only=internship_only,
        )]

    # Pass 1 — strict
    out = collect(role_tokens, location_tokens)

    # Pass 2 — drop location if we don't have enough hits
    if len(out) < _MIN_RESULTS_BEFORE_RELAX and location_tokens:
        seen = {(j.url or j.role) for j in out}
        pass2 = collect(role_tokens, set())
        out.extend(j for j in pass2 if (j.url or j.role) not in seen)

    # Pass 3 — drop role too
    if len(out) < _MIN_RESULTS_BEFORE_RELAX and role_tokens:
        seen = {(j.url or j.role) for j in out}
        pass3 = collect(set(), set())
        out.extend(j for j in pass3 if (j.url or j.role) not in seen)

    return out[:top_n]

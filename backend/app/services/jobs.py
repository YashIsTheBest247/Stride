"""Fetch + filter job postings from free public board APIs.

Sources:
  - Greenhouse public boards (see app/data/companies.py)
  - Lever public boards      (see app/data/companies.py)

For LinkedIn / Indeed / Glassdoor / Wellfound / Naukri / Internshala the
frontend renders deep-link buttons that open each platform's pre-filled
search page in a new tab (no API, no scraping, no paid keys required).
"""
from __future__ import annotations

import asyncio
import logging
import re
import time
from dataclasses import dataclass
from html import unescape

import httpx

from ..data.companies import COMPANIES, Company

logger = logging.getLogger("uvicorn.error")

_TIMEOUT = httpx.Timeout(8.0, connect=4.0)
_USER_AGENT = "stride-jobs/0.1 (+https://github.com/YashIsTheBest247/Stride)"

# In-memory cache for the company boards fetch. ~3-5 MB of JSON from 10 boards
# across the US is the bottleneck on every search; caching for 10 minutes
# means only the first search per window is slow.
_BOARDS_CACHE: dict[str, list[Job] | float] = {"jobs": [], "fetched_at": 0.0}
_BOARDS_TTL_SEC = 600  # 10 minutes
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")
_WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9+#.\-]+")

_INTERN_TOKENS = {"intern", "interns", "internship", "internships"}

# CSE / tech keyword bag — drives:
#   1. detecting when the user's query intent is tech (so we know to filter
#      out Marketing/Sales/Real Estate noise from Internshala)
#   2. softer role matching for Internshala — titles like "Software
#      Development" should match a "python" query because they're tech-adjacent
_TECH_KEYWORDS = {
    # broad
    "software", "developer", "development", "engineer", "engineering",
    "programmer", "programming", "coding", "tech", "technology", "it",
    # web + mobile
    "web", "frontend", "backend", "fullstack", "full-stack", "mobile",
    "android", "ios", "flutter", "swift", "kotlin",
    # languages
    "python", "java", "javascript", "typescript", "c", "c++", "go", "rust",
    "ruby", "php", "scala", "kotlin",
    # frameworks
    "react", "vue", "angular", "node", "django", "flask", "fastapi",
    "spring", "rails", "express", "nextjs", "next.js",
    # data / ai (note: avoid "learning"/"analyst" alone — match too many
    # non-tech roles like "L&D Intern", "Financial Analyst")
    "data", "ml", "ai", "machine", "analytics", "scientist", "nlp",
    # infra
    "devops", "cloud", "aws", "azure", "gcp", "docker", "kubernetes",
    "infrastructure", "sre",
    # other tech
    "qa", "testing", "automation", "cybersecurity", "security",
    "blockchain", "game", "embedded", "iot", "robotics", "database",
    "sql", "nosql",
}


def _is_tech_role(title: str) -> bool:
    return bool(_tokenize(title) & _TECH_KEYWORDS)


def _user_wants_tech(role_tokens: set[str]) -> bool:
    return bool(role_tokens & _TECH_KEYWORDS)


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
    """Fetch all configured boards concurrently. Cached for 10 min so only
    the first call per window pays the network cost."""
    now = time.time()
    cached_jobs = _BOARDS_CACHE["jobs"]
    cached_at = _BOARDS_CACHE["fetched_at"]
    if isinstance(cached_jobs, list) and isinstance(cached_at, float) \
       and cached_jobs and (now - cached_at) < _BOARDS_TTL_SEC:
        logger.info("[jobs] boards cache hit (age %.0fs, %d jobs)", now - cached_at, len(cached_jobs))
        return cached_jobs

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

    _BOARDS_CACHE["jobs"] = out
    _BOARDS_CACHE["fetched_at"] = time.time()
    logger.info("[jobs] boards cache refreshed (%d jobs)", len(out))
    return out


async def fetch_all_jobs(role: str = "", location: str = "", internship_only: bool = False) -> list[Job]:
    """Fetch every free source concurrently:
       - Company boards (Greenhouse + Lever) — fetched in full, filtered client-side
       - Internshala — queried with role/location

    Naukri/LinkedIn/Indeed/Glassdoor render listings via client-side JS so
    `httpx + bs4` returns an empty SPA shell. Those use the deep-link buttons
    on the frontend instead.
    """
    _ = internship_only  # used by Internshala internally via role/location only
    from .jobs_internshala import fetch_internshala  # lazy: avoids import cycle

    boards, internshala = await asyncio.gather(
        _fetch_company_boards(),
        fetch_internshala(role, location),
    )
    all_jobs = boards + internshala
    logger.info(
        "[jobs] fetched %d total: %d boards (%d companies) + %d internshala",
        len(all_jobs), len(boards), len(COMPANIES), len(internshala),
    )
    return all_jobs


# ── Filtering (no scoring) ───────────────────────────────────────────────────

_MIN_RESULTS_BEFORE_RELAX = 10

# When the user types "remote" / "wfh" / etc., these substrings in the job's
# location field count as a match too (Internshala says "Work from home",
# Greenhouse says "Remote - US", etc.).
_REMOTE_QUERY_ALIASES = {"remote", "wfh", "anywhere", "work-from-home"}
_REMOTE_LOCATION_HINTS = ("remote", "work from home", "wfh", "anywhere")


def _location_matches(
    loc_tokens: set[str],
    job_location_lower: str,
    location_pool: set[str],
) -> bool:
    """True if the job's location satisfies the user's location filter.

    - Empty query → always match
    - User typed remote/wfh → STRICT: only match if the job's location FIELD
      explicitly mentions remote/wfh/anywhere. We don't accept random
      mentions of "remote" buried in the JD (e.g. "remote-first culture")
      because those are usually not actually remote roles.
    - Otherwise → standard token overlap against the wider location pool.
    """
    if not loc_tokens:
        return True
    if loc_tokens & _REMOTE_QUERY_ALIASES:
        return any(h in job_location_lower for h in _REMOTE_LOCATION_HINTS)
    return bool(loc_tokens & location_pool)


def _passes(
    job: Job,
    *,
    role_tokens: set[str],
    location_tokens: set[str],
    internship_only: bool,
) -> bool:
    """Single-job hard filter, applied to every source.

    Internshala is treated as a special case:
      - Its URL falls back to general listings when an exact category isn't
        found, so we re-verify everything client-side
      - When the user's role signals tech intent (python, software, react…),
        we drop Internshala jobs whose title isn't tech-relevant — otherwise
        Marketing/Sales/Real Estate dominate the panel for CSE students
      - We also accept *any* tech-keyword overlap as a role match for
        Internshala (so a "python" query matches "Software Development" too),
        because Internshala titles rarely mention specific languages
    """
    title_tokens = _tokenize(job.role)
    location_field_tokens = _tokenize(job.location)
    description_tokens = _tokenize(job.description[:1500]) if job.description else set()
    location_pool = location_field_tokens | description_tokens
    all_tokens = title_tokens | location_field_tokens | description_tokens

    if internship_only and not (title_tokens & _INTERN_TOKENS):
        return False

    # Role match — for Internshala specifically, a generic tech title
    # ("Software Development") counts as matching a specific tech query
    # ("python") because Internshala titles rarely mention the stack.
    # (Non-tech Internshala jobs are already stripped in filter_jobs.)
    if role_tokens:
        role_match = bool(role_tokens & all_tokens)
        if not role_match and job.source == "internshala" and _user_wants_tech(role_tokens):
            role_match = _is_tech_role(job.role)
        if not role_match:
            return False

    if not _location_matches(location_tokens, (job.location or "").lower(), location_pool):
        return False
    return True


def _matches_source(job: Job, source_lower: str) -> bool:
    """Substring match against job.source. Empty source = pass."""
    if not source_lower:
        return True
    return source_lower in (job.source or "").lower()


def filter_jobs(
    jobs: list[Job],
    *,
    role: str = "",
    location: str = "",
    internship_only: bool = False,
    source: str = "",
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
    source_lower = source.strip().lower()
    # Detect tech intent ONCE from the original role string. The relaxation
    # passes (drop location, drop role) lose role_tokens, so we'd otherwise
    # let non-tech Internshala jobs back in via pass 3.
    user_wants_tech = _user_wants_tech(role_tokens)

    # Apply source filter UP FRONT — if the user picked "linkedin" they don't
    # want any other publisher's results, even with relaxation.
    pool = [j for j in jobs if _matches_source(j, source_lower)] if source_lower else jobs

    # CSE pre-filter: when the user signals tech intent, strip Internshala
    # Marketing / Sales / Finance / Real Estate from the pool BEFORE any
    # pass runs — they shouldn't sneak in via the drop-role fallback.
    if user_wants_tech:
        pool = [
            j for j in pool
            if not (j.source == "internshala" and not _is_tech_role(j.role))
        ]

    def collect(roles: set[str], locs: set[str]) -> list[Job]:
        return [j for j in pool if _passes(
            j, role_tokens=roles, location_tokens=locs, internship_only=internship_only,
        )]

    # Priority-sort WITHIN each pass and concatenate. This way strict matches
    # (e.g. the actual remote internships) always sit above relaxed matches
    # (no-location, no-role fallbacks). Inside each tier, stipend-bearing jobs
    # with sensible duration float to the top.
    def sorted_pass(jobs_in_pass: list[Job]) -> list[Job]:
        return sorted(jobs_in_pass, key=_priority_key, reverse=True)

    # Pass 1 — strict
    out = sorted_pass(collect(role_tokens, location_tokens))

    # Pass 2 — drop location if we don't have enough hits
    if len(out) < _MIN_RESULTS_BEFORE_RELAX and location_tokens:
        seen = {(j.url or j.role) for j in out}
        pass2_new = [j for j in collect(role_tokens, set()) if (j.url or j.role) not in seen]
        out.extend(sorted_pass(pass2_new))

    # Pass 3 — drop role too
    if len(out) < _MIN_RESULTS_BEFORE_RELAX and role_tokens:
        seen = {(j.url or j.role) for j in out}
        pass3_new = [j for j in collect(set(), set()) if (j.url or j.role) not in seen]
        out.extend(sorted_pass(pass3_new))

    return out[:top_n]


_MONTH_RE = re.compile(r"(\d+)\s*month", re.IGNORECASE)


def _priority_key(j: Job) -> int:
    """Higher score = ranked higher.

    +3 if a stipend is listed (most valuable signal for the user)
    +2 if duration is in the typical 1-6 month internship range
    +1 if a duration is listed at all (any length)
    """
    score = 0
    if j.stipend.strip():
        score += 3
    duration_lower = (j.duration or "").lower()
    if duration_lower:
        score += 1
        m = _MONTH_RE.search(duration_lower)
        if m and 1 <= int(m.group(1)) <= 6:
            score += 2
    return score

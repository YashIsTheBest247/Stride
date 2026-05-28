"""Internshala scraper — free, India-focused internships.

Internshala publishes its listings on plain HTML search pages with lightweight
anti-bot. Path shape:
    https://internshala.com/internships/{role-slug}-internship/
    https://internshala.com/internships/{role-slug}-internship-in-{city-slug}/

If role/location are empty we fall back to the general internship index.

DOM selectors are best-effort — Internshala changes them every few months.
If parsing breaks, check the page in a browser and adjust.
"""
from __future__ import annotations

import logging
import re

import httpx
from bs4 import BeautifulSoup

from .jobs import Job, _favicon

logger = logging.getLogger("uvicorn.error")

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
)
_TIMEOUT = httpx.Timeout(15.0, connect=5.0)
_BASE = "https://internshala.com"


def _slugify(s: str) -> str:
    s = re.sub(r"[^\w\s-]", "", s.lower())
    s = re.sub(r"\s+", "-", s).strip("-")
    return s


_REMOTE_TOKENS = ("remote", "wfh", "work from home", "work-from-home", "anywhere", "wfo remote")

# Tech keyword bag duplicated here (rather than importing from jobs.py) to
# avoid a circular import. Used to detect when the user query is CSE-flavored
# so we can hit Internshala's reliable software-development category instead
# of a role-specific URL that falls back to general WFH listings.
_TECH_QUERY_TOKENS = {
    "software", "developer", "development", "engineer", "engineering",
    "programming", "tech", "web", "frontend", "backend", "fullstack",
    "full-stack", "mobile", "android", "ios", "python", "java",
    "javascript", "typescript", "react", "node", "django", "flask",
    "fastapi", "spring", "data", "ml", "ai", "machine", "scientist",
    "devops", "cloud", "aws", "qa", "testing", "cybersecurity",
}


def _is_remote(location: str) -> bool:
    loc = location.lower().strip()
    return any(t in loc for t in _REMOTE_TOKENS)


def _is_tech_query(role: str) -> bool:
    tokens = {w.lower() for w in re.findall(r"[A-Za-z][A-Za-z0-9+#.\-]+", role or "")}
    return bool(tokens & _TECH_QUERY_TOKENS)


def _build_url(role: str, location: str) -> str:
    role_slug = _slugify(role) or "internship"
    is_tech = _is_tech_query(role)

    # Remote: Internshala has a dedicated work-from-home filter path.
    if _is_remote(location):
        # Tech queries: hit the reliable software-development WFH category.
        # Role-specific WFH pages often fall back to general listings
        # dominated by Marketing/Sales/Real Estate — useless for CSE students.
        if is_tech:
            return f"{_BASE}/internships/work-from-home-software-development-internship/"
        if role_slug != "internship":
            return f"{_BASE}/internships/work-from-home-{role_slug}-internship/"
        return f"{_BASE}/internships/work-from-home-internship/"

    loc_slug = _slugify(location)
    # For city searches, also prefer the software-development category for
    # tech queries (e.g. "python" + "bangalore" → reliable tech listings).
    if loc_slug and is_tech:
        return f"{_BASE}/internships/software-development-internship-in-{loc_slug}/"
    if loc_slug and role_slug != "internship":
        return f"{_BASE}/internships/{role_slug}-internship-in-{loc_slug}/"
    if loc_slug:
        return f"{_BASE}/internships/internship-in-{loc_slug}/"
    if is_tech:
        return f"{_BASE}/internships/software-development-internship/"
    if role_slug != "internship":
        return f"{_BASE}/internships/{role_slug}-internship/"
    return f"{_BASE}/internships/"


def _text(node) -> str:
    if not node:
        return ""
    return re.sub(r"\s+", " ", node.get_text(" ", strip=True)).strip()


def _parse_card(card) -> Job | None:
    # Title + link
    title_a = card.select_one("a.job-title-href") or card.select_one("h3.job-internship-name a") or card.select_one("h3 a")
    role = _text(title_a)
    href = title_a.get("href") if title_a else ""
    if not role or not href:
        return None
    url = href if href.startswith("http") else f"{_BASE}{href}"

    # Company
    company = _text(card.select_one(".company-name") or card.select_one("p.company-name") or card.select_one(".company"))

    # Location
    location = _text(card.select_one(".row-1-item a") or card.select_one(".locations") or card.select_one(".location-names"))

    # Stipend
    stipend = _text(card.select_one(".stipend") or card.select_one(".desktop-text"))

    # Duration — Internshala uses "X Months" tile. Skip anything that looks
    # like the stipend (rupee/dollar/etc. + "/month") so we don't double-up.
    duration = ""
    for el in card.select(".row-1-item, .other_detail_item, .desktop-text"):
        txt = _text(el)
        if any(c in txt for c in "₹$€£¥") or "stipend" in txt.lower():
            continue
        m = re.search(r"\b(\d+\s*(?:[-–]\s*\d+)?\s*(?:month|week|year)s?)\b", txt, re.IGNORECASE)
        if m:
            duration = m.group(1).strip()
            break

    return Job(
        company=company or "Unknown",
        role=role,
        location=location,
        description="",  # detail page fetch only on demand
        url=url,
        source="internshala",
        posted_at="",
        logo_url=_favicon("internshala.com"),
        stipend=stipend,
        duration=duration,
    )


async def fetch_internshala(role: str, location: str) -> list[Job]:
    url = _build_url(role, location)
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": _UA})
            r.raise_for_status()
    except Exception as exc:
        logger.warning("[jobs/internshala] fetch failed for %s: %s", url, exc)
        return []

    soup = BeautifulSoup(r.text, "html.parser")
    # Newer card selector + older fallback
    cards = soup.select(".individual_internship") or soup.select(".internship_meta")
    jobs: list[Job] = []
    for card in cards[:60]:
        parsed = _parse_card(card)
        if parsed:
            jobs.append(parsed)

    logger.info("[jobs/internshala] %d jobs from %s", len(jobs), url)
    return jobs

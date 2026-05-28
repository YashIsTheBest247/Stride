import logging

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..services.jobs import Job, fetch_all_jobs, filter_jobs

logger = logging.getLogger("uvicorn.error")

router = APIRouter(tags=["search"])


class SearchRequest(BaseModel):
    role: str = Field("", max_length=200)
    location: str = Field("", max_length=100)
    internship_only: bool = False
    # Restrict to a single source. Empty = all sources.
    # Common values: "linkedin", "indeed", "glassdoor", "ziprecruiter",
    # "wellfound", "greenhouse", "lever".
    source: str = Field("", max_length=40)
    top_n: int = Field(50, ge=1, le=200)


class JobOut(BaseModel):
    company: str
    role: str
    location: str
    description: str
    url: str
    source: str
    posted_at: str = ""
    logo_url: str = ""
    stipend: str = ""
    duration: str = ""


def _to_out(j: Job) -> JobOut:
    desc = j.description
    if len(desc) > 1200:
        desc = desc[:1200].rsplit(" ", 1)[0] + "…"
    return JobOut(
        company=j.company,
        role=j.role,
        location=j.location,
        description=desc,
        url=j.url,
        source=j.source,
        posted_at=j.posted_at,
        logo_url=j.logo_url,
        stipend=j.stipend,
        duration=j.duration,
    )


@router.post("/search-jobs", response_model=list[JobOut])
async def search_jobs(payload: SearchRequest):
    logger.info(
        "[STRIDE /search-jobs] role=%r loc=%r src=%r intern=%s top=%d",
        payload.role, payload.location, payload.source, payload.internship_only, payload.top_n,
    )
    jobs = await fetch_all_jobs(
        role=payload.role,
        location=payload.location,
        internship_only=payload.internship_only,
    )
    filtered = filter_jobs(
        jobs,
        role=payload.role,
        location=payload.location,
        internship_only=payload.internship_only,
        source=payload.source,
        top_n=payload.top_n,
    )
    logger.info("[STRIDE /search-jobs] %d fetched → %d after filter", len(jobs), len(filtered))
    return [_to_out(j) for j in filtered]

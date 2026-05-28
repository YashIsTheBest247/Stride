"""Curated list of companies whose hiring boards we scrape.

Greenhouse and Lever boards — both expose public, fair-use JSON APIs:
  - Greenhouse: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
  - Lever:      https://api.lever.co/v0/postings/{slug}?mode=json

`domain` is the company's primary website (used for the favicon-based logo
shown on each job card via Google's free favicon service).
"""
from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class Company:
    slug: str                       # the board identifier in the ATS URL
    name: str                       # human-readable name
    ats: Literal["greenhouse", "lever"]
    domain: str                     # primary website, for logo lookup


COMPANIES: list[Company] = [
    # ── Greenhouse ─────────────────────────────────────────────────────────
    Company("airbnb",      "Airbnb",     "greenhouse", "airbnb.com"),
    Company("stripe",      "Stripe",     "greenhouse", "stripe.com"),
    Company("robinhood",   "Robinhood",  "greenhouse", "robinhood.com"),
    Company("scaleai",     "Scale AI",   "greenhouse", "scale.com"),
    Company("anthropic",   "Anthropic",  "greenhouse", "anthropic.com"),
    Company("figma",       "Figma",      "greenhouse", "figma.com"),
    Company("databricks",  "Databricks", "greenhouse", "databricks.com"),
    Company("mongodb",     "MongoDB",    "greenhouse", "mongodb.com"),

    # ── Lever ──────────────────────────────────────────────────────────────
    Company("netflix",     "Netflix",    "lever",      "netflix.com"),
    Company("palantir",    "Palantir",   "lever",      "palantir.com"),
]

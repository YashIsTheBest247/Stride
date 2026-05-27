# STRIDE

> LaTeX. Tailored. ATS. Shipped.

Paste a LaTeX resume + a job description → STRIDE rewrites the bullets and
skills to weave in JD keywords → compiles a PDF named `{FullName}_{Role}.pdf`.
Your formatting stays untouched.

**Stack** — React + Vite + Tailwind (no animation libraries) · FastAPI · Tectonic
(LaTeX → PDF) · Google Gemini (free tier).

---

## Project layout

```
Catalyst2.0/
├── backend/    FastAPI service: POST /api/tailor → PDF
└── frontend/   React + Vite app (cream + black premium theme)
```

---

## Prerequisites

1. **Python 3.11+** (tested on 3.14)
2. **Node 18+**
3. **Tectonic** — see Windows install steps below
4. **A free Gemini API key** — <https://aistudio.google.com/apikey>

### Installing Tectonic on Windows

`winget` doesn't have it. Use the prebuilt release:

```powershell
$dest = "$env:USERPROFILE\tectonic"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Invoke-WebRequest `
  -Uri "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.16.9/tectonic-0.16.9-x86_64-pc-windows-msvc.zip" `
  -OutFile "$dest\tectonic.zip"
Expand-Archive -Path "$dest\tectonic.zip" -DestinationPath $dest -Force
Remove-Item "$dest\tectonic.zip"
& "$dest\tectonic.exe" --version
```

Then create a `fonts.conf` next to the binary (Tectonic's Windows build needs
fontconfig pointed at a config file or it crashes with `Cannot load default
config file`):

```powershell
@'
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <dir>C:/Windows/Fonts</dir>
  <cachedir>~/.cache/fontconfig</cachedir>
  <config><rescan><int>30</int></rescan></config>
</fontconfig>
'@ | Set-Content -Encoding UTF8 "$env:USERPROFILE\tectonic\fonts.conf"
```

The backend auto-detects the `fonts.conf` next to the Tectonic binary and
sets `FONTCONFIG_FILE` + `HOME` in the compile subprocess.

### Linux / Mac

Tectonic is available via package managers (`apt`, `brew`, `cargo`). Fontconfig
is already configured on those systems, so the auto-detect simply finds nothing
and Tectonic uses the system default.

---

## Backend setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit backend\.env:
#   GEMINI_API_KEY=...                                (required)
#   TECTONIC_BIN=C:\Users\<you>\tectonic\tectonic.exe (Windows; or just "tectonic" on PATH)
uvicorn app.main:app --reload --reload-include "*.env"
```

`--reload-include "*.env"` makes uvicorn pick up `.env` edits without a manual
restart.

Health check: <http://localhost:8000/api/health>

---

## Frontend setup

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. In dev, `/api` is proxied to `localhost:8000`.

---

## Usage

1. Land on the homepage, watch the 10-second hero video, the page auto-scrolls.
2. Click **Start tailoring** (or **Launch** in the navbar).
3. **Paste your LaTeX** into the left pane and the **job description** into
   the right pane.
4. Click **Generate PDF**.
5. Download the result — named `{FullName}_{Role}.pdf`
   (e.g. `Yash_Munshi_Data_Analyst.pdf`).

Expected end-to-end time: **10–60 seconds** depending on resume length and
whether Tectonic's package cache has been warmed.

---

## How it works

`POST /api/tailor` (JSON):

```json
{ "latex_source": "...", "job_description": "..." }
```

Pipeline:

1. **Pre-process** the user's `.tex` to strip constructs that crash Tectonic on
   Windows (see "Caveats" below).
2. **Gemini** rewrites bullets and skills using the JD keywords, preserving
   structure and bullet count. Returns a metadata JSON line + the new `.tex`.
3. **Post-process** the LLM output: same sanitizers + auto-shrink to 10pt so it
   fits on one page.
4. **Tectonic** compiles the final `.tex` to PDF.
5. If the first compile fails, a **repair pass** sends the broken `.tex` + the
   Tectonic error back to Gemini and retries one more time.
6. The PDF streams back with `Content-Disposition: attachment;
   filename="FullName_Role.pdf"`.

---

## Caveats — what the pre-processor auto-fixes

Tectonic is stricter than typical LaTeX engines and has a specific Windows bug
around FontAwesome. The pre-processor in
[`backend/app/services/preprocess.py`](backend/app/services/preprocess.py)
auto-fixes the most common gotchas:

| Issue | Fix |
|---|---|
| `\usepackage{fontawesome5}` + `\fa*` commands crash Tectonic 0.16.x on Windows | Stripped entirely; `~` separators in `\begin{center}` blocks become `$|$` so contact items stay visually separated |
| `\input{glyphtounicode}` + `\pdfgentounicode=1` (pdfTeX-only, Tectonic uses XeTeX) | Stripped |
| LLM writes `\end{resumeItemListStart}` instead of `\resumeItemListEnd` | Regex post-fix: any `\end{...Start}` → `\...End` |
| Resume runs to 2 pages after tailoring | `\documentclass[...,11pt,...]` rewritten to `10pt` + `\addtolength{\textheight}{0.5in}` injected before `\begin{document}` (only on the final compile, not before the LLM sees it) |

---

## Configuration reference (`backend/.env`)

```ini
GEMINI_API_KEY=...                            # required
GEMINI_MODEL=gemini-2.5-flash                 # gemini-2.5-flash works on free tier
TECTONIC_BIN=C:\Users\you\tectonic\tectonic.exe   # or "tectonic" if on PATH
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
HOST=0.0.0.0
PORT=8000
```

---

## Swapping the LLM provider

All Gemini calls funnel through [`backend/app/services/llm.py`](backend/app/services/llm.py).
To switch to OpenAI, Anthropic, or Groq: replace the `_call_gemini()` body and
the system-prompt plumbing — the response parser (metadata JSON + ```latex
code block) is provider-agnostic. Update `requirements.txt` and `.env` to match.

---

## Production notes

- Lock `CORS_ORIGINS` in `.env` to your real frontend domain.
- Bundle the Tectonic binary into your container image and run as non-root.
- Frontend builds to static files with `npm run build` → Vercel / Netlify /
  Cloudflare Pages.
- The free Gemini tier rate-limits aggressively (~15 RPM for `gemini-2.5-flash`);
  the LLM client retries on 503/429/500 up to 3× with exponential backoff.

---

## Adding Google OAuth later (optional)

OAuth was deliberately left out for v1. When you're ready:

- Add `@supabase/supabase-js` to the frontend and reintroduce a `/login` route.
- Add a `require_user` dependency to [`backend/app/routers/tailor.py`](backend/app/routers/tailor.py)
  that verifies a Supabase JWT (HS256, `SUPABASE_JWT_SECRET`).
- Add `SUPABASE_URL` + `SUPABASE_JWT_SECRET` to the backend `.env`, and
  `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` to the frontend.

---

## Roadmap / Improvements

### End-to-end application automation (search → tailor → apply)

Today STRIDE stops at "tailored PDF". The next iteration extends the pipeline
into a full job-hunt agent that handles every step from discovery to submission:

1. **Search** — pull live job listings from LinkedIn / Indeed / Wellfound /
   Greenhouse / Lever / Ashby boards, filtered by user-supplied criteria
   (role, location, remote, salary band, seniority).
2. **Score & shortlist** — rank each listing against the user's base resume
   using JD-keyword overlap + embedding similarity. Surface the top N.
3. **Auto-tailor** — for each shortlisted role, run the current tailor pipeline
   (LLM rewrite → Tectonic compile) to produce a per-role PDF named
   `{FullName}_{Company}_{Role}.pdf`.
4. **Cover letter generation** — generate a matching cover letter (LaTeX or
   plain) from the same prompt scaffold, branded to the company.
5. **Auto-apply** — fill the application form on the company's ATS
   (Greenhouse, Lever, Workday, Ashby APIs where available; headless browser
   for the rest), upload the tailored PDF + cover letter, and submit.
6. **Tracker** — persist every application in Supabase (job URL, applied date,
   resume version, status) and surface a dashboard with response rates per
   role/keyword combination so the user can iterate on their base resume.

Architecture hooks already in place that make this incremental rather than a
rewrite:

- The `/api/tailor` endpoint is stateless and idempotent — perfect for batching
  from a scheduler.
- The LLM service ([`services/llm.py`](backend/app/services/llm.py)) is
  provider-agnostic; the same prompt scaffold extends to cover-letter
  generation by swapping the system prompt.
- The Supabase wiring sketched in the OAuth section above doubles as the
  storage layer for the application tracker.

Out of scope for v1 because: (a) each job board has its own ToS around scraping
and bot use, (b) Workday-style ATS auto-fill needs robust headless-browser
handling, (c) requires a persistent backend (not a request/response service)
and per-user job-board credentials in a secrets vault.

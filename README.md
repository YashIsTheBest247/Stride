# STRIDE

> LaTeX. Tailored. ATS. Shipped.

- **Scrapes** live job postings from Greenhouse, Lever, and Internshala — plus deep-link buttons to LinkedIn, Indeed, Glassdoor, Wellfound, and Naukri.
- **Tailors** your LaTeX resume to any JD: Gemini rewrites bullets and skills to weave in keywords while preserving your formatting.
- **Emits a PDF** compiled server-side by Tectonic, auto-shrunk to one page, named `{FullName}_{Role}.pdf`.

**Stack** — React + Vite + Tailwind · FastAPI · Tectonic (LaTeX → PDF) ·
Google Gemini (free tier) · BeautifulSoup (Internshala scraper).

Live at <https://getstrideai.vercel.app> (frontend) ·
<https://stride-backend-zbza.onrender.com/api/health> (backend).

---

## Project layout

```
Catalyst2.0/
├── backend/     FastAPI service: tailor pipeline + job search
└── frontend/    React + Vite app (cream + black premium theme)
```

---

## What's in the app

| Route | Purpose |
|---|---|
| `/` | Landing — hero video, intro, pipeline, how-to-use |
| `/app` | Tailor flow: paste `.tex` + JD → PDF download |
| `/search` | Search live boards + deep-link buttons to LinkedIn/Indeed/Glassdoor/Wellfound/Naukri |

Default-resume slot — paste your `.tex` once on either page and click **★ SAVE**.
It's stored in your browser (`localStorage["stride:default-latex"]`); the **DEFAULT**
button on both pages reloads it instantly.

---

## Prerequisites (local dev)

1. **Python 3.11+** (tested on 3.14)
2. **Node 18+**
3. **Tectonic** — see Windows install below; Linux/Mac use your package manager
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

The landing page's "How to use" section spells out the flow. Short version:

1. **Save your default resume** — on `/app`, paste your `.tex` once and click ★ SAVE. Stored in browser localStorage; future visits reload it with one click.
2. **Find roles** — `/search` filters live Greenhouse / Lever / Internshala boards by role, location, and internship status. For LinkedIn / Indeed / Glassdoor / Wellfound / Naukri, use the "More job sites" deep-link buttons (they open each platform's pre-filled search in a new tab — no scraping needed).
3. **Tailor a match** — click **Tailor** on any search result → jumps to `/app` with the JD pre-filled and your default resume already loaded.
4. **Generate the PDF** — click Generate. Gemini rewrites bullets and skills with JD keywords, Tectonic compiles, auto-shrunk to one page. ~15–30 seconds end-to-end. Downloads as `{FullName}_{Role}.pdf`.
5. **Apply on the company site** — STRIDE never submits the application form. Click **Open Posting** on any search result to land on the company's actual page, upload the tailored PDF, hit submit yourself.

---

## API endpoints

### `POST /api/tailor`

```json
{ "latex_source": "...", "job_description": "..." }
```

Pipeline:

1. **Pre-process** the user's `.tex` to strip constructs that crash Tectonic on Windows (see caveats below).
2. **Gemini** rewrites bullets and skills using the JD keywords, preserving structure and bullet count. Returns a metadata JSON line + the new `.tex`.
3. **Post-process** the LLM output: same sanitizers + strip LLM-added `\textbf{}` from bullet bodies + auto-shrink to 10pt so it fits on one page.
4. **Tectonic** compiles the final `.tex` to PDF.
5. If the first compile fails, a **repair pass** sends the broken `.tex` + the Tectonic error back to Gemini and retries once.
6. The PDF streams back with `Content-Disposition: attachment; filename="FullName_Role.pdf"`.

### `POST /api/search-jobs`

```json
{
  "role": "python developer",
  "location": "remote",
  "internship_only": true,
  "source": "",
  "top_n": 50
}
```

Fetches every free source concurrently (Greenhouse + Lever boards + Internshala scraper). Filters with **progressive relaxation** — strict role+location pass first, then drop-location pass, then drop-role pass — so the panel always returns ≥10 results when any exist. Tech queries get the **CSE filter**: non-tech Internshala jobs (Marketing/Sales/Real Estate) are stripped, and the Internshala URL routes to the reliable Software Development category instead of role-specific URLs that fall back to general WFH listings.

Boards results are cached in-memory for 10 minutes per server instance — first search per window pays the ~15–30s network cost, the rest run in ~3s.

### `GET /api/health`

```json
{ "status": "ok", "model": "gemini-2.5-flash" }
```

---

## Caveats — what the pre-processor auto-fixes

Tectonic is stricter than most LaTeX engines and has a known Windows bug around FontAwesome. The pre-processor in [`backend/app/services/preprocess.py`](backend/app/services/preprocess.py) auto-fixes the most common gotchas:

| Issue | Fix |
|---|---|
| `\usepackage{fontawesome5}` + `\fa*` commands crash Tectonic 0.16.x on Windows with heap corruption | Stripped entirely; `~` separators in `\begin{center}` blocks become `$|$` so contact items stay visually separated |
| `\input{glyphtounicode}` + `\pdfgentounicode=1` (pdfTeX-only, Tectonic uses XeTeX) | Stripped |
| LLM writes `\end{resumeItemListStart}` instead of `\resumeItemListEnd` | Regex post-fix: any `\end{...Start}` → `\...End` |
| LLM adds `\textbf{}` around bullet keywords despite the no-emphasis rule | Stripped from inside `\resumeItem{...}` bodies and skill value lists; structural bolds (job titles, category labels) preserved |
| Resume runs to 2 pages after tailoring | `\documentclass[...,11pt,...]` rewritten to `10pt` + `\addtolength{\textheight}{0.5in}` injected before `\begin{document}` (only on the final compile, not before the LLM sees it) |
| Filename gets "Internship", "Part Time", "Full Time" suffixes | Trailing employment-type tokens stripped from the role segment of the filename |

---

## Configuration reference (`backend/.env`)

```ini
GEMINI_API_KEY=...                                   # required
GEMINI_MODEL=gemini-2.5-flash                        # primary
GEMINI_MODEL_FALLBACK=gemini-2.5-flash-lite          # auto-fallback on 503/UNAVAILABLE; empty to disable
TECTONIC_BIN=C:\Users\you\tectonic\tectonic.exe      # or "tectonic" if on PATH (Linux/Mac default)
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://getstrideai.vercel.app
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

## Deploying

Step-by-step deploy guide → **[DEPLOY.md](DEPLOY.md)** (Vercel for the
frontend, Render for the backend Docker image, with `git push` auto-deploys).

Quick summary:

- `backend/Dockerfile` builds a production image with Python + Tectonic
  (Linux static binary, no fontconfig setup needed unlike Windows).
- `render.yaml` provisions the backend on Render in one click.
- `frontend/vercel.json` configures Vercel as a Vite SPA.
- The two are linked via `VITE_API_BASE` (frontend → backend URL) and
  `CORS_ORIGINS` (backend allows frontend domain).

---

## Production notes

- Lock `CORS_ORIGINS` in the backend's environment to your real frontend domain.
- Bundle the Tectonic binary into your container image and run as non-root (the included Dockerfile does this).
- Frontend builds to static files with `npm run build` — deploys cleanly to Vercel / Netlify / Cloudflare Pages.
- The free Gemini tier rate-limits aggressively (~15 RPM for `gemini-2.5-flash`); the LLM client retries on 503 / 429 / 500 up to 3× with exponential backoff.
- Render free tier sleeps after 15 min of inactivity → first request after sleep takes ~30–50s. Upgrade to Starter ($7/mo) if you want always-on.

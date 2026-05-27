# Deploying STRIDE

Frontend → **Vercel** · Backend → **Render** · auto-deploys on `git push`.

End-to-end time the first time: ~15–20 min. Subsequent pushes redeploy automatically in ~3 min.

---

## 1. Push the deploy artifacts

A handful of new files need to be in your GitHub repo:

| File | Purpose |
|---|---|
| `backend/Dockerfile` | Builds the production image (Python + Tectonic + Linux fontconfig). |
| `backend/.dockerignore` | Keeps `.env`, `.venv`, and dev artifacts out of the image. |
| `render.yaml` | Render Blueprint — provisions the service in one click. |
| `frontend/vercel.json` | Tells Vercel this is a Vite SPA + handles client-side routing. |
| `frontend/.env.example` | Documents `VITE_API_BASE` for production. |

Commit and push:

```powershell
git add backend/Dockerfile backend/.dockerignore render.yaml frontend/vercel.json frontend/.env.example DEPLOY.md
git commit -m "deploy: add Render Docker + Vercel configs"
git push
```

---

## 2. Deploy the backend (Render)

### Option A — Blueprint (recommended, one click)

1. Open [`render.yaml`](render.yaml) and replace `REPLACE_WITH_YOUR_GITHUB_USERNAME` with your GitHub user/org. Commit + push.
2. Go to <https://dashboard.render.com/blueprints> → **New Blueprint Instance** → connect this repo. Render reads `render.yaml` and provisions the service.
3. After creation, open the **stride-backend** service → **Environment** tab:
   - Set `GEMINI_API_KEY` to your real key (it's marked `sync: false` so it's not in the file).
   - Verify `GEMINI_MODEL = gemini-2.5-flash`.
   - Leave `CORS_ORIGINS` as-is for now — we'll update it after Vercel deploys.

### Option B — Manual setup

If you don't want the blueprint:

1. Dashboard → **New** → **Web Service** → connect your repo.
2. Settings:
   - **Root Directory**: `backend`
   - **Environment**: `Docker`
   - **Dockerfile path**: `./Dockerfile`
   - **Region**: any (Oregon is closest to most US users)
   - **Plan**: `Free` (cold-starts after 15 min idle; upgrade to `Starter $7/mo` if you want always-on)
   - **Health check path**: `/api/health`
3. Environment variables (under "Environment"):
   - `GEMINI_API_KEY` = your key
   - `GEMINI_MODEL` = `gemini-2.5-flash`
   - `CORS_ORIGINS` = `https://YOUR-VERCEL-PROJECT.vercel.app` (update after step 3)
   - `TECTONIC_BIN` = `tectonic`

### Verify

Once the build finishes (~5 min the first time — Docker layer cache makes subsequent builds ~1 min):

```powershell
curl https://stride-backend.onrender.com/api/health
# {"status":"ok","model":"gemini-2.5-flash"}
```

If you see `404 Not Found`, the service is still building or the health check failed — open the **Logs** tab on Render.

### Render free-tier note

The free plan sleeps after 15 min of inactivity. The next request wakes it up and takes ~30 seconds (cold start) — your first `/api/tailor` after idle will look slow but isn't broken. Upgrade to Starter to eliminate this.

---

## 3. Deploy the frontend (Vercel)

1. Go to <https://vercel.com/new> → import this repo.
2. Settings:
   - **Framework Preset**: `Vite` (auto-detected)
   - **Root Directory**: `frontend` *(important — click "Edit" and select it)*
   - **Build Command**: leave default (`npm run build`)
   - **Output Directory**: leave default (`dist`)
3. **Environment Variables** (before clicking Deploy):
   - `VITE_API_BASE` = `https://stride-backend.onrender.com/api` (use the URL Render gave you)
4. Click **Deploy**.

Vercel gives you a URL like `https://catalyst2-0.vercel.app`. Copy it.

---

## 4. Link the two

Back on Render → **stride-backend** → **Environment**:

- Update `CORS_ORIGINS` to your real Vercel URL:
  ```
  CORS_ORIGINS=https://catalyst2-0.vercel.app,https://catalyst2-0-*.vercel.app
  ```
  *(The second entry covers Vercel's per-PR preview deploys.)*
- Click **Save changes** — Render restarts the service automatically.

---

## 5. Smoke test

Open your Vercel URL, click **Launch** → paste a `.tex` resume + JD → **Generate PDF**.

Expected:
- ~10–60s end-to-end (Gemini call + Tectonic compile).
- PDF downloads as `{FullName}_{Role}.pdf`.

If the browser shows a CORS error in DevTools:
- Double-check the Render `CORS_ORIGINS` exactly matches your Vercel URL (no trailing slash, correct protocol).

If the request hangs forever:
- Render free tier cold-start. Wait ~30s and retry.

If you see `503 LLM` errors in the backend logs:
- Gemini rate-limited. The backend retries 3× automatically; if it still fails, your key may be exhausted for the day.

---

## 6. After it works — production checklist

- **Lock CORS down**: in `CORS_ORIGINS`, list only your real domain (not `*`).
- **Rotate Gemini key** if you ever pasted it in chat/issues.
- **Custom domain** (optional): Vercel → Project → **Domains** → add yours. Update `CORS_ORIGINS` on Render to include it.
- **Backend plan**: if you expect any real traffic, upgrade Render to **Starter ($7/mo)** so requests don't cold-start.
- **Frontend caching**: Vercel sets sensible cache headers automatically; nothing to do.

---

## How auto-deploy works after setup

| You do | What happens |
|---|---|
| `git push` to `main` | Vercel builds the frontend + deploys (~2 min). Render rebuilds the Docker image + deploys (~3 min). |
| Open a PR | Vercel creates a per-PR preview URL automatically. Render only redeploys on `main` by default. |
| Edit `.env` on Render | Service restarts automatically. |
| Edit a Vercel env var | You have to redeploy from the **Deployments** tab (one click). |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Render build fails on `tectonic` install | Network issue or upstream Tectonic release moved | Bump `TECTONIC_VERSION` arg in `backend/Dockerfile` to a current release |
| Vercel build fails | Wrong root directory | Project Settings → General → Root Directory = `frontend` |
| Browser hits CORS error | `CORS_ORIGINS` on Render doesn't match Vercel URL | Update `CORS_ORIGINS`, save, wait for restart |
| Slow first request | Render free-tier cold start | Upgrade to Starter, or just wait 30s |
| `LLM call failed: 429 RESOURCE_EXHAUSTED` | Gemini free-tier daily quota hit | Wait until midnight Pacific (when quota resets) or add billing |
| `Tectonic failed` on Render | Almost always a LaTeX issue (the repair pass will retry once) | Check the Render Logs tab for the `[STRIDE Tectonic]` log tail |

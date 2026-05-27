import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .routers import tailor

# Hook into uvicorn's pre-configured logger so our messages actually appear
# in the running terminal (a fresh logging.getLogger() without a handler is
# silent under uvicorn).
logger = logging.getLogger("uvicorn.error")

settings = get_settings()

app = FastAPI(title="STRIDE API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Resume-Filename", "X-Resume-Company", "X-Resume-Role"],
)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Print exactly which fields failed validation so 422s aren't opaque."""
    body = exc.body
    if isinstance(body, (bytes, bytearray)):
        try:
            body = body.decode("utf-8", errors="replace")
        except Exception:
            pass
    body_preview = (body[:300] + "…") if isinstance(body, str) and len(body) > 300 else body
    logger.error(
        "[STRIDE 422] %s %s | errors=%s | body=%r",
        request.method,
        request.url.path,
        exc.errors(),
        body_preview,
    )
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


app.include_router(tailor.router, prefix="/api")


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "model": settings.gemini_model}

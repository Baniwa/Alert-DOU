import logging
import os
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from api.limiter import limiter
from api.logging_config import configure_logging, request_id_var
from api.routes import router, summary_router

configure_logging()
logger = logging.getLogger(__name__)

_ENV = os.environ.get("ENVIRONMENT", "development")
_IS_PROD = _ENV == "production"

_CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:4173",
    ).split(",")
    if o.strip()
]

if _IS_PROD:
    _insecure = [o for o in _CORS_ORIGINS if not o.startswith("https://")]
    if _insecure:
        raise RuntimeError(f"Production CORS origins must use HTTPS: {_insecure}")

_BANNER = r"""
  ██████╗  █████╗ ███╗   ██╗██╗██╗    ██╗ █████╗
  ██╔══██╗██╔══██╗████╗  ██║██║██║    ██║██╔══██╗
  ██████╔╝███████║██╔██╗ ██║██║██║ █╗ ██║███████║
  ██╔══██╗██╔══██║██║╚██╗██║██║██║███╗██║██╔══██║
  ██████╔╝██║  ██║██║ ╚████║██║╚███╔███╔╝██║  ██║
  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝ ╚══╝╚══╝╚═╝  ╚═╝

  Alert DOU  ·  v0.1.0  ·  Monitoramento do DOU com IA
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(_BANNER)
    logger.info("startup", extra={"environment": _ENV, "cors_origins": _CORS_ORIGINS})
    yield
    logger.info("shutdown")


app = FastAPI(
    title="Alert DOU",
    description="Real-time monitoring of Brazil's Diário Oficial da União.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    MAX_BYTES = 64 * 1024

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.MAX_BYTES:
            logger.warning(
                "request_too_large",
                extra={"content_length": content_length, "ip": getattr(request.client, "host", "-")},
            )
            return Response(content="Request too large", status_code=413)
        return await call_next(request)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = uuid.uuid4().hex[:8]
        request_id_var.set(request_id)

        start = time.monotonic()
        response: Response = await call_next(request)
        duration_ms = round((time.monotonic() - start) * 1000)

        logger.info(
            "request",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
                "ip": getattr(request.client, "host", "-"),
                "ua": request.headers.get("user-agent", "")[:120],
            },
        )

        response.headers["X-Request-ID"] = request_id
        return response


app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    logger.warning("validation_error", extra={"errors": exc.errors(), "path": request.url.path})
    detail = exc.errors() if not _IS_PROD else "Invalid request parameters."
    return JSONResponse(status_code=422, content={"detail": detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(
        "unhandled_exception",
        extra={"path": request.url.path, "method": request.method},
        exc_info=exc,
    )
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"
    if _IS_PROD:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    return response


app.include_router(router)
app.include_router(summary_router)


@app.get("/health", include_in_schema=False)
def health_check():
    return {"status": "ok"}

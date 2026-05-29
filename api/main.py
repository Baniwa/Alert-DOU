import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from api.routes import router, summary_router
from api.limiter import limiter

_CORS_ORIGINS = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:4173",
).split(",")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Alembic handles migrations now, no need for create_tables() here
    yield


app = FastAPI(
    title="Alert DOU",
    description="Real-time monitoring of Brazil's Diário Oficial da União.",
    version="0.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(router)
app.include_router(summary_router)

@app.get("/health", response_model=dict, tags=["health"])
def health_check():
    return {"status": "ok"}

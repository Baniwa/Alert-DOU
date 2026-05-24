from contextlib import asynccontextmanager

from fastapi import FastAPI

from api.routes import router
from database.session import create_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(
    title="Alert DOU",
    description="Real-time monitoring of Brazil's Diário Oficial da União.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(router)

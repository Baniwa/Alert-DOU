import os
from contextlib import contextmanager
from typing import Generator
from dotenv import load_dotenv
from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import Session, sessionmaker
from database.models import Base

_engine: Engine | None = None
_DRIVER_PREFIXES = ("postgresql://", "postgres://")
_SessionFactory: sessionmaker | None = None


def database_url() -> str:
    """DATABASE_URL with the psycopg2 driver made explicit. SQLAlchemy 2.1 switched the default
    for postgresql:// to psycopg 3, which this project does not install."""
    url = os.environ["DATABASE_URL"]
    for prefix in _DRIVER_PREFIXES:
        if url.startswith(prefix):
            return "postgresql+psycopg2://" + url[len(prefix):]
    return url


def _init() -> None:
    global _engine, _SessionFactory
    if _engine is not None:
        return
    load_dotenv()
    _engine = create_engine(database_url(), pool_size=5, max_overflow=10, echo=False)
    _SessionFactory = sessionmaker(bind=_engine, autocommit=False, autoflush=False, expire_on_commit=False)


@contextmanager
def get_session() -> Generator[Session, None, None]:
    _init()
    session = _SessionFactory()  # type: ignore[misc]
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def create_tables() -> None:
    _init()
    Base.metadata.create_all(bind=_engine)


#with get_session() as session:
#   session.add(edition)
# commit automático ao sair do `with`
# rollback automático se lançar exception

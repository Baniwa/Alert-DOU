import os
from contextlib import contextmanager
from typing import Generator
from dotenv import load_dotenv
from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import Session, sessionmaker
from database.models import Base

_engine: Engine | None = None
_SessionFactory: sessionmaker | None = None


def _init() -> None:
    global _engine, _SessionFactory
    if _engine is not None:
        return
    load_dotenv()
    url = os.environ["DATABASE_URL"]  # fail fast at first real DB access
    _engine = create_engine(url, pool_size=5, max_overflow=10, echo=False)
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

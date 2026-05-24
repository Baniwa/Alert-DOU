import os
from contextlib import contextmanager
from typing import Generator
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from database.models import Base

load_dotenv()

_DATABASE_URL = os.environ["DATABASE_URL"] #princípio fail fast.

engine = create_engine(
    _DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    echo=False,
)

_SessionFactory = sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


@contextmanager
def get_session() -> Generator[Session, None, None]:
    session = _SessionFactory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


#with get_session() as session:
#   session.add(edition)
# commit automático ao sair do `with`
# rollback automático se lançar exception

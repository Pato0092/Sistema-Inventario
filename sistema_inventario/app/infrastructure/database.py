import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL, make_url
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()


def normalizar_database_url(url: str) -> str:
    """Adapta una URL de Postgres (Neon, Render, Heroku...) al driver psycopg 3."""
    url = url.strip()
    for prefijo in ("postgres://", "postgresql://"):
        if url.startswith(prefijo):
            return "postgresql+psycopg://" + url[len(prefijo):]
    return url


def construir_database_url() -> str:
    """DATABASE_URL (nube) tiene prioridad; si no existe se usan las DB_* locales."""
    url = os.getenv("DATABASE_URL")
    if url and url.strip():
        return normalizar_database_url(url)
    return URL.create(
        "postgresql+psycopg",
        username=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT") or 5432),
        database=os.getenv("DB_NAME"),
    ).render_as_string(hide_password=False)


DATABASE_URL = construir_database_url()

_url = make_url(DATABASE_URL)
_connect_args = {}
if _url.host not in (None, "", "localhost", "127.0.0.1") and "sslmode" not in _url.query:
    _connect_args["sslmode"] = "require"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   
    pool_recycle=300,
    connect_args=_connect_args,
)

SessionLocal = sessionmaker(
    bind = engine,
    autoflush = False,
    autocommit = False
)

Base = declarative_base()

from collections.abc import Generator
import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


DEFAULT_SQLITE_URL = "sqlite:///./household_power.db"


def normalize_database_url(value: str | None = None) -> str:
    raw_url = (value or os.getenv("DATABASE_URL") or DEFAULT_SQLITE_URL).strip()
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+psycopg://", 1)
    if raw_url.startswith("postgresql://"):
        return raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return raw_url


def build_engine(database_url: str) -> Engine:
    engine_kwargs: dict = {}

    if database_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    else:
        engine_kwargs["pool_pre_ping"] = True

    return create_engine(database_url, **engine_kwargs)


DATABASE_URL = normalize_database_url()


class Base(DeclarativeBase):
    pass


engine = build_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


RUNTIME_SCHEMA_PATCHES = {
    "prediction_record": {
        "baseline_kwh": "ALTER TABLE prediction_record ADD COLUMN baseline_kwh FLOAT",
        "contribution_json": "ALTER TABLE prediction_record ADD COLUMN contribution_json TEXT",
        "assumption_json": "ALTER TABLE prediction_record ADD COLUMN assumption_json TEXT",
        "context_json": "ALTER TABLE prediction_record ADD COLUMN context_json TEXT",
    }
}


def ensure_runtime_schema() -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as connection:
        for table_name, column_patches in RUNTIME_SCHEMA_PATCHES.items():
            if table_name not in existing_tables:
                continue

            existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, ddl in column_patches.items():
                if column_name in existing_columns:
                    continue
                connection.execute(text(ddl))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

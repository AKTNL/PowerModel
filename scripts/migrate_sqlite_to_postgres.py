import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import Base, DEFAULT_SQLITE_URL, build_engine, normalize_database_url
from app.models import ChatRecord, LLMConfig, MonthlyUsage, PredictionRecord, UserProfile


MODELS_IN_ORDER = [
    UserProfile,
    MonthlyUsage,
    PredictionRecord,
    LLMConfig,
    ChatRecord,
]


def migrate_model(model, source_session: Session, target_session: Session) -> None:
    rows = source_session.scalars(select(model)).all()
    for row in rows:
        payload = {
            column.name: getattr(row, column.name)
            for column in model.__table__.columns
        }
        target_session.merge(model(**payload))
    target_session.commit()
    print(f"{model.__tablename__}: migrated {len(rows)} rows")


def main() -> None:
    source_url = normalize_database_url(os.getenv("SOURCE_DATABASE_URL") or DEFAULT_SQLITE_URL)
    target_url = normalize_database_url(os.getenv("TARGET_DATABASE_URL") or os.getenv("DATABASE_URL"))

    if not target_url:
        raise SystemExit("TARGET_DATABASE_URL or DATABASE_URL is required.")
    if source_url == target_url:
        raise SystemExit("Source and target database URLs are the same. Migration aborted.")

    print(f"source={source_url}")
    print(f"target={target_url}")

    source_engine = build_engine(source_url)
    target_engine = build_engine(target_url)

    Base.metadata.create_all(bind=target_engine)

    with Session(source_engine) as source_session, Session(target_engine) as target_session:
        for model in MODELS_IN_ORDER:
            migrate_model(model, source_session, target_session)

    print("migration completed")


if __name__ == "__main__":
    main()

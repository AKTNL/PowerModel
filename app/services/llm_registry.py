from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import GlobalLLMConfig, LLMConfig


def get_global_llm_config(db: Session) -> GlobalLLMConfig | None:
    return db.scalars(select(GlobalLLMConfig).order_by(GlobalLLMConfig.id.asc())).first()


def get_user_llm_override(db: Session, user_id: int) -> LLMConfig | None:
    return db.scalars(select(LLMConfig).where(LLMConfig.user_id == user_id)).first()


def resolve_effective_llm_config(db: Session, user_id: int | None = None, *, prefer_user_override: bool = False):
    if prefer_user_override and user_id is not None:
        override = get_user_llm_override(db, user_id)
        if override is not None:
            return override
    return get_global_llm_config(db)

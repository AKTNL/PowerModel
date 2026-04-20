from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GlobalLLMConfig, LLMConfig, UserProfile
from app.schemas import (
    APIResponse,
    GlobalLLMConfigRead,
    GlobalLLMConfigUpsertRequest,
    LLMConfigRead,
    LLMConfigTestRequest,
    LLMConfigUpsertRequest,
)
from app.services.llm_registry import get_global_llm_config
from app.services.llm_client import LLMRuntimeConfig, LLMServiceError, mask_api_key, test_openai_compatible_connection


router = APIRouter(prefix="/llm", tags=["llm"])


def _serialize_config(config: LLMConfig) -> dict:
    return LLMConfigRead(
        id=config.id,
        user_id=config.user_id,
        provider=config.provider,
        base_url=config.base_url,
        model_name=config.model_name,
        temperature=config.temperature,
        enabled=config.enabled,
        has_api_key=bool(config.api_key),
        masked_api_key=mask_api_key(config.api_key) if config.api_key else None,
        created_at=config.created_at,
        updated_at=config.updated_at,
    ).model_dump()


def _serialize_global_config(config: GlobalLLMConfig | None) -> dict:
    if config is None:
        return GlobalLLMConfigRead(
            provider="openai-compatible",
            base_url="",
            model_name="",
            temperature=0.3,
            enabled=False,
            has_api_key=False,
            masked_api_key=None,
            source="global",
        ).model_dump()

    return GlobalLLMConfigRead(
        id=config.id,
        provider=config.provider,
        base_url=config.base_url,
        model_name=config.model_name,
        temperature=config.temperature,
        enabled=config.enabled,
        has_api_key=bool(config.api_key),
        masked_api_key=mask_api_key(config.api_key) if config.api_key else None,
        source="global",
        created_at=config.created_at,
        updated_at=config.updated_at,
    ).model_dump()


@router.post("/config", response_model=APIResponse)
def upsert_global_llm_config(payload: GlobalLLMConfigUpsertRequest, db: Session = Depends(get_db)) -> APIResponse:
    config = get_global_llm_config(db)
    values = payload.model_dump()

    if config is None:
        config = GlobalLLMConfig(**values)
        db.add(config)
    else:
        for field, value in values.items():
            setattr(config, field, value)

    db.commit()
    db.refresh(config)
    return APIResponse(data={"config": _serialize_global_config(config)})


@router.get("/config", response_model=APIResponse)
def get_global_config(db: Session = Depends(get_db)) -> APIResponse:
    return APIResponse(data={"config": _serialize_global_config(get_global_llm_config(db))})


@router.delete("/config", response_model=APIResponse)
def delete_global_config(db: Session = Depends(get_db)) -> APIResponse:
    config = get_global_llm_config(db)
    if config is not None:
        db.delete(config)
        db.commit()
    return APIResponse(data={"deleted": True})


@router.post("/config/user", response_model=APIResponse)
def upsert_llm_override(payload: LLMConfigUpsertRequest, db: Session = Depends(get_db)) -> APIResponse:
    user = db.get(UserProfile, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    config = db.scalars(
        select(LLMConfig).where(LLMConfig.user_id == payload.user_id)
    ).first()
    values = payload.model_dump()
    values.pop("user_id")

    if config is None:
        config = LLMConfig(user_id=payload.user_id, **values)
        db.add(config)
    else:
        for field, value in values.items():
            setattr(config, field, value)

    db.commit()
    db.refresh(config)
    return APIResponse(data={"config": _serialize_config(config)})


@router.get("/config/user/{user_id}", response_model=APIResponse)
def get_llm_override(user_id: int, db: Session = Depends(get_db)) -> APIResponse:
    user = db.get(UserProfile, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    config = db.scalars(
        select(LLMConfig).where(LLMConfig.user_id == user_id)
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="LLM config not found")

    return APIResponse(data={"config": _serialize_config(config)})


@router.delete("/config/user/{user_id}", response_model=APIResponse)
def delete_llm_override(user_id: int, db: Session = Depends(get_db)) -> APIResponse:
    user = db.get(UserProfile, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    config = db.scalars(
        select(LLMConfig).where(LLMConfig.user_id == user_id)
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="LLM config not found")

    db.delete(config)
    db.commit()
    return APIResponse(data={"deleted": True, "user_id": user_id})


@router.post("/test", response_model=APIResponse)
def test_llm(payload: LLMConfigTestRequest) -> APIResponse:
    config = LLMRuntimeConfig(
        provider=payload.provider,
        base_url=payload.base_url,
        api_key=payload.api_key,
        model_name=payload.model_name,
        temperature=payload.temperature,
    )
    try:
        preview = test_openai_compatible_connection(config, payload.prompt)
    except LLMServiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return APIResponse(data={"ok": True, "preview": preview[:200]})

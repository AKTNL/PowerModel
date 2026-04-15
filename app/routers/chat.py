from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ChatRecord, LLMConfig, MonthlyUsage, PredictionRecord, UserProfile
from app.schemas import APIResponse, ChatRead, ChatRequest, ScenarioRequest
from app.services.advisor import answer_question, simulate_scenario


router = APIRouter(tags=["chat", "scenario"])


@router.post("/chat", response_model=APIResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db)) -> APIResponse:
    user = db.get(UserProfile, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    prediction = db.scalars(
        select(PredictionRecord)
        .where(PredictionRecord.user_id == payload.user_id)
        .order_by(PredictionRecord.created_at.desc())
    ).first()

    llm_config = db.scalars(
        select(LLMConfig).where(LLMConfig.user_id == payload.user_id)
    ).first()
    recent_usage = db.scalars(
        select(MonthlyUsage)
        .where(MonthlyUsage.user_id == payload.user_id)
        .order_by(MonthlyUsage.usage_month.desc())
        .limit(6)
    ).all()
    recent_usage = list(reversed(recent_usage))

    recent_chats = db.scalars(
        select(ChatRecord)
        .where(ChatRecord.user_id == payload.user_id)
        .order_by(ChatRecord.created_at.desc())
        .limit(6)
    ).all()
    recent_chats = list(reversed(recent_chats))

    answer, answer_mode, llm_error = answer_question(
        user,
        prediction,
        payload.question,
        llm_config,
        recent_usage=recent_usage,
        recent_chats=recent_chats,
    )
    chat_record = ChatRecord(user_id=payload.user_id, question=payload.question, answer=answer)
    db.add(chat_record)
    db.commit()
    db.refresh(chat_record)

    return APIResponse(
        data={
            "chat": ChatRead.model_validate(chat_record).model_dump(),
            "generation_mode": answer_mode,
            "llm_error": llm_error,
        }
    )


@router.get("/chat/{user_id}", response_model=APIResponse)
def get_chat_history(user_id: int, db: Session = Depends(get_db)) -> APIResponse:
    user = db.get(UserProfile, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    records = db.scalars(
        select(ChatRecord)
        .where(ChatRecord.user_id == user_id)
        .order_by(ChatRecord.created_at.asc())
        .limit(20)
    ).all()

    return APIResponse(
        data={"records": [ChatRead.model_validate(record).model_dump() for record in records]}
    )


@router.post("/scenario/simulate", response_model=APIResponse)
def scenario_simulate(payload: ScenarioRequest, db: Session = Depends(get_db)) -> APIResponse:
    user = db.get(UserProfile, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    query = (
        select(PredictionRecord)
        .where(PredictionRecord.user_id == payload.user_id)
        .order_by(PredictionRecord.created_at.desc())
    )
    if payload.target_month:
        query = (
            select(PredictionRecord)
            .where(
                PredictionRecord.user_id == payload.user_id,
                PredictionRecord.target_month == payload.target_month,
            )
            .order_by(PredictionRecord.created_at.desc())
        )

    prediction = db.scalars(query).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    result = simulate_scenario(
        prediction=prediction,
        reduce_ac_hours_per_day=payload.reduce_ac_hours_per_day,
        reduce_water_heater_hours_per_day=payload.reduce_water_heater_hours_per_day,
    )
    return APIResponse(data=result)

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PredictionRecord, UserProfile
from app.schemas import APIResponse, AdviceRequest
from app.services.llm_registry import resolve_effective_llm_config
from app.services.advisor import generate_prediction_insights


router = APIRouter(prefix="/advice", tags=["advice"])


@router.post("/generate", response_model=APIResponse)
def regenerate_advice(payload: AdviceRequest, db: Session = Depends(get_db)) -> APIResponse:
    user = db.get(UserProfile, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    prediction = db.scalars(
        select(PredictionRecord)
        .where(PredictionRecord.user_id == payload.user_id)
        .order_by(PredictionRecord.created_at.desc())
    ).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    llm_config = resolve_effective_llm_config(db, payload.user_id)
    insight = generate_prediction_insights(user, prediction, llm_config)
    prediction.reason_text = insight.reason_text
    prediction.advice_text = insight.advice_text
    db.commit()
    db.refresh(prediction)

    return APIResponse(
        data={
            "reason_text": prediction.reason_text,
            "advice_text": prediction.advice_text,
            "generation_mode": insight.mode,
            "llm_error": insight.llm_error,
        }
    )

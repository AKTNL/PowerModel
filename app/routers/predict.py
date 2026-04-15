from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import LLMConfig, PredictionRecord, UserProfile
from app.schemas import APIResponse, PredictionRead, PredictionRequest
from app.services.advisor import generate_prediction_insights
from app.services.predictor import predict_usage


router = APIRouter(prefix="/predict", tags=["predict"])


@router.post("/monthly", response_model=APIResponse)
def predict_monthly(payload: PredictionRequest, db: Session = Depends(get_db)) -> APIResponse:
    user = db.get(UserProfile, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        result = predict_usage(db=db, user=user, target_month=payload.target_month)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    prediction = PredictionRecord(
        user_id=user.id,
        target_month=result.target_month,
        predicted_kwh=result.predicted_kwh,
        predicted_bill=result.predicted_bill,
        lower_bound=result.lower_bound,
        upper_bound=result.upper_bound,
        reason_text="\n".join(result.reasons),
    )
    db.add(prediction)
    db.flush()

    llm_config = db.scalars(
        select(LLMConfig).where(LLMConfig.user_id == payload.user_id)
    ).first()
    insight = generate_prediction_insights(user, prediction, llm_config)
    prediction.reason_text = insight.reason_text
    prediction.advice_text = insight.advice_text
    db.commit()
    db.refresh(prediction)

    return APIResponse(
        data={
            "prediction": PredictionRead.model_validate(prediction).model_dump(),
            "generation_mode": insight.mode,
            "llm_error": insight.llm_error,
        }
    )


@router.get("/{user_id}", response_model=APIResponse)
def latest_prediction(user_id: int, db: Session = Depends(get_db)) -> APIResponse:
    user = db.get(UserProfile, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    prediction = db.scalars(
        select(PredictionRecord)
        .where(PredictionRecord.user_id == user_id)
        .order_by(PredictionRecord.created_at.desc())
    ).first()
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    return APIResponse(data={"prediction": PredictionRead.model_validate(prediction).model_dump()})

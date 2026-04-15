from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MonthlyUsage, UserProfile
from app.schemas import APIResponse, MonthlyUsageBatchCreate, MonthlyUsageRead


router = APIRouter(prefix="/usage", tags=["usage"])


@router.post("/upload", response_model=APIResponse)
def upload_usage(payload: MonthlyUsageBatchCreate, db: Session = Depends(get_db)) -> APIResponse:
    user = db.get(UserProfile, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = {
        record.usage_month: record
        for record in db.scalars(
            select(MonthlyUsage).where(MonthlyUsage.user_id == payload.user_id)
        ).all()
    }

    saved_records: list[MonthlyUsage] = []
    for item in payload.records:
        record = existing.get(item.usage_month)
        if record:
            for field, value in item.model_dump().items():
                setattr(record, field, value)
        else:
            record = MonthlyUsage(user_id=payload.user_id, **item.model_dump())
            db.add(record)
        saved_records.append(record)

    db.commit()
    for record in saved_records:
        db.refresh(record)

    return APIResponse(
        data={
            "count": len(saved_records),
            "records": [MonthlyUsageRead.model_validate(record).model_dump() for record in saved_records],
        }
    )


@router.get("/{user_id}", response_model=APIResponse)
def list_usage(user_id: int, db: Session = Depends(get_db)) -> APIResponse:
    user = db.get(UserProfile, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    records = db.scalars(
        select(MonthlyUsage)
        .where(MonthlyUsage.user_id == user_id)
        .order_by(MonthlyUsage.usage_month)
    ).all()

    return APIResponse(
        data={"records": [MonthlyUsageRead.model_validate(record).model_dump() for record in records]}
    )


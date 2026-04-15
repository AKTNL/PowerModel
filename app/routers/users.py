from fastapi import APIRouter, Depends
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserProfile
from app.schemas import APIResponse, UserCreate, UserRead


router = APIRouter(prefix="/users", tags=["users"])


@router.post("/create", response_model=APIResponse)
def create_user(payload: UserCreate, db: Session = Depends(get_db)) -> APIResponse:
    user = UserProfile(**payload.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    return APIResponse(data={"user": UserRead.model_validate(user).model_dump()})


@router.get("/{user_id}", response_model=APIResponse)
def get_user(user_id: int, db: Session = Depends(get_db)) -> APIResponse:
    user = db.get(UserProfile, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return APIResponse(data={"user": UserRead.model_validate(user).model_dump()})

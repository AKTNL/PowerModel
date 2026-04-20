from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.national_schemas import (
    NationalAPIResponse,
    NationalDatasetValidateRequest,
    NationalForecastRunRequest,
    NationalLLMConfigPayload,
    NationalLLMTestRequest,
    NationalPolishReportRequest,
    NationalQARequest,
)
from app.services.national import NationalService


router = APIRouter(prefix="/api/national", tags=["national"])


def get_service(request: Request, db: Session) -> NationalService:
    return NationalService(runtime=request.app.state.runtime, db=db)


@router.get("/datasets/default", response_model=NationalAPIResponse)
def get_default_dataset(request: Request, db: Session = Depends(get_db)) -> NationalAPIResponse:
    return NationalAPIResponse(data=get_service(request, db).get_default_dataset_payload())


@router.post("/datasets/validate", response_model=NationalAPIResponse)
def validate_dataset(
    payload: NationalDatasetValidateRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> NationalAPIResponse:
    return NationalAPIResponse(data=get_service(request, db).validate_dataset(payload))


@router.post("/forecast/run", response_model=NationalAPIResponse)
def run_forecast(payload: NationalForecastRunRequest, request: Request, db: Session = Depends(get_db)) -> NationalAPIResponse:
    return NationalAPIResponse(data=get_service(request, db).run_forecast(payload))


@router.post("/report/polish", response_model=NationalAPIResponse)
def polish_report(
    payload: NationalPolishReportRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> NationalAPIResponse:
    return NationalAPIResponse(data=get_service(request, db).polish_report(payload))


@router.post("/qa", response_model=NationalAPIResponse)
def answer_question(payload: NationalQARequest, request: Request, db: Session = Depends(get_db)) -> NationalAPIResponse:
    return NationalAPIResponse(data=get_service(request, db).answer_question(payload))


@router.post("/llm/test", response_model=NationalAPIResponse)
def test_llm(payload: NationalLLMTestRequest, request: Request, db: Session = Depends(get_db)) -> NationalAPIResponse:
    return NationalAPIResponse(data=get_service(request, db).test_llm(payload))


@router.post("/llm/config", response_model=NationalAPIResponse)
def upsert_llm_config(
    payload: NationalLLMConfigPayload,
    request: Request,
    db: Session = Depends(get_db),
) -> NationalAPIResponse:
    return NationalAPIResponse(data=get_service(request, db).upsert_llm_config(payload))


@router.get("/llm/config", response_model=NationalAPIResponse)
def get_llm_config(request: Request, db: Session = Depends(get_db)) -> NationalAPIResponse:
    return NationalAPIResponse(data=get_service(request, db).get_llm_config())


@router.delete("/llm/config", response_model=NationalAPIResponse)
def delete_llm_config(request: Request, db: Session = Depends(get_db)) -> NationalAPIResponse:
    return NationalAPIResponse(data=get_service(request, db).delete_llm_config())


@router.get("/meta", response_model=NationalAPIResponse)
def get_meta(request: Request, db: Session = Depends(get_db)) -> NationalAPIResponse:
    return NationalAPIResponse(data=get_service(request, db).get_meta())

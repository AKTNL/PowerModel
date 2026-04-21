from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from src.config import APP_CONFIG


class NationalAPIResponse(BaseModel):
    code: int = 0
    message: str = "success"
    data: dict[str, Any] = Field(default_factory=dict)


class NationalHistoryPoint(BaseModel):
    date: str
    value: float
    is_imputed: bool = False
    source: str | None = None
    source_url: str | None = None
    note: str | None = None


class NationalForecastPoint(BaseModel):
    date: str
    forecast: float
    lower_bound: float
    upper_bound: float


class NationalStatsSummary(BaseModel):
    record_count: int
    history_start: str
    history_end: str
    latest_month: str
    latest_value: float
    average_value: float
    max_value: float
    min_value: float
    max_month: str
    min_month: str
    last_mom_pct: float | None = None
    last_yoy_pct: float | None = None
    recent_avg_growth_pct: float | None = None
    seasonal_peak_months: list[int]
    seasonal_low_months: list[int]


class NationalLLMConfigPayload(BaseModel):
    enabled: bool = False
    provider: str = "OpenAI-Compatible"
    base_url: str = ""
    model: str = ""
    api_key: str = ""

    @field_validator("base_url")
    @classmethod
    def normalize_base_url(cls, value: str) -> str:
        return value.strip()


class NationalDatasetValidateRequest(BaseModel):
    csv_content: str = Field(min_length=1)
    filename: str | None = None


class NationalForecastRunRequest(BaseModel):
    dataset_source: Literal["default", "uploaded"] = "default"
    forecast_periods: int = Field(
        default=APP_CONFIG.default_forecast_periods,
        ge=APP_CONFIG.min_forecast_periods,
        le=APP_CONFIG.max_forecast_periods,
    )
    csv_content: str | None = None
    llm_config: NationalLLMConfigPayload | None = None

    @field_validator("csv_content")
    @classmethod
    def validate_uploaded_content(cls, value: str | None, info) -> str | None:
        if info.data.get("dataset_source") == "uploaded" and not value:
            raise ValueError("csv_content is required when dataset_source is uploaded")
        return value


class NationalPolishReportRequest(BaseModel):
    draft_report: str = Field(min_length=1)
    context: dict[str, Any] = Field(default_factory=dict)
    llm_config: NationalLLMConfigPayload | None = None


class NationalQARequest(BaseModel):
    question: str = Field(min_length=1)
    history: list[NationalHistoryPoint]
    forecast: list[NationalForecastPoint]
    stats: NationalStatsSummary
    qa_mode: Literal["local", "cloud_rewrite", "cloud_direct"] = "cloud_rewrite"
    llm_config: NationalLLMConfigPayload | None = None


class NationalLLMTestRequest(BaseModel):
    llm_config: NationalLLMConfigPayload

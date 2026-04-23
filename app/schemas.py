from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class APIResponse(BaseModel):
    code: int = 0
    message: str = "success"
    data: dict = Field(default_factory=dict)


class UserCreate(BaseModel):
    username: str
    family_size: int | None = Field(default=None, ge=1)
    house_area: float | None = Field(default=None, ge=0)
    air_conditioner_count: int | None = Field(default=None, ge=0)
    water_heater_type: str | None = None
    cooking_type: str | None = None


class UserRead(UserCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MonthlyUsageBase(BaseModel):
    usage_month: str = Field(description="Format: YYYY-MM")
    power_kwh: float = Field(gt=0)
    bill_amount: float | None = Field(default=None, ge=0)
    avg_temperature: float | None = None
    holiday_count: int | None = Field(default=None, ge=0)

    @field_validator("usage_month")
    @classmethod
    def validate_usage_month(cls, value: str) -> str:
        parts = value.split("-")
        if len(parts) != 2 or len(parts[0]) != 4 or len(parts[1]) != 2:
            raise ValueError("usage_month must use YYYY-MM format")
        year = int(parts[0])
        month = int(parts[1])
        if year < 2000 or not 1 <= month <= 12:
            raise ValueError("usage_month is out of supported range")
        return value


class MonthlyUsageCreate(MonthlyUsageBase):
    pass


class MonthlyUsageBatchCreate(BaseModel):
    user_id: int
    records: list[MonthlyUsageCreate]


class MonthlyUsageRead(MonthlyUsageBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)


class PredictionContextRequest(BaseModel):
    avg_temperature: float | None = Field(default=None, ge=-50, le=70)
    holiday_count: int | None = Field(default=None, ge=0, le=31)


class PredictionContextRead(BaseModel):
    avg_temperature: float | None = None
    holiday_count: int | None = None
    reference_avg_temperature: float | None = None
    reference_holiday_count: float | None = None
    temperature_source: str | None = None
    holiday_source: str | None = None


class PredictionRequest(BaseModel):
    user_id: int
    target_month: str | None = Field(default=None, description="Optional. Format: YYYY-MM")
    context: PredictionContextRequest | None = None

    @field_validator("target_month")
    @classmethod
    def validate_target_month(cls, value: str | None) -> str | None:
        if value is None:
            return value
        MonthlyUsageBase.validate_usage_month(value)
        return value


class PredictionContributionRead(BaseModel):
    key: str
    label: str
    kwh: float
    share_percent: float | None = None
    type: str
    direction: str
    summary: str


class PredictionRead(BaseModel):
    id: int
    user_id: int
    target_month: str
    predicted_kwh: float
    predicted_bill: float | None = None
    lower_bound: float | None = None
    upper_bound: float | None = None
    baseline_kwh: float | None = None
    context: PredictionContextRead = Field(default_factory=PredictionContextRead)
    contributions: list[PredictionContributionRead] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    reason_text: str | None = None
    advice_text: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdviceRequest(BaseModel):
    user_id: int


class LLMConfigBase(BaseModel):
    provider: str = "openai-compatible"
    base_url: str
    api_key: str = Field(min_length=1)
    model_name: str = Field(min_length=1)
    temperature: float = Field(default=0.3, ge=0, le=2)
    enabled: bool = True

    @field_validator("base_url")
    @classmethod
    def normalize_base_url(cls, value: str) -> str:
        value = value.strip().rstrip("/")
        if not value.startswith(("http://", "https://")):
            raise ValueError("base_url must start with http:// or https://")
        if value.endswith("/chat/completions"):
            value = value[: -len("/chat/completions")]
        return value


class LLMConfigUpsertRequest(LLMConfigBase):
    user_id: int


class GlobalLLMConfigUpsertRequest(LLMConfigBase):
    pass


class LLMConfigTestRequest(LLMConfigBase):
    prompt: str = Field(default="Reply with OK only.", min_length=2)


class LLMConfigDiagnosticRequest(LLMConfigBase):
    prompt: str = Field(default="未来一年全国全社会用电量趋势如何？", min_length=2)


class LLMConfigRead(BaseModel):
    id: int
    user_id: int
    provider: str
    base_url: str
    model_name: str
    temperature: float
    enabled: bool
    has_api_key: bool
    masked_api_key: str | None = None
    created_at: datetime
    updated_at: datetime


class GlobalLLMConfigRead(BaseModel):
    id: int | None = None
    provider: str
    base_url: str
    model_name: str
    temperature: float
    enabled: bool
    has_api_key: bool
    masked_api_key: str | None = None
    source: str = "global"
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ChatRequest(BaseModel):
    user_id: int
    question: str = Field(min_length=2)

    @field_validator("question")
    @classmethod
    def validate_question(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 2:
            raise ValueError("question must contain at least 2 non-space characters")
        if all(char in {"?", "？", "�"} or char.isspace() for char in normalized):
            raise ValueError("question cannot contain only placeholder characters")
        return normalized


class ChatRead(BaseModel):
    id: int
    user_id: int
    question: str
    answer: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScenarioRequest(BaseModel):
    user_id: int
    reduce_ac_hours_per_day: float = Field(default=0, ge=0)
    ac_setpoint_delta_c: float = Field(default=0, ge=0, le=8)
    reduce_water_heater_hours_per_day: float = Field(default=0, ge=0)
    away_days: int = Field(default=0, ge=0, le=31)
    water_heater_mode: str = Field(default="keep")
    target_month: str | None = Field(default=None, description="Optional. Format: YYYY-MM")

    @field_validator("target_month")
    @classmethod
    def validate_target_month(cls, value: str | None) -> str | None:
        if value is None:
            return value
        MonthlyUsageBase.validate_usage_month(value)
        return value

    @field_validator("water_heater_mode")
    @classmethod
    def validate_water_heater_mode(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"keep", "timer", "eco"}:
            raise ValueError("water_heater_mode must be one of: keep, timer, eco")
        return normalized

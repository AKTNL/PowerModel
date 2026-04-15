from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserProfile(Base):
    __tablename__ = "user_profile"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    family_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    house_area: Mapped[float | None] = mapped_column(Float, nullable=True)
    air_conditioner_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    water_heater_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cooking_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    usages: Mapped[list["MonthlyUsage"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    predictions: Mapped[list["PredictionRecord"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    llm_config: Mapped["LLMConfig | None"] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    chats: Mapped[list["ChatRecord"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class MonthlyUsage(Base):
    __tablename__ = "monthly_usage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_profile.id"), nullable=False, index=True)
    usage_month: Mapped[str] = mapped_column(String(7), nullable=False, index=True)
    power_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    bill_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    holiday_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    user: Mapped["UserProfile"] = relationship(back_populates="usages")


class PredictionRecord(Base):
    __tablename__ = "prediction_record"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_profile.id"), nullable=False, index=True)
    target_month: Mapped[str] = mapped_column(String(7), nullable=False)
    predicted_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    predicted_bill: Mapped[float | None] = mapped_column(Float, nullable=True)
    lower_bound: Mapped[float | None] = mapped_column(Float, nullable=True)
    upper_bound: Mapped[float | None] = mapped_column(Float, nullable=True)
    reason_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    advice_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["UserProfile"] = relationship(back_populates="predictions")


class LLMConfig(Base):
    __tablename__ = "llm_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_profile.id"),
        nullable=False,
        index=True,
        unique=True,
    )
    provider: Mapped[str] = mapped_column(String(50), default="openai-compatible")
    base_url: Mapped[str] = mapped_column(String(255), nullable=False)
    api_key: Mapped[str] = mapped_column(Text, nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    temperature: Mapped[float] = mapped_column(Float, default=0.3)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    user: Mapped["UserProfile"] = relationship(back_populates="llm_config")


class ChatRecord(Base):
    __tablename__ = "chat_record"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_profile.id"), nullable=False, index=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["UserProfile"] = relationship(back_populates="chats")

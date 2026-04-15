from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.models import MonthlyUsage, UserProfile


SUMMER_MONTHS = {6, 7, 8, 9}
WINTER_MONTHS = {12, 1, 2}
DEFAULT_PRICE_PER_KWH = 0.56


@dataclass
class PredictionResult:
    target_month: str
    predicted_kwh: float
    predicted_bill: float
    lower_bound: float
    upper_bound: float
    reasons: list[str]


def _parse_month(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m")


def _format_month(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}"


def _next_month(latest: str) -> str:
    dt = _parse_month(latest)
    year = dt.year + (1 if dt.month == 12 else 0)
    month = 1 if dt.month == 12 else dt.month + 1
    return _format_month(year, month)


def _estimate_price(usages: list[MonthlyUsage]) -> float:
    rates = [
        usage.bill_amount / usage.power_kwh
        for usage in usages
        if usage.bill_amount is not None and usage.power_kwh > 0
    ]
    return round(sum(rates) / len(rates), 4) if rates else DEFAULT_PRICE_PER_KWH


def _season_factor(month: int) -> tuple[float, str]:
    if month in SUMMER_MONTHS:
        return 1.08, "目标月份处于夏季，空调负荷通常会推高家庭用电。"
    if month in WINTER_MONTHS:
        return 1.05, "目标月份处于冬季，取暖和热水负荷会让用电略有上升。"
    return 0.98, "目标月份不在极端冷暖季节，季节性压力相对较小。"


def _same_month_last_year(usages: list[MonthlyUsage], target_month: str) -> MonthlyUsage | None:
    target_dt = _parse_month(target_month)
    lookup = _format_month(target_dt.year - 1, target_dt.month)
    for usage in usages:
        if usage.usage_month == lookup:
            return usage
    return None


def predict_usage(
    db: Session,
    user: UserProfile,
    target_month: str | None = None,
) -> PredictionResult:
    usages = sorted(user.usages, key=lambda item: item.usage_month)
    if len(usages) < 3:
        raise ValueError("At least 3 months of usage data are required for prediction")

    if target_month is None:
        target_month = _next_month(usages[-1].usage_month)

    last_usage = usages[-1].power_kwh
    recent_three = usages[-3:]
    avg_recent = sum(item.power_kwh for item in recent_three) / len(recent_three)
    same_period = _same_month_last_year(usages, target_month)
    same_period_value = same_period.power_kwh if same_period else avg_recent

    target_month_num = _parse_month(target_month).month
    seasonal_multiplier, seasonal_reason = _season_factor(target_month_num)

    base_prediction = (0.5 * last_usage) + (0.3 * avg_recent) + (0.2 * same_period_value)
    predicted_kwh = round(base_prediction * seasonal_multiplier, 2)

    if user.air_conditioner_count and user.air_conditioner_count >= 2 and target_month_num in SUMMER_MONTHS:
        predicted_kwh = round(predicted_kwh * 1.03, 2)

    price_per_kwh = _estimate_price(usages)
    predicted_bill = round(predicted_kwh * price_per_kwh, 2)

    spread = max(15.0, predicted_kwh * 0.12)
    lower_bound = round(max(0, predicted_kwh - spread), 2)
    upper_bound = round(predicted_kwh + spread, 2)

    trend = "最近三个月用电整体上升。" if last_usage >= avg_recent else "最近三个月用电相对平稳。"
    same_period_reason = (
        f"去年同期 {same_period.usage_month} 的用电量为 {same_period.power_kwh:.1f} kWh，可作为季节对照。"
        if same_period
        else "缺少去年同期数据，本次更多参考了最近三个月的平均负荷。"
    )
    household_reason = (
        f"家庭画像显示有 {user.air_conditioner_count} 台空调，夏季负荷会更明显。"
        if user.air_conditioner_count
        else "当前家庭画像信息较少，后续补充家电信息可以提高解释质量。"
    )

    return PredictionResult(
        target_month=target_month,
        predicted_kwh=predicted_kwh,
        predicted_bill=predicted_bill,
        lower_bound=lower_bound,
        upper_bound=upper_bound,
        reasons=[trend, seasonal_reason, same_period_reason, household_reason],
    )


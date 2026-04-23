from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models import MonthlyUsage, UserProfile


SUMMER_MONTHS = {6, 7, 8, 9}
WINTER_MONTHS = {12, 1, 2}
MAJOR_HOLIDAY_MONTHS = {1, 2, 5, 10}
DEFAULT_PRICE_PER_KWH = 0.56


@dataclass
class PredictionContextInput:
    avg_temperature: float | None = None
    holiday_count: int | None = None


@dataclass
class PredictionResult:
    target_month: str
    predicted_kwh: float
    predicted_bill: float
    lower_bound: float
    upper_bound: float
    baseline_kwh: float
    context: dict[str, Any]
    contributions: list[dict[str, Any]]
    assumptions: list[str]
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
    return 0.98, "目标月份不在极端冷热季节，季节性压力相对较小。"


def _same_month_last_year(usages: list[MonthlyUsage], target_month: str) -> MonthlyUsage | None:
    target_dt = _parse_month(target_month)
    lookup = _format_month(target_dt.year - 1, target_dt.month)
    for usage in usages:
        if usage.usage_month == lookup:
            return usage
    return None


def _average(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 2) if values else None


def _default_reference_temperature(month: int) -> float:
    if month in SUMMER_MONTHS:
        return 29.0
    if month in WINTER_MONTHS:
        return 9.0
    return 21.0


def _default_reference_holiday_count(month: int) -> float:
    return 4.0 if month in MAJOR_HOLIDAY_MONTHS else 2.0


def _resolve_temperature_reference(usages: list[MonthlyUsage], target_month: str) -> tuple[float, str]:
    same_period = _same_month_last_year(usages, target_month)
    if same_period and same_period.avg_temperature is not None:
        return float(same_period.avg_temperature), "same_month_last_year"

    recent_values = [float(item.avg_temperature) for item in usages[-6:] if item.avg_temperature is not None]
    recent_average = _average(recent_values)
    if recent_average is not None:
        return recent_average, "recent_average"

    return _default_reference_temperature(_parse_month(target_month).month), "seasonal_default"


def _resolve_holiday_reference(usages: list[MonthlyUsage], target_month: str) -> tuple[float, str]:
    same_period = _same_month_last_year(usages, target_month)
    if same_period and same_period.holiday_count is not None:
        return float(same_period.holiday_count), "same_month_last_year"

    recent_values = [float(item.holiday_count) for item in usages[-6:] if item.holiday_count is not None]
    recent_average = _average(recent_values)
    if recent_average is not None:
        return recent_average, "recent_average"

    return _default_reference_holiday_count(_parse_month(target_month).month), "calendar_default"


def _occupancy_factor(user: UserProfile) -> float:
    family_size = user.family_size or 3
    bounded_delta = min(max(family_size - 2, -1), 3)
    return 1 + (bounded_delta * 0.08)


def _temperature_pressure(temp: float) -> float:
    return max(temp - 24, 0) + max(18 - temp, 0)


def _temperature_adjustment(target_temp: float, reference_temp: float, user: UserProfile) -> float:
    pressure_delta = _temperature_pressure(target_temp) - _temperature_pressure(reference_temp)
    weather_coeff = 3.0 * _occupancy_factor(user)
    return round(pressure_delta * weather_coeff, 2)


def _holiday_adjustment(target_holidays: int, reference_holidays: float, user: UserProfile) -> float:
    holiday_delta = float(target_holidays) - reference_holidays
    holiday_coeff = 2.8 * _occupancy_factor(user)
    return round(holiday_delta * holiday_coeff, 2)


def _air_conditioner_temperature_adjustment(target_temp: float, reference_temp: float, user: UserProfile) -> float:
    ac_count = user.air_conditioner_count or 0
    if ac_count <= 0:
        return 0.0

    target_cooling = max(0, target_temp - 26)
    reference_cooling = max(0, reference_temp - 26)
    cooling_delta = target_cooling - reference_cooling
    ac_coeff = 1.2 * min(ac_count, 4)
    return round(cooling_delta * ac_coeff, 2)


def _build_contribution(
    *,
    key: str,
    label: str,
    value: float,
    predicted_kwh: float,
    contribution_type: str,
    summary: str,
) -> dict[str, Any]:
    rounded_value = round(value, 2)
    share_percent = round((rounded_value / predicted_kwh) * 100, 1) if predicted_kwh else None
    return {
        "key": key,
        "label": label,
        "kwh": rounded_value,
        "share_percent": share_percent,
        "type": contribution_type,
        "direction": "increase" if rounded_value >= 0 else "decrease",
        "summary": summary,
    }


def _build_reason_lines(
    *,
    baseline_kwh: float,
    recent_weighted: float,
    recent_average_weighted: float,
    same_period_weighted: float,
    temperature_label: str,
    temperature_delta: float,
    holiday_delta: float,
    ac_delta: float,
    same_period: MonthlyUsage | None,
) -> list[str]:
    baseline_reason = (
        f"历史基线约 {baseline_kwh:.1f} kWh，其中最近一个月贡献 {recent_weighted:.1f} kWh，"
        f"近三个月均值贡献 {recent_average_weighted:.1f} kWh，"
        f"{'去年同期参考' if same_period else '同期兜底项'}贡献 {same_period_weighted:.1f} kWh。"
    )

    adjustments: list[str] = []
    if abs(temperature_delta) >= 0.01:
        adjustments.append(f"{temperature_label} {temperature_delta:+.1f} kWh")
    if abs(holiday_delta) >= 0.01:
        adjustments.append(f"节假日贡献 {holiday_delta:+.1f} kWh")
    if abs(ac_delta) >= 0.01:
        adjustments.append(f"空调保有量贡献 {ac_delta:+.1f} kWh")

    adjustment_reason = (
        f"在历史基线之上，{'，'.join(adjustments)}。"
        if adjustments
        else "本次预测没有触发额外的温度、节假日或设备修正项。"
    )

    reference_reason = (
        f"去年同期 {same_period.usage_month} 的用电量被纳入本次预测，帮助保留同月季节节奏。"
        if same_period
        else "由于缺少去年同期数据，本次预测用近三个月均值补足了同期参考项。"
    )
    return [baseline_reason, adjustment_reason, reference_reason]


def predict_usage(
    db: Session,
    user: UserProfile,
    target_month: str | None = None,
    context: PredictionContextInput | None = None,
) -> PredictionResult:
    usages = sorted(user.usages, key=lambda item: item.usage_month)
    if len(usages) < 3:
        raise ValueError("At least 3 months of usage data are required for prediction")

    if target_month is None:
        target_month = _next_month(usages[-1].usage_month)

    context = context or PredictionContextInput()
    target_month_num = _parse_month(target_month).month

    last_usage = usages[-1].power_kwh
    recent_three = usages[-3:]
    avg_recent = sum(item.power_kwh for item in recent_three) / len(recent_three)
    same_period = _same_month_last_year(usages, target_month)
    same_period_value = same_period.power_kwh if same_period else avg_recent

    baseline_kwh = round((0.5 * last_usage) + (0.3 * avg_recent) + (0.2 * same_period_value), 2)
    recent_weighted = round(0.5 * last_usage, 2)
    recent_average_weighted = round(0.3 * avg_recent, 2)
    same_period_weighted = round(baseline_kwh - recent_weighted - recent_average_weighted, 2)

    raw_contributions: list[dict[str, Any]] = [
        {
            "key": "recent_month_weighted",
            "label": "最近一个月基线",
            "value": recent_weighted,
            "type": "base",
            "summary": (
                f"最近一个月 {usages[-1].usage_month} 用电 {last_usage:.1f} kWh，"
                f"按 50% 权重折算为 {recent_weighted:.1f} kWh。"
            ),
        },
        {
            "key": "recent_average_weighted",
            "label": "近三个月平均基线",
            "value": recent_average_weighted,
            "type": "base",
            "summary": f"最近三个月平均用电 {avg_recent:.1f} kWh，按 30% 权重折算为 {recent_average_weighted:.1f} kWh。",
        },
        {
            "key": "same_period_reference",
            "label": "同期参考基线",
            "value": same_period_weighted,
            "type": "base",
            "summary": (
                f"去年同期 {same_period.usage_month} 用电 {same_period.power_kwh:.1f} kWh，按 20% 权重折算为 {same_period_weighted:.1f} kWh。"
                if same_period
                else f"缺少去年同期数据，改用近三个月均值兜底，折算为 {same_period_weighted:.1f} kWh。"
            ),
        },
    ]

    assumptions = [
        f"本次预测使用了 {len(usages)} 个月历史数据，至少需要 3 个月样本。",
        (
            f"已纳入去年同期 {same_period.usage_month} 的用电量 {same_period.power_kwh:.1f} kWh 作为同月参考。"
            if same_period
            else "缺少去年同期数据，本次改用近三个月平均负荷补足同期项。"
        ),
    ]

    context_payload: dict[str, Any] = {
        "avg_temperature": context.avg_temperature,
        "holiday_count": context.holiday_count,
        "reference_avg_temperature": None,
        "reference_holiday_count": None,
        "temperature_source": None,
        "holiday_source": None,
    }

    if context.avg_temperature is not None:
        reference_temperature, temperature_source = _resolve_temperature_reference(usages, target_month)
        temperature_delta = _temperature_adjustment(context.avg_temperature, reference_temperature, user)
        temperature_label = "温度贡献"
        raw_contributions.append(
            {
                "key": "temperature_adjustment",
                "label": "温度贡献",
                "value": temperature_delta,
                "type": "adjustment",
                "summary": (
                    f"目标月平均温度设为 {context.avg_temperature:.1f}°C，参考温度为 {reference_temperature:.1f}°C，"
                    f"温度压力差带来的影响为 {temperature_delta:+.1f} kWh。"
                ),
            }
        )
        assumptions.append(
            f"目标月平均温度按 {context.avg_temperature:.1f}°C 计算，温度参考值来自 {temperature_source}。"
        )
        context_payload["reference_avg_temperature"] = round(reference_temperature, 2)
        context_payload["temperature_source"] = temperature_source
    else:
        seasonal_multiplier, seasonal_reason = _season_factor(target_month_num)
        seasonal_adjusted_kwh = round(baseline_kwh * seasonal_multiplier, 2)
        temperature_delta = round(seasonal_adjusted_kwh - baseline_kwh, 2)
        temperature_label = "季节修正"
        raw_contributions.append(
            {
                "key": "seasonal_adjustment",
                "label": "季节修正",
                "value": temperature_delta,
                "type": "adjustment",
                "summary": f"{seasonal_reason} 该项对基线的影响为 {temperature_delta:+.1f} kWh。",
            }
        )
        assumptions.append(f"未显式填写目标月平均温度，当前按季节规则处理，季节因子为 {seasonal_multiplier:.2f}。")
        context_payload["temperature_source"] = "seasonal_rule"

    if context.holiday_count is not None:
        reference_holidays, holiday_source = _resolve_holiday_reference(usages, target_month)
        holiday_delta = _holiday_adjustment(context.holiday_count, reference_holidays, user)
        raw_contributions.append(
            {
                "key": "holiday_adjustment",
                "label": "节假日贡献",
                "value": holiday_delta,
                "type": "adjustment",
                "summary": (
                    f"目标月节假日天数设为 {context.holiday_count} 天，参考值为 {reference_holidays:.1f} 天，"
                    f"对应的增减影响为 {holiday_delta:+.1f} kWh。"
                ),
            }
        )
        assumptions.append(
            f"目标月节假日天数按 {context.holiday_count} 天计算，节假日参考值来自 {holiday_source}。"
        )
        context_payload["reference_holiday_count"] = round(reference_holidays, 2)
        context_payload["holiday_source"] = holiday_source
    else:
        holiday_delta = 0.0
        assumptions.append("未显式填写目标月节假日天数，默认按参考节奏不做额外节假日修正。")
        context_payload["holiday_source"] = "not_provided"

    if context.avg_temperature is not None:
        reference_temperature_for_ac = float(context_payload["reference_avg_temperature"] or _default_reference_temperature(target_month_num))
        ac_delta = _air_conditioner_temperature_adjustment(context.avg_temperature, reference_temperature_for_ac, user)
        if user.air_conditioner_count:
            raw_contributions.append(
                {
                    "key": "air_conditioner_adjustment",
                    "label": "空调保有量贡献",
                    "value": ac_delta,
                    "type": "adjustment",
                    "summary": (
                        f"家庭画像登记 {user.air_conditioner_count} 台空调，"
                        f"结合目标月温度后，对温敏负荷的附加影响为 {ac_delta:+.1f} kWh。"
                    ),
                }
            )
            assumptions.append(f"空调保有量按 {user.air_conditioner_count} 台计入温敏负荷。")
    else:
        ac_delta = 0.0
        if user.air_conditioner_count and user.air_conditioner_count >= 2 and target_month_num in SUMMER_MONTHS:
            seasonal_base = baseline_kwh + temperature_delta
            ac_delta = round(seasonal_base * 0.03, 2)
            raw_contributions.append(
                {
                    "key": "air_conditioner_adjustment",
                    "label": "空调保有量贡献",
                    "value": ac_delta,
                    "type": "adjustment",
                    "summary": (
                        f"未提供目标月温度时，当前按旧版夏季规则处理："
                        f"{user.air_conditioner_count} 台空调额外增加约 {ac_delta:+.1f} kWh。"
                    ),
                }
            )
            assumptions.append(f"由于目标月份位于夏季且家庭画像有 {user.air_conditioner_count} 台空调，保留旧版空调修正。")

    predicted_kwh = round(max(0.0, baseline_kwh + temperature_delta + holiday_delta + ac_delta), 2)
    predicted_bill = round(predicted_kwh * _estimate_price(usages), 2)

    contributions = [
        _build_contribution(
            key=item["key"],
            label=item["label"],
            value=float(item["value"]),
            predicted_kwh=predicted_kwh,
            contribution_type=item["type"],
            summary=item["summary"],
        )
        for item in raw_contributions
    ]

    spread = max(15.0, predicted_kwh * 0.12)
    lower_bound = round(max(0, predicted_kwh - spread), 2)
    upper_bound = round(predicted_kwh + spread, 2)

    return PredictionResult(
        target_month=target_month,
        predicted_kwh=predicted_kwh,
        predicted_bill=predicted_bill,
        lower_bound=lower_bound,
        upper_bound=upper_bound,
        baseline_kwh=baseline_kwh,
        context=context_payload,
        contributions=contributions,
        assumptions=assumptions,
        reasons=_build_reason_lines(
            baseline_kwh=baseline_kwh,
            recent_weighted=recent_weighted,
            recent_average_weighted=recent_average_weighted,
            same_period_weighted=same_period_weighted,
            temperature_label=temperature_label,
            temperature_delta=temperature_delta,
            holiday_delta=holiday_delta,
            ac_delta=ac_delta,
            same_period=same_period,
        ),
    )

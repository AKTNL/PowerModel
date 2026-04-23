from __future__ import annotations

from dataclasses import dataclass

from app.models import ChatRecord, LLMConfig, MonthlyUsage, PredictionRecord, UserProfile
from app.services.llm_client import LLMRuntimeConfig, LLMServiceError, call_openai_compatible


@dataclass
class InsightResult:
    reason_text: str
    advice_text: str
    mode: str
    llm_error: str | None = None


class ChatLLMUnavailableError(Exception):
    pass


def _to_runtime_config(config: LLMConfig) -> LLMRuntimeConfig:
    return LLMRuntimeConfig(
        provider=config.provider,
        base_url=config.base_url,
        api_key=config.api_key,
        model_name=config.model_name,
        temperature=config.temperature,
    )


def _format_profile(user: UserProfile) -> str:
    return (
        f"username={user.username}, family_size={user.family_size}, house_area={user.house_area}, "
        f"air_conditioner_count={user.air_conditioner_count}, water_heater_type={user.water_heater_type}, "
        f"cooking_type={user.cooking_type}"
    )


def _format_contributions(prediction: PredictionRecord) -> str:
    if not prediction.contributions:
        return "no_structured_contributions"

    lines: list[str] = []
    for item in prediction.contributions:
        kwh = float(item.get("kwh", 0))
        share_percent = item.get("share_percent")
        share_text = f", share={share_percent}%" if share_percent is not None else ""
        lines.append(
            f"- {item.get('label', item.get('key', 'item'))}: {kwh:+.1f} kWh"
            f", type={item.get('type', 'unknown')}{share_text}, summary={item.get('summary', '')}"
        )
    return "\n".join(lines)


def _format_assumptions(prediction: PredictionRecord) -> str:
    if not prediction.assumptions:
        return "no_assumptions"
    return "\n".join(f"- {item}" for item in prediction.assumptions)


def _format_prediction(prediction: PredictionRecord) -> str:
    context = prediction.context
    return (
        f"target_month={prediction.target_month}, predicted_kwh={prediction.predicted_kwh}, "
        f"predicted_bill={prediction.predicted_bill}, lower_bound={prediction.lower_bound}, "
        f"upper_bound={prediction.upper_bound}, baseline_kwh={prediction.baseline_kwh}, "
        f"context={context}\n"
        f"contributions:\n{_format_contributions(prediction)}\n"
        f"assumptions:\n{_format_assumptions(prediction)}"
    )


def _format_usage_history(usages: list[MonthlyUsage]) -> str:
    if not usages:
        return "no_usage_history"

    return "\n".join(
        f"{usage.usage_month}: {usage.power_kwh:.1f} kWh, bill={usage.bill_amount}, temp={usage.avg_temperature}, holidays={usage.holiday_count}"
        for usage in usages
    )


def _format_chat_history(chats: list[ChatRecord]) -> str:
    if not chats:
        return "no_chat_history"

    return "\n".join(
        f"Q: {chat.question}\nA: {chat.answer}"
        for chat in chats[-4:]
    )


def _extract_section(text: str, section: str) -> str | None:
    start_tag = f"[{section}]"
    end_tag = f"[/{section}]"
    if start_tag not in text or end_tag not in text:
        return None

    start_idx = text.index(start_tag) + len(start_tag)
    end_idx = text.index(end_tag)
    content = text[start_idx:end_idx].strip()
    return content or None


def _recent_usage_summary(usages: list[MonthlyUsage]) -> tuple[str, float | None]:
    if not usages:
        return "当前还没有历史用电记录。", None

    latest = usages[-1]
    recent_three = usages[-3:]
    average_three = sum(item.power_kwh for item in recent_three) / len(recent_three)
    trend = "最近几个月整体上升" if latest.power_kwh >= average_three else "最近几个月总体平稳"
    summary = (
        f"最近一个月是 {latest.usage_month}，用电量 {latest.power_kwh:.1f} kWh。"
        f"最近三个月平均约 {average_three:.1f} kWh，{trend}。"
    )
    return summary, average_three


def _build_rule_reason(prediction: PredictionRecord) -> str:
    if not prediction.contributions:
        return prediction.reason_text or "当前暂无详细原因分析。"

    base_items = [item for item in prediction.contributions if item.get("type") == "base"]
    adjustment_items = [
        item for item in prediction.contributions
        if item.get("type") == "adjustment" and abs(float(item.get("kwh", 0))) >= 0.01
    ]

    parts: list[str] = []
    if prediction.baseline_kwh is not None and base_items:
        base_text = "、".join(
            f"{item.get('label', '贡献项')}{float(item.get('kwh', 0)):+.1f} kWh"
            for item in base_items[:3]
        )
        parts.append(f"历史基线约 {prediction.baseline_kwh:.1f} kWh，主要由 {base_text} 构成。")

    if adjustment_items:
        adjustment_text = "、".join(
            f"{item.get('label', '修正项')}{float(item.get('kwh', 0)):+.1f} kWh"
            for item in adjustment_items[:3]
        )
        parts.append(f"在基线之上，{adjustment_text} 共同把预测推到 {prediction.predicted_kwh:.1f} kWh。")
    elif prediction.baseline_kwh is not None:
        delta = prediction.predicted_kwh - prediction.baseline_kwh
        parts.append(f"本次额外修正较小，最终预测值约为 {prediction.predicted_kwh:.1f} kWh，较历史基线变动 {delta:+.1f} kWh。")

    if prediction.assumptions:
        parts.append(f"当前预测假设：{prediction.assumptions[0]}")

    return "".join(parts) or prediction.reason_text or "当前暂无详细原因分析。"


def generate_rule_advice(user: UserProfile, prediction: PredictionRecord) -> str:
    advice: list[str] = []
    contribution_map = {
        str(item.get("key")): float(item.get("kwh", 0))
        for item in prediction.contributions
        if item.get("key") is not None
    }

    if contribution_map.get("air_conditioner_adjustment", 0) > 0:
        advice.append("本次结果里空调相关修正为正，建议优先优化空调时长、设定温度和夜间待机。")

    baseline_load = contribution_map.get("recent_month_weighted", 0) + contribution_map.get("recent_average_weighted", 0)
    if prediction.predicted_kwh and baseline_load / prediction.predicted_kwh >= 0.6:
        advice.append("近期高基线是主要来源，建议先排查长期运行设备、待机负荷和固定时段高耗电习惯。")

    if user.water_heater_type and "电" in user.water_heater_type:
        advice.append("电热水器尽量采用定时加热，避免全天保温待机。")

    if user.family_size and user.family_size >= 4:
        advice.append("洗衣、洗澡和做饭尽量集中安排，减少高功率设备反复启动。")

    if prediction.predicted_kwh >= 300:
        advice.append("预计下月用电偏高，建议优先检查空调、热水器和厨房设备的使用时长。")

    if not advice:
        advice.append("先记录一段时间的高耗电设备使用习惯，后续可以生成更细的个性化节电建议。")

    advice.append("待机设备在夜间统一断电，通常能带来稳定但容易被忽视的节电收益。")
    return "\n".join(f"{idx}. {item}" for idx, item in enumerate(advice, start=1))


def generate_prediction_insights(
    user: UserProfile,
    prediction: PredictionRecord,
    llm_config: LLMConfig | None,
) -> InsightResult:
    fallback_reason = _build_rule_reason(prediction)
    fallback_advice = generate_rule_advice(user, prediction)

    if not llm_config or not llm_config.enabled:
        return InsightResult(
            reason_text=fallback_reason,
            advice_text=fallback_advice,
            mode="rules",
        )

    messages = [
        {
            "role": "system",
            "content": (
                "你是家庭用电分析助手。"
                "你会收到结构化预测结果、贡献拆解和预测假设。"
                "必须只基于提供的数据解释，不得编造新的 kWh 数字、贡献项或结论。"
                "必须严格使用以下格式返回：[reason]...[/reason][advice]1. ...[/advice]"
            ),
        },
        {
            "role": "user",
            "content": (
                "家庭画像："
                f"{_format_profile(user)}\n"
                "预测结果："
                f"{_format_prediction(prediction)}\n"
                "请输出：\n"
                "1. 2 到 3 句原因分析，优先引用贡献项解释为什么下个月用电会变化。\n"
                "2. 3 条节电建议，每条都要可执行，不要空话。"
            ),
        },
    ]

    try:
        content = call_openai_compatible(_to_runtime_config(llm_config), messages)
    except LLMServiceError as exc:
        return InsightResult(
            reason_text=fallback_reason,
            advice_text=fallback_advice,
            mode="rules",
            llm_error=str(exc),
        )

    reason_text = _extract_section(content, "reason") or fallback_reason
    advice_text = _extract_section(content, "advice") or fallback_advice
    return InsightResult(
        reason_text=reason_text,
        advice_text=advice_text,
        mode="llm",
    )


def answer_question_with_rules(
    user: UserProfile,
    prediction: PredictionRecord | None,
    question: str,
    recent_usage: list[MonthlyUsage] | None,
) -> str:
    question_text = question.lower()
    recent_usage = recent_usage or []
    usage_summary, average_three = _recent_usage_summary(recent_usage)

    if prediction:
        baseline = (
            f"最近一次预测为 {prediction.target_month} 约 {prediction.predicted_kwh:.1f} kWh，"
            f"预计电费 {prediction.predicted_bill:.2f} 元。"
        )
    else:
        baseline = "当前还没有预测结果，建议先执行一次月度预测。"

    if any(keyword in question_text for keyword in ["为什么", "原因", "上涨", "增加", "变高"]):
        reason = _build_rule_reason(prediction) if prediction else "当前原因分析还不完整。"
        return f"{baseline}\n{usage_summary}\n主要原因：{reason}"

    if any(keyword in question_text for keyword in ["电费", "费用", "多少钱"]):
        if prediction:
            return (
                f"{baseline}\n"
                f"如果维持当前预测水平，下个月电费大致会落在 {prediction.predicted_bill:.2f} 元附近。"
            )
        return f"{baseline}\n你可以先录入历史账单数据，再生成更具体的费用分析。"

    if any(keyword in question_text for keyword in ["趋势", "最近", "历史"]):
        return f"{baseline}\n{usage_summary}"

    if "空调" in question_text:
        ac_count = user.air_conditioner_count or 0
        tip = "夏季每台空调每天少开 1 小时，通常都能明显降低月度用电。" if ac_count else "你还没有登记空调数量，建议先补充家庭画像。"
        return f"{baseline}\n你家登记了 {ac_count} 台空调。{tip}"

    if "热水器" in question_text:
        heater = user.water_heater_type or "未填写"
        return (
            f"{baseline}\n"
            f"当前热水器类型登记为：{heater}。如果是电热水器，优先考虑定时加热和减少全天保温。"
        )

    if any(keyword in question_text for keyword in ["建议", "省电", "节能", "怎么做"]):
        advice = prediction.advice_text if prediction and prediction.advice_text else "建议先生成节电建议。"
        return f"{baseline}\n推荐先从这几项开始：\n{advice}"

    if any(keyword in question_text for keyword in ["如果", "少开", "模拟"]):
        if prediction and average_three is not None:
            delta = prediction.predicted_kwh - average_three
            direction = "高于" if delta >= 0 else "低于"
            return (
                f"{baseline}\n"
                f"从最近三个月均值看，本次预测约 {direction} 常态水平 {abs(delta):.1f} kWh。"
                "如果你想问某个具体动作，例如空调少开 1 小时或热水器缩短时长，可以直接在问题里写出来。"
            )
        return f"{baseline}\n你可以结合下方情景模拟模块继续细化问题。"

    return (
        f"{baseline}\n{usage_summary}\n"
        "你可以继续问这些方向：为什么上涨、下个月电费多少、怎么省电、空调少开会怎样。"
    )


def answer_question(
    user: UserProfile,
    prediction: PredictionRecord | None,
    question: str,
    llm_config: LLMConfig | None,
    *,
    recent_usage: list[MonthlyUsage] | None = None,
    recent_chats: list[ChatRecord] | None = None,
) -> tuple[str, str, str | None]:
    recent_usage = recent_usage or []
    recent_chats = recent_chats or []

    if not llm_config or not llm_config.enabled:
        raise ChatLLMUnavailableError("智能问答需要先在“模型设置”中配置并启用大模型。")

    prediction_summary = _format_prediction(prediction) if prediction else "prediction=None"
    messages = [
        {
            "role": "system",
            "content": (
                "你是家庭用电智能问答助手。"
                "请基于已有预测结果、结构化贡献拆解、历史用电记录和家庭画像回答问题。"
                "回答要简洁、具体，优先给出可执行建议。"
                "如果信息不足，要明确指出还缺什么。"
                "不得编造新的贡献数字。"
            ),
        },
        {
            "role": "user",
            "content": (
                f"家庭画像：{_format_profile(user)}\n"
                f"最近预测：{prediction_summary}\n"
                f"最近用电记录：\n{_format_usage_history(recent_usage)}\n"
                f"最近问答上下文：\n{_format_chat_history(recent_chats)}\n"
                f"用户问题：{question}"
            ),
        },
    ]

    try:
        answer = call_openai_compatible(
            _to_runtime_config(llm_config),
            messages,
            max_tokens=650,
        )
    except LLMServiceError as exc:
        raise ChatLLMUnavailableError(f"大模型问答调用失败：{exc}") from exc

    answer = answer.strip()
    if not answer:
        raise ChatLLMUnavailableError("大模型返回了空内容，请检查模型配置或更换模型。")

    return answer, "llm", None


def _scenario_temperature(prediction: PredictionRecord) -> float:
    context = prediction.context
    if context.get("avg_temperature") is not None:
        return float(context["avg_temperature"])
    if context.get("reference_avg_temperature") is not None:
        return float(context["reference_avg_temperature"])

    target_month = prediction.target_month or ""
    try:
        month = int(target_month.split("-")[1])
    except (IndexError, ValueError):
        month = 7

    if month in {6, 7, 8, 9}:
        return 30.0
    if month in {12, 1, 2}:
        return 10.0
    return 22.0


def _scenario_contribution(label: str, kwh: float, summary: str) -> dict[str, float | str]:
    rounded = round(kwh, 2)
    return {
        "label": label,
        "kwh": rounded,
        "direction": "increase" if rounded >= 0 else "decrease",
        "summary": summary,
    }


def simulate_scenario(
    *,
    user: UserProfile,
    prediction: PredictionRecord,
    reduce_ac_hours_per_day: float,
    ac_setpoint_delta_c: float,
    reduce_water_heater_hours_per_day: float,
    away_days: int,
    water_heater_mode: str,
) -> dict[str, float | str | list[dict[str, float | str]]]:
    baseline_kwh = float(prediction.predicted_kwh)
    baseline_bill = float(prediction.predicted_bill or 0)
    price_per_kwh = (baseline_bill / baseline_kwh) if baseline_kwh else 0
    family_size = user.family_size or 3
    ac_count = user.air_conditioner_count or 0
    scenario_temperature = _scenario_temperature(prediction)

    contributions: list[dict[str, float | str]] = []

    if reduce_ac_hours_per_day > 0 and ac_count > 0:
        cooling_pressure = max(scenario_temperature - 26, 0)
        per_hour_per_ac = 0.9 + (0.25 * cooling_pressure)
        ac_runtime_delta = round(-(reduce_ac_hours_per_day * ac_count * per_hour_per_ac), 2)
        contributions.append(
            _scenario_contribution(
                "空调时长调整",
                ac_runtime_delta,
                f"按 {ac_count} 台空调、目标温度 {scenario_temperature:.1f}°C 估算，每天少开 {reduce_ac_hours_per_day:.1f} 小时。",
            )
        )

    if ac_setpoint_delta_c > 0 and ac_count > 0:
        cooling_pressure = max(scenario_temperature - 26, 0)
        per_degree_per_ac = 1.1 + (0.2 * cooling_pressure)
        ac_setpoint_delta = round(-(ac_setpoint_delta_c * ac_count * per_degree_per_ac), 2)
        contributions.append(
            _scenario_contribution(
                "空调设定温度调整",
                ac_setpoint_delta,
                f"假设空调设定温度上调 {ac_setpoint_delta_c:.1f}°C，在当前气温下可抵消一部分温敏负荷。",
            )
        )

    heater_type = user.water_heater_type or ""
    has_electric_heater = "电" in heater_type
    if has_electric_heater:
        heater_mode_saving_map = {
            "keep": 0.0,
            "timer": round(-(3.0 + family_size * 0.9), 2),
            "eco": round(-(5.0 + family_size * 1.2), 2),
        }
        heater_mode_delta = heater_mode_saving_map.get(water_heater_mode, 0.0)
        if heater_mode_delta != 0:
            contributions.append(
                _scenario_contribution(
                    "热水器模式切换",
                    heater_mode_delta,
                    f"把热水器模式切到 {water_heater_mode}，估算可减少保温和待机损耗。",
                )
            )

        if reduce_water_heater_hours_per_day > 0:
            heater_runtime_delta = round(-(reduce_water_heater_hours_per_day * 2.5), 2)
            contributions.append(
                _scenario_contribution(
                    "热水器时长调整",
                    heater_runtime_delta,
                    f"每天减少热水器使用 {reduce_water_heater_hours_per_day:.1f} 小时。",
                )
            )

    if away_days > 0:
        daily_load = baseline_kwh / 30 if baseline_kwh else 0
        away_factor = min(0.24 + (family_size * 0.04), 0.45)
        away_delta = round(-(away_days * daily_load * away_factor), 2)
        contributions.append(
            _scenario_contribution(
                "外出天数影响",
                away_delta,
                f"假设目标月外出 {away_days} 天，减少部分居家设备和舒适性负荷。",
            )
        )

    total_delta = round(sum(float(item["kwh"]) for item in contributions), 2)
    simulated_kwh = round(max(0, baseline_kwh + total_delta), 2)
    simulated_bill = round(simulated_kwh * price_per_kwh, 2)
    saved_kwh = round(max(0, baseline_kwh - simulated_kwh), 2)
    saved_bill = round(max(0, baseline_bill - simulated_bill), 2)

    if contributions:
        top_items = "、".join(f"{item['label']}{float(item['kwh']):+.1f} kWh" for item in contributions[:3])
        summary = (
            f"本次情景模拟基于 {prediction.target_month} 的已保存预测结果做反事实调整，"
            f"默认保持天气和节假日预测不变，只改变可控行为参数。主要变化来自：{top_items}。"
        )
    else:
        summary = "当前没有输入任何有效的情景调整参数，因此模拟结果与基线预测保持一致。"

    return {
        "baseline_kwh": round(baseline_kwh, 2),
        "baseline_bill": round(baseline_bill, 2),
        "simulated_kwh": simulated_kwh,
        "simulated_bill": simulated_bill,
        "saved_kwh": saved_kwh,
        "saved_bill": saved_bill,
        "scenario_contributions": contributions,
        "summary": summary,
    }

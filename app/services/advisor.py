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


def _format_prediction(prediction: PredictionRecord) -> str:
    return (
        f"target_month={prediction.target_month}, predicted_kwh={prediction.predicted_kwh}, "
        f"predicted_bill={prediction.predicted_bill}, lower_bound={prediction.lower_bound}, "
        f"upper_bound={prediction.upper_bound}, reason_text={prediction.reason_text}"
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


def generate_rule_advice(user: UserProfile, prediction: PredictionRecord) -> str:
    advice: list[str] = []

    if user.air_conditioner_count and user.air_conditioner_count > 0:
        advice.append("空调设定温度尽量保持在 26C 左右，并配合风扇使用，可降低夏季高峰负荷。")

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
    fallback_reason = prediction.reason_text or "当前暂无详细原因分析。"
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
                "请根据提供的家庭画像和预测结果，生成简明、具体、可执行的中文分析。"
                "必须严格使用以下格式返回："
                "[reason]...[/reason][advice]1. ...[/advice]"
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
                "1. 2 到 3 句原因分析，解释为什么下个月电量会变化。\n"
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
        reason = prediction.reason_text if prediction and prediction.reason_text else "当前原因分析还不完整。"
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
    fallback_answer = answer_question_with_rules(user, prediction, question, recent_usage)

    if not llm_config or not llm_config.enabled:
        return fallback_answer, "rules", None

    prediction_summary = _format_prediction(prediction) if prediction else "prediction=None"
    messages = [
        {
            "role": "system",
            "content": (
                "你是家庭用电智能问答助手。"
                "请基于已有预测结果、历史用电记录和家庭画像回答问题。"
                "回答要简洁、具体，优先给出可执行建议。"
                "如果信息不足，要明确指出还缺什么。"
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
        return fallback_answer, "rules", str(exc)

    return answer, "llm", None


def simulate_scenario(
    prediction: PredictionRecord,
    reduce_ac_hours_per_day: float,
    reduce_water_heater_hours_per_day: float,
) -> dict[str, float | str]:
    ac_saving = reduce_ac_hours_per_day * 4.5
    water_heater_saving = reduce_water_heater_hours_per_day * 2.5
    total_saving = round(ac_saving + water_heater_saving, 2)
    simulated_kwh = round(max(0, prediction.predicted_kwh - total_saving), 2)
    price_per_kwh = (prediction.predicted_bill / prediction.predicted_kwh) if prediction.predicted_kwh else 0
    simulated_bill = round(simulated_kwh * price_per_kwh, 2)

    return {
        "baseline_kwh": prediction.predicted_kwh,
        "baseline_bill": prediction.predicted_bill,
        "simulated_kwh": simulated_kwh,
        "simulated_bill": simulated_bill,
        "saved_kwh": total_saving,
        "summary": "当前情景模拟采用规则估算，适合演示交互流程，后续可替换成更细的设备级模型。",
    }

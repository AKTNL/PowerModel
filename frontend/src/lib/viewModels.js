import { createDraftRow, ensureDraftRows, formatNumber } from "./powerUtils.js";

export function toInputValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return `${value}`;
}

export function buildDraftRows(records) {
  return ensureDraftRows(
    records.map((record) =>
      createDraftRow({
        usage_month: record.usage_month || "",
        power_kwh: toInputValue(record.power_kwh),
        bill_amount: toInputValue(record.bill_amount),
        avg_temperature: toInputValue(record.avg_temperature),
        holiday_count: toInputValue(record.holiday_count)
      })
    )
  );
}

export function buildUsageSummary(records, partialCount) {
  if (!records.length) {
    return {
      latestMonth: "--",
      latestValue: "暂无数据",
      recentAverage: "--",
      recentNote: "暂无数据",
      peakMonth: "--",
      peakValue: "暂无数据",
      recordCount: "0",
      recordNote: partialCount ? `${partialCount} 行待补全` : "等待录入"
    };
  }

  const latest = records.at(-1);
  const recentThree = records.slice(-3);
  const recentAverage = recentThree.reduce((sum, item) => sum + Number(item.power_kwh), 0) / recentThree.length;
  const peak = [...records].sort((left, right) => Number(right.power_kwh) - Number(left.power_kwh))[0];

  return {
    latestMonth: latest.usage_month,
    latestValue: `${formatNumber(latest.power_kwh)} kWh`,
    recentAverage: `${formatNumber(recentAverage)} kWh`,
    recentNote: `最近 ${recentThree.length} 个月平均水平`,
    peakMonth: peak.usage_month,
    peakValue: `${formatNumber(peak.power_kwh)} kWh`,
    recordCount: `${records.length}`,
    recordNote: partialCount ? `${partialCount} 行待补全` : "草稿已完整"
  };
}

export function buildPredictionViewModel(prediction, meta, renderableRecords) {
  if (!prediction) {
    return {
      predictedBill: "--",
      predictionRange: "--",
      deltaText: "--",
      note: "尚未生成预测结果。"
    };
  }

  const latest = renderableRecords.at(-1);
  const delta = latest ? Number(prediction.predicted_kwh) - Number(latest.power_kwh) : null;
  const deltaPercent =
    delta !== null && Number(latest?.power_kwh)
      ? ` (${formatNumber((delta / Number(latest.power_kwh)) * 100)}%)`
      : "";

  let note = "预测结果已经生成，可以继续查看原因分析与节能建议。";
  if (meta?.llm_error) {
    note = "大模型解释失败，当前结果已回退到规则版文案。";
  } else if (meta?.generation_mode === "llm") {
    note = "当前解释和建议由用户配置的大模型生成。";
  } else if (meta?.generation_mode) {
    note = `当前结果的生成模式为 ${meta.generation_mode}。`;
  }

  return {
    predictedBill:
      prediction.predicted_bill !== null ? `${formatNumber(prediction.predicted_bill, 2)} 元` : "--",
    predictionRange: `${formatNumber(prediction.lower_bound, 2)} - ${formatNumber(prediction.upper_bound, 2)}`,
    deltaText: delta === null ? "--" : `${delta >= 0 ? "+" : ""}${formatNumber(delta)} kWh${deltaPercent}`,
    note
  };
}

export function buildOverviewData({
  userId,
  currentUsername,
  llmConfig,
  renderableRecords,
  partialCount,
  latestPrediction,
  latestPredictionMeta,
  chatHistory
}) {
  const latest = renderableRecords.at(-1);
  const recentThree = renderableRecords.slice(-3);
  const averageThree =
    recentThree.length > 0
      ? recentThree.reduce((sum, item) => sum + Number(item.power_kwh), 0) / recentThree.length
      : null;

  return {
    userName: currentUsername || "尚未创建",
    userDesc: currentUsername ? `当前绑定用户 ID：${userId}` : "先在“家庭画像”里创建一个家庭用户。",
    llmStatus: llmConfig?.enabled ? llmConfig.model_name : "未配置",
    llmDesc: llmConfig?.enabled ? `接口地址：${llmConfig.base_url}` : "可在“模型设置”里填写你自己的 API。",
    recordCount: `${renderableRecords.length}`,
    recordDesc: renderableRecords.length
      ? partialCount
        ? `另外还有 ${partialCount} 行草稿待补全`
        : "历史数据已经可以用于预测"
      : "还没有历史用电数据。",
    latestMonth: latest?.usage_month || "--",
    latestDesc: latest ? `${formatNumber(latest.power_kwh)} kWh` : "等待历史记录。",
    averageKwh: averageThree !== null ? `${formatNumber(averageThree)} kWh` : "--",
    averageDesc: averageThree !== null ? `最近 ${recentThree.length} 个月的平均水平` : "还无法计算。",
    predictionKwh: latestPrediction ? `${formatNumber(latestPrediction.predicted_kwh, 2)} kWh` : "--",
    predictionDesc: latestPrediction
      ? `${latestPrediction.target_month}，预计电费 ${formatNumber(latestPrediction.predicted_bill, 2)} 元`
      : "先运行一次预测。",
    generationMode: latestPredictionMeta?.generation_mode || (latestPrediction ? "saved" : "--"),
    generationDesc: latestPredictionMeta?.llm_error
      ? "本次解释已回退到规则生成。"
      : latestPredictionMeta?.generation_mode === "llm"
        ? "解释和建议来自大模型。"
        : latestPrediction
          ? "当前展示的是最近保存的预测结果。"
          : "等待预测结果。",
    chatCount: `${chatHistory.length}`,
    chatDesc: chatHistory.length ? `最近问题：${chatHistory.at(-1).question}` : "还没有问答记录。"
  };
}

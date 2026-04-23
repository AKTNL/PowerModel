import { createDraftRow, ensureDraftRows, formatNumber } from "./powerUtils.js";

const CONTEXT_SOURCE_LABELS = {
  same_month_last_year: "去年同月",
  recent_average: "近 6 月均值",
  seasonal_default: "季节默认值",
  calendar_default: "节奏默认值",
  seasonal_rule: "季节规则",
  not_provided: "未提供"
};

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

function buildContextComparisons(context) {
  if (!context || typeof context !== "object") {
    return [];
  }

  const comparisons = [];

  if (context.avg_temperature !== null && context.avg_temperature !== undefined) {
    const targetValue = Number(context.avg_temperature);
    const referenceValue =
      context.reference_avg_temperature === null || context.reference_avg_temperature === undefined
        ? null
        : Number(context.reference_avg_temperature);
    const deltaValue = referenceValue === null ? null : targetValue - referenceValue;
    const sourceText = CONTEXT_SOURCE_LABELS[context.temperature_source] || context.temperature_source || "--";

    comparisons.push({
      key: "avg_temperature",
      label: "平均温度",
      targetLabel: "目标值",
      targetText: `${formatNumber(targetValue, 1)}°C`,
      referenceLabel: "参考值",
      referenceText: referenceValue === null ? "--" : `${formatNumber(referenceValue, 1)}°C`,
      deltaLabel: "偏差",
      deltaText: deltaValue === null ? "--" : `${deltaValue >= 0 ? "+" : ""}${formatNumber(deltaValue, 1)}°C`,
      sourceText,
      summary:
        referenceValue === null
          ? "当前没有可用的温度参考值。"
          : `系统把 ${sourceText} 作为温度参考，再计算本次温度贡献。`
    });
  }

  if (context.holiday_count !== null && context.holiday_count !== undefined) {
    const targetValue = Number(context.holiday_count);
    const referenceValue =
      context.reference_holiday_count === null || context.reference_holiday_count === undefined
        ? null
        : Number(context.reference_holiday_count);
    const deltaValue = referenceValue === null ? null : targetValue - referenceValue;
    const sourceText = CONTEXT_SOURCE_LABELS[context.holiday_source] || context.holiday_source || "--";

    comparisons.push({
      key: "holiday_count",
      label: "节假日天数",
      targetLabel: "目标值",
      targetText: `${formatNumber(targetValue, 0)} 天`,
      referenceLabel: "参考值",
      referenceText: referenceValue === null ? "--" : `${formatNumber(referenceValue, 1)} 天`,
      deltaLabel: "偏差",
      deltaText: deltaValue === null ? "--" : `${deltaValue >= 0 ? "+" : ""}${formatNumber(deltaValue, 1)} 天`,
      sourceText,
      summary:
        referenceValue === null
          ? "当前没有可用的节假日参考值。"
          : `系统把 ${sourceText} 作为节假日参考，再计算本次节假日贡献。`
    });
  }

  return comparisons;
}

function buildWaterfallSteps(prediction, contributions) {
  if (!prediction) {
    return [];
  }

  const baselineValue =
    prediction.baseline_kwh !== null && prediction.baseline_kwh !== undefined
      ? Number(prediction.baseline_kwh)
      : contributions
          .filter((item) => item.type === "base")
          .reduce((sum, item) => sum + item.kwhValue, 0);
  const adjustmentItems = contributions.filter((item) => item.type === "adjustment");

  let runningTotal = baselineValue;
  const scaleCandidates = [Math.abs(baselineValue), Math.abs(Number(prediction.predicted_kwh) || 0)];

  adjustmentItems.forEach((item) => {
    runningTotal += item.kwhValue;
    scaleCandidates.push(Math.abs(item.kwhValue), Math.abs(runningTotal));
  });

  const scale = Math.max(...scaleCandidates, 1);
  const toWidth = (value) => `${Math.max(14, (Math.abs(value) / scale) * 100)}%`;

  const steps = [
    {
      key: "baseline",
      label: "历史基线",
      emphasis: `= ${formatNumber(baselineValue, 2)} kWh`,
      detail: "作为所有外生修正前的起点",
      toneClass: "is-total",
      barClass: "is-total",
      barWidth: toWidth(baselineValue)
    }
  ];

  runningTotal = baselineValue;
  adjustmentItems.forEach((item) => {
    runningTotal += item.kwhValue;
    steps.push({
      key: item.key,
      label: item.label,
      emphasis: item.formattedKwh,
      detail: `累计到 ${formatNumber(runningTotal, 2)} kWh`,
      toneClass: item.toneClass,
      barClass: item.kwhValue >= 0 ? "is-positive" : "is-negative",
      barWidth: toWidth(item.kwhValue)
    });
  });

  steps.push({
    key: "final",
    label: "最终预测",
    emphasis: `= ${formatNumber(prediction.predicted_kwh, 2)} kWh`,
    detail:
      prediction.predicted_bill !== null && prediction.predicted_bill !== undefined
        ? `对应电费约 ${formatNumber(prediction.predicted_bill, 2)} 元`
        : "当前没有可用的电费估计",
    toneClass: "is-total",
    barClass: "is-total",
    barWidth: toWidth(Number(prediction.predicted_kwh) || 0)
  });

  return steps;
}

export function buildPredictionViewModel(prediction, meta, renderableRecords) {
  if (!prediction) {
    return {
      predictedBill: "--",
      predictionRange: "--",
      deltaText: "--",
      baselineKwh: "--",
      dominantContributionLabel: "--",
      contributionCountText: "0 项贡献",
      contributions: [],
      assumptions: [],
      contextComparisons: [],
      waterfallSteps: [],
      hasContributions: false,
      note: "尚未生成预测结果。"
    };
  }

  const latest = renderableRecords.at(-1);
  const delta = latest ? Number(prediction.predicted_kwh) - Number(latest.power_kwh) : null;
  const deltaPercent =
    delta !== null && Number(latest?.power_kwh)
      ? ` (${formatNumber((delta / Number(latest.power_kwh)) * 100)}%)`
      : "";
  const contributions = Array.isArray(prediction.contributions)
    ? prediction.contributions.map((item) => {
        const kwhValue = Number(item.kwh) || 0;
        const shareValue = item.share_percent === null || item.share_percent === undefined ? null : Number(item.share_percent);
        return {
          ...item,
          kwhValue,
          formattedKwh: `${kwhValue >= 0 ? "+" : ""}${formatNumber(kwhValue, 2)} kWh`,
          formattedShare: shareValue === null ? "--" : `${shareValue >= 0 ? "+" : ""}${formatNumber(shareValue, 1)}%`,
          toneClass: kwhValue >= 0 ? "is-positive" : "is-negative",
          typeLabel: item.type === "adjustment" ? "修正项" : "基线项"
        };
      })
    : [];
  const dominantContribution = contributions.length
    ? [...contributions].sort((left, right) => Math.abs(right.kwhValue) - Math.abs(left.kwhValue))[0]
    : null;
  const assumptions = Array.isArray(prediction.assumptions) ? prediction.assumptions : [];
  const contextComparisons = buildContextComparisons(prediction.context);
  const waterfallSteps = buildWaterfallSteps(prediction, contributions);

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
    predictionRange: `${formatNumber(prediction.lower_bound, 2)} - ${formatNumber(prediction.upper_bound, 2)} kWh`,
    deltaText: delta === null ? "--" : `${delta >= 0 ? "+" : ""}${formatNumber(delta)} kWh${deltaPercent}`,
    baselineKwh:
      prediction.baseline_kwh !== null && prediction.baseline_kwh !== undefined
        ? `${formatNumber(prediction.baseline_kwh, 2)} kWh`
        : "--",
    dominantContributionLabel: dominantContribution
      ? `${dominantContribution.label} ${dominantContribution.formattedKwh}`
      : "--",
    contributionCountText: `${contributions.length} 项贡献`,
    contributions,
    assumptions,
    contextComparisons,
    waterfallSteps,
    hasContributions: contributions.length > 0,
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

export const NATIONAL_VIEW_KEYS = ["nationalOverview", "nationalReport", "nationalSources"];

export const EMPTY_NATIONAL_RUN = {
  history: [],
  forecast: [],
  stats: null,
  diagnostics: {},
  report: { draft: "", status: "local", status_message: "" },
  charts: { history: [], forecast: [], seasonality: [] },
  raw_records: [],
  source_label: ""
};

function getSharedLlmLabel(savedLlmConfig) {
  if (!savedLlmConfig?.enabled) {
    return "未配置";
  }

  return savedLlmConfig.model_name || savedLlmConfig.model || "未配置";
}

export function isNationalView(view) {
  return NATIONAL_VIEW_KEYS.includes(view);
}

export function buildNationalOverviewCards(stats) {
  return [
    { label: "历史样本数", value: stats ? String(stats.record_count) : "--" },
    { label: "最新月份", value: stats ? stats.latest_month : "--" },
    { label: "最新用电量", value: stats ? `${stats.latest_value.toFixed(1)} 亿千瓦时` : "--" },
    { label: "历史均值", value: stats ? `${stats.average_value.toFixed(1)} 亿千瓦时` : "--" }
  ];
}

export function buildNationalSupplementSeries(runResult) {
  const forecast = runResult?.forecast || [];
  if (!forecast.length) {
    return [];
  }

  const topMonths = [...forecast]
    .sort((a, b) => Number(b.forecast) - Number(a.forecast))
    .slice(0, 6)
    .sort((a, b) => `${a.date}`.localeCompare(`${b.date}`));

  return [
    {
      name: "高位预测月份",
      chart_type: "bar",
      color: "#f59e0b",
      x: topMonths.map((item) => item.date),
      y: topMonths.map((item) => Number(item.forecast))
    }
  ];
}

export function buildNationalSidebarCards({ runResult, savedLlmConfig, defaultDataset, uploadState }) {
  const summary = defaultDataset?.summary;
  return [
    { label: "国家模块", value: runResult.stats ? "已运行" : "待预测" },
    { label: "模型状态", value: getSharedLlmLabel(savedLlmConfig) },
    { label: "数据来源", value: runResult.source_label || uploadState.filename || summary?.history_end || "默认数据" }
  ];
}

export function buildNationalTopbarMeta({ savedLlmConfig, datasetSource }) {
  return [
    { label: "Module", value: "National" },
    { label: "LLM", value: getSharedLlmLabel(savedLlmConfig) },
    { label: "Dataset", value: datasetSource === "uploaded" ? "上传 CSV" : "官方数据" }
  ];
}

export function summarizeNationalRun(runResult) {
  if (!runResult?.stats) {
    return {
      latestValue: "--",
      latestMonth: "--",
      averageValue: "--",
      forecastRange: "--",
      reportStatus: "等待运行"
    };
  }

  const values = runResult.forecast.map((item) => item.forecast);
  const min = values.length ? Math.min(...values).toFixed(1) : "--";
  const max = values.length ? Math.max(...values).toFixed(1) : "--";

  return {
    latestValue: `${runResult.stats.latest_value.toFixed(1)} 亿千瓦时`,
    latestMonth: runResult.stats.latest_month,
    averageValue: `${runResult.stats.average_value.toFixed(1)} 亿千瓦时`,
    forecastRange: values.length ? `${min} - ${max} 亿千瓦时` : "--",
    reportStatus: runResult.report?.status_message || "本地规则报告"
  };
}

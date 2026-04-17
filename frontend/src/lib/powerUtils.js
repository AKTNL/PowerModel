export const MIN_DRAFT_ROWS = 4;

export const VIEW_META = {
  overview: {
    name: "项目总览",
    note: "查看当前家庭、模型配置、历史数据和预测状态的整体情况。"
  },
  profile: {
    name: "家庭画像",
    note: "创建家庭用户并维护基础画像信息，作为后续建议和分析的上下文。"
  },
  model: {
    name: "模型设置",
    note: "填写你自己的 OpenAI 兼容模型地址、API Key 和模型名称。"
  },
  usage: {
    name: "历史用电",
    note: "录入月度用电数据，支持手工表格、示例填充和 CSV 导入。"
  },
  prediction: {
    name: "预测与建议",
    note: "生成下个月用电预测、电费区间，并查看解释和节能建议。"
  },
  scenario: {
    name: "情景模拟",
    note: "模拟减少空调或热水器使用后的节电效果，辅助用户做决策。"
  },
  chat: {
    name: "智能问答",
    note: "左侧查看历史对话，右侧继续当前提问与回复。"
  }
};

export const NAV_ITEMS = [
  {
    key: "overview",
    icon: "OV",
    title: "项目总览",
    note: "查看系统当前状态"
  },
  {
    key: "profile",
    icon: "PF",
    title: "家庭画像",
    note: "创建和维护家庭信息"
  },
  {
    key: "model",
    icon: "AI",
    title: "模型设置",
    note: "接入你自己的大模型"
  },
  {
    key: "usage",
    icon: "DB",
    title: "历史用电",
    note: "录入和导入月度数据"
  },
  {
    key: "prediction",
    icon: "FC",
    title: "预测与建议",
    note: "生成预测和节能分析"
  },
  {
    key: "scenario",
    icon: "IF",
    title: "情景模拟",
    note: "比较不同用电习惯变化"
  },
  {
    key: "chat",
    icon: "QA",
    title: "智能问答",
    note: "向大模型直接发起提问"
  }
];

export const QUICK_QUESTIONS = [
  "为什么我下个月的用电量会增加？",
  "哪些家电最值得优先优化？",
  "最近几个月的趋势说明了什么？",
  "如果空调每天少开 1 小时，大概能省多少电？"
];

export function createDraftRow(overrides = {}) {
  return {
    usage_month: "",
    power_kwh: "",
    bill_amount: "",
    avg_temperature: "",
    holiday_count: "",
    ...overrides
  };
}

export function ensureDraftRows(rows, minRows = MIN_DRAFT_ROWS) {
  const draft = [...rows];
  while (draft.length < minRows) {
    draft.push(createDraftRow());
  }
  return draft;
}

export function sortRecords(records) {
  return [...records].sort((a, b) => `${a.usage_month}`.localeCompare(`${b.usage_month}`));
}

export function demoUsageRecords() {
  return [
    { usage_month: "2025-09", power_kwh: 176, bill_amount: 98.6, avg_temperature: 24, holiday_count: 3 },
    { usage_month: "2025-10", power_kwh: 188, bill_amount: 105.3, avg_temperature: 18, holiday_count: 3 },
    { usage_month: "2025-11", power_kwh: 201, bill_amount: 112.6, avg_temperature: 14, holiday_count: 2 },
    { usage_month: "2025-12", power_kwh: 235, bill_amount: 131.6, avg_temperature: 8, holiday_count: 2 },
    { usage_month: "2026-01", power_kwh: 246, bill_amount: 137.8, avg_temperature: 6, holiday_count: 5 },
    { usage_month: "2026-02", power_kwh: 219, bill_amount: 122.6, avg_temperature: 9, holiday_count: 4 },
    { usage_month: "2026-03", power_kwh: 228, bill_amount: 127.7, avg_temperature: 15, holiday_count: 1 }
  ];
}

export function analyzeDraftRows(rows, { strict = false } = {}) {
  const validRecords = [];
  let partialCount = 0;

  rows.forEach((row, index) => {
    const month = `${row.usage_month ?? ""}`.trim();
    const powerRaw = `${row.power_kwh ?? ""}`.trim();
    const billRaw = `${row.bill_amount ?? ""}`.trim();
    const tempRaw = `${row.avg_temperature ?? ""}`.trim();
    const holidayRaw = `${row.holiday_count ?? ""}`.trim();
    const anyFilled = [month, powerRaw, billRaw, tempRaw, holidayRaw].some(Boolean);

    if (!anyFilled) {
      return;
    }

    const power = Number(powerRaw);
    const bill = billRaw ? Number(billRaw) : null;
    const temp = tempRaw ? Number(tempRaw) : null;
    const holiday = holidayRaw ? Number(holidayRaw) : null;

    const hasRequired = Boolean(month) && Boolean(powerRaw);
    const numbersValid =
      Number.isFinite(power) &&
      power > 0 &&
      (!billRaw || Number.isFinite(bill)) &&
      (!tempRaw || Number.isFinite(temp)) &&
      (!holidayRaw || Number.isFinite(holiday));

    if (hasRequired && numbersValid) {
      validRecords.push({
        usage_month: month,
        power_kwh: power,
        bill_amount: bill,
        avg_temperature: temp,
        holiday_count: holiday
      });
      return;
    }

    partialCount += 1;
    if (strict) {
      throw new Error(`第 ${index + 1} 行数据不完整，请至少填写月份和用电量，并保证数字格式正确。`);
    }
  });

  return {
    validRecords: sortRecords(validRecords),
    partialCount
  };
}

export function parseCsvText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    throw new Error("CSV 文件为空。");
  }

  const delimiter = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
  const headerTokens = lines[0].split(delimiter).map((item) => item.trim().toLowerCase());
  const hasHeader = ["usage_month", "month", "月份"].includes(headerTokens[0]);
  const bodyLines = hasHeader ? lines.slice(1) : lines;

  return bodyLines.map((line, index) => {
    const parts = line.split(delimiter).map((item) => item.trim());
    if (parts.length < 2) {
      throw new Error(`CSV 第 ${index + 1} 行格式不正确，至少需要月份和用电量两列。`);
    }

    return createDraftRow({
      usage_month: parts[0] || "",
      power_kwh: parts[1] || "",
      bill_amount: parts[2] || "",
      avg_temperature: parts[3] || "",
      holiday_count: parts[4] || ""
    });
  });
}

export function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }
  return Number(value).toFixed(digits);
}

export function normalizeValue(value) {
  const trimmed = `${value ?? ""}`.trim();
  return trimmed === "" ? null : trimmed;
}

export function normalizeNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function downloadCsvTemplate() {
  const content = [
    "usage_month,power_kwh,bill_amount,avg_temperature,holiday_count",
    "2025-10,188,105.3,18,3",
    "2025-11,201,112.6,14,2",
    "2025-12,235,131.6,8,2"
  ].join("\n");

  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "household_power_template.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function getRenderableRecords(usageDraft, usageRecords) {
  const analysis = analyzeDraftRows(usageDraft);
  return analysis.validRecords.length ? analysis.validRecords : sortRecords(usageRecords);
}

export function formatDateTime(value) {
  if (!value) {
    return "";
  }
  return `${value}`.replace("T", " ").slice(0, 16);
}

const MIN_DRAFT_ROWS = 4;

const state = {
  currentView: localStorage.getItem("household_power_active_view") || "overview",
  userId: localStorage.getItem("household_power_user_id") || "",
  currentUsername: localStorage.getItem("household_power_username") || "",
  usageRecords: [],
  usageDraft: [],
  latestPrediction: null,
  latestPredictionMeta: null,
  llmConfig: null,
  chatHistory: [],
};

const $ = (selector) => document.querySelector(selector);

const elements = {
  currentUserId: $("#current-user-id"),
  llmStatusText: $("#llm-status-text"),
  llmPreview: $("#llm-preview"),
  sidebarNav: $("#sidebar-nav"),
  draftStatus: $("#draft-status"),
  csvFileInput: $("#csv-file-input"),
  usageTableBody: $("#usage-table-body"),
  usageCount: $("#usage-count"),
  usageList: $("#usage-list"),
  usageChart: $("#usage-chart"),
  summaryLatestMonth: $("#summary-latest-month"),
  summaryLatestValue: $("#summary-latest-value"),
  summaryRecentAverage: $("#summary-recent-average"),
  summaryRecentNote: $("#summary-recent-note"),
  summaryPeakMonth: $("#summary-peak-month"),
  summaryPeakValue: $("#summary-peak-value"),
  summaryRecordCount: $("#summary-record-count"),
  summaryRecordNote: $("#summary-record-note"),
  predictionMonthCard: $("#prediction-month-card"),
  predictedKwh: $("#predicted-kwh"),
  predictedBill: $("#predicted-bill"),
  predictionRange: $("#prediction-range"),
  predictionDelta: $("#prediction-delta"),
  predictionTargetMonth: $("#prediction-target-month"),
  predictionNote: $("#prediction-note"),
  generationMode: $("#generation-mode"),
  reasonText: $("#reason-text"),
  adviceText: $("#advice-text"),
  llmErrorBadge: $("#llm-error-badge"),
  scenarioResult: $("#scenario-result"),
  chatHistory: $("#chat-history"),
  toast: $("#toast"),
  baseUrl: $("#base-url"),
  modelName: $("#model-name"),
  apiKey: $("#api-key"),
  temperature: $("#temperature"),
  targetMonth: $("#target-month"),
  chatQuestion: $("#chat-question"),
  activeViewName: $("#active-view-name"),
  activeViewNote: $("#active-view-note"),
  overviewUserName: $("#overview-user-name"),
  overviewUserDesc: $("#overview-user-desc"),
  overviewLlmStatus: $("#overview-llm-status"),
  overviewLlmDesc: $("#overview-llm-desc"),
  overviewRecordCount: $("#overview-record-count"),
  overviewRecordDesc: $("#overview-record-desc"),
  overviewPredictionKwh: $("#overview-prediction-kwh"),
  overviewPredictionDesc: $("#overview-prediction-desc"),
  overviewLatestMonth: $("#overview-latest-month"),
  overviewLatestDesc: $("#overview-latest-desc"),
  overviewAverageKwh: $("#overview-average-kwh"),
  overviewAverageDesc: $("#overview-average-desc"),
  overviewGenerationMode: $("#overview-generation-mode"),
  overviewGenerationDesc: $("#overview-generation-desc"),
  overviewChatCount: $("#overview-chat-count"),
  overviewChatDesc: $("#overview-chat-desc"),
};

const viewMeta = {
  overview: { name: "项目总览", note: "先看当前用户、记录数和最近预测" },
  profile: { name: "家庭画像", note: "录入家庭规模、面积和家电信息" },
  model: { name: "模型设置", note: "接入自己的 OpenAI 兼容模型" },
  usage: { name: "历史用电", note: "表格录入、CSV 导入和趋势查看" },
  prediction: { name: "预测与建议", note: "输出电量、电费、区间和解释" },
  scenario: { name: "情景模拟", note: "验证空调和热水器时长变化影响" },
  chat: { name: "智能问答", note: "围绕最近预测继续提问" },
};

function showToast(message, tone = "info") {
  elements.toast.textContent = message;
  elements.toast.className = `toast visible ${tone}`;
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    elements.toast.className = "toast hidden";
  }, 2800);
}

function extractErrorMessage(payload) {
  if (Array.isArray(payload?.detail)) {
    return payload.detail.map((item) => item.msg || JSON.stringify(item)).join("; ");
  }
  return payload?.detail || payload?.message || "请求失败";
}

async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload));
  }

  return payload;
}

function normalizeValue(value) {
  const trimmed = `${value ?? ""}`.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function ensureUser() {
  if (!state.userId) {
    throw new Error("请先创建用户。");
  }
}

function setActiveView(viewName, persist = true) {
  const target = document.querySelector(`.module-view[data-view="${viewName}"]`);
  if (!target) {
    return;
  }

  state.currentView = viewName;
  if (persist) {
    localStorage.setItem("household_power_active_view", viewName);
  }

  document.querySelectorAll(".module-view").forEach((element) => {
    element.classList.toggle("is-active", element.dataset.view === viewName);
  });

  document.querySelectorAll(".sidebar-link").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewTarget === viewName);
  });

  const meta = viewMeta[viewName] || viewMeta.overview;
  elements.activeViewName.textContent = meta.name;
  elements.activeViewNote.textContent = meta.note;
}

function escapeHtml(value) {
  return `${value ?? ""}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }
  return Number(value).toFixed(digits);
}

function createDraftRow(overrides = {}) {
  return {
    usage_month: "",
    power_kwh: "",
    bill_amount: "",
    avg_temperature: "",
    holiday_count: "",
    ...overrides,
  };
}

function ensureDraftRows(minRows = MIN_DRAFT_ROWS) {
  while (state.usageDraft.length < minRows) {
    state.usageDraft.push(createDraftRow());
  }
}

function sortRecords(records) {
  return [...records].sort((a, b) => `${a.usage_month}`.localeCompare(`${b.usage_month}`));
}

function demoUsageRecords() {
  return [
    { usage_month: "2025-09", power_kwh: 176, bill_amount: 98.6, avg_temperature: 24, holiday_count: 3 },
    { usage_month: "2025-10", power_kwh: 188, bill_amount: 105.3, avg_temperature: 18, holiday_count: 3 },
    { usage_month: "2025-11", power_kwh: 201, bill_amount: 112.6, avg_temperature: 14, holiday_count: 2 },
    { usage_month: "2025-12", power_kwh: 235, bill_amount: 131.6, avg_temperature: 8, holiday_count: 2 },
    { usage_month: "2026-01", power_kwh: 246, bill_amount: 137.8, avg_temperature: 6, holiday_count: 5 },
    { usage_month: "2026-02", power_kwh: 219, bill_amount: 122.6, avg_temperature: 9, holiday_count: 4 },
    { usage_month: "2026-03", power_kwh: 228, bill_amount: 127.7, avg_temperature: 15, holiday_count: 1 },
  ];
}

function setDraftRecords(records) {
  state.usageDraft = records.map((record) =>
    createDraftRow({
      usage_month: record.usage_month || "",
      power_kwh: record.power_kwh ?? "",
      bill_amount: record.bill_amount ?? "",
      avg_temperature: record.avg_temperature ?? "",
      holiday_count: record.holiday_count ?? "",
    })
  );
  ensureDraftRows();
  renderUsageTable();
  renderUsageViews();
}

function analyzeDraftRows({ strict = false } = {}) {
  const validRecords = [];
  let partialCount = 0;

  state.usageDraft.forEach((row, index) => {
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
        holiday_count: holiday,
      });
      return;
    }

    partialCount += 1;
    if (strict) {
      throw new Error(`第 ${index + 1} 行需要填写有效的月份和用电量，其他列如填写也必须是数字。`);
    }
  });

  return {
    validRecords: sortRecords(validRecords),
    partialCount,
  };
}

function getRenderableRecords() {
  const analysis = analyzeDraftRows();
  return analysis.validRecords.length ? analysis.validRecords : sortRecords(state.usageRecords);
}

function renderUsageTable() {
  ensureDraftRows();
  elements.usageTableBody.innerHTML = state.usageDraft
    .map(
      (row, index) => `
        <tr data-index="${index}">
          <td><input type="month" data-field="usage_month" value="${escapeHtml(row.usage_month)}" /></td>
          <td><input type="number" min="0" step="0.1" data-field="power_kwh" value="${escapeHtml(row.power_kwh)}" placeholder="188" /></td>
          <td><input type="number" min="0" step="0.1" data-field="bill_amount" value="${escapeHtml(row.bill_amount)}" placeholder="105.3" /></td>
          <td><input type="number" step="0.1" data-field="avg_temperature" value="${escapeHtml(row.avg_temperature)}" placeholder="18" /></td>
          <td><input type="number" min="0" step="1" data-field="holiday_count" value="${escapeHtml(row.holiday_count)}" placeholder="3" /></td>
          <td><button type="button" class="table-action-button danger" data-action="delete-row">删除</button></td>
        </tr>
      `
    )
    .join("");
}

function renderUsageChart(records) {
  const svg = elements.usageChart;
  if (!records.length) {
    svg.innerHTML = `
      <rect x="0" y="0" width="640" height="240" rx="18" fill="rgba(255,255,255,0.02)"></rect>
      <text x="320" y="124" text-anchor="middle" fill="rgba(169,188,199,0.8)" font-size="16">录入有效数据后显示趋势图</text>
    `;
    return;
  }

  const values = records.map((item) => item.power_kwh);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const points = records.map((record, index) => {
    const x = 56 + (index * (640 - 112)) / Math.max(records.length - 1, 1);
    const y = 188 - ((record.power_kwh - minValue) / range) * 132;
    return { x, y, label: record.usage_month, value: record.power_kwh };
  });
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} 208 L ${points[0].x.toFixed(2)} 208 Z`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="usage-fill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="rgba(111,210,207,0.38)"></stop>
        <stop offset="100%" stop-color="rgba(111,210,207,0.02)"></stop>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="640" height="240" rx="18" fill="rgba(255,255,255,0.01)"></rect>
    <line x1="48" y1="32" x2="48" y2="208" stroke="rgba(169,188,199,0.16)"></line>
    <line x1="48" y1="208" x2="592" y2="208" stroke="rgba(169,188,199,0.16)"></line>
    <path d="${areaPath}" fill="url(#usage-fill)"></path>
    <path d="${linePath}" fill="none" stroke="#6fd2cf" stroke-width="3.5" stroke-linecap="round"></path>
    ${points
      .map(
        (point) => `
          <circle cx="${point.x}" cy="${point.y}" r="4.5" fill="#f2b66d"></circle>
          <text x="${point.x}" y="${point.y - 12}" text-anchor="middle" fill="#f2efe7" font-size="11">${point.value.toFixed(0)}</text>
          <text x="${point.x}" y="224" text-anchor="middle" fill="rgba(169,188,199,0.72)" font-size="11">${point.label}</text>
        `
      )
      .join("")}
  `;
}

function updateOverview() {
  const analysis = analyzeDraftRows();
  const records = getRenderableRecords();
  const latest = records.length ? records[records.length - 1] : null;
  const recentThree = records.slice(-3);
  const averageThree =
    recentThree.length > 0
      ? recentThree.reduce((sum, item) => sum + item.power_kwh, 0) / recentThree.length
      : null;
  const llmText = state.llmConfig?.enabled ? state.llmConfig.model_name || "已配置" : "未配置";

  elements.overviewUserName.textContent = state.currentUsername || "未创建";
  elements.overviewUserDesc.textContent = state.currentUsername
    ? `用户 ID：${state.userId}`
    : "先到“家庭画像”模块创建一个家庭用户。";

  elements.overviewLlmStatus.textContent = llmText;
  elements.overviewLlmDesc.textContent = state.llmConfig?.enabled
    ? `接口地址：${state.llmConfig.base_url}`
    : "可在“模型设置”模块填入自己的 API。";

  elements.overviewRecordCount.textContent = `${records.length}`;
  elements.overviewRecordDesc.textContent = records.length
    ? analysis.partialCount
      ? `另有 ${analysis.partialCount} 行草稿待补充`
      : "历史数据已经可以用于预测"
    : "还没有历史用电数据。";

  elements.overviewLatestMonth.textContent = latest?.usage_month || "--";
  elements.overviewLatestDesc.textContent = latest
    ? `${formatNumber(latest.power_kwh)} kWh`
    : "等待历史记录。";

  elements.overviewAverageKwh.textContent = averageThree !== null ? `${formatNumber(averageThree)} kWh` : "--";
  elements.overviewAverageDesc.textContent =
    averageThree !== null ? `最近 ${recentThree.length} 个月平均水平` : "还无法计算。";

  elements.overviewPredictionKwh.textContent = state.latestPrediction
    ? `${formatNumber(state.latestPrediction.predicted_kwh, 2)} kWh`
    : "--";
  elements.overviewPredictionDesc.textContent = state.latestPrediction
    ? `${state.latestPrediction.target_month}，电费约 ${formatNumber(state.latestPrediction.predicted_bill, 2)} 元`
    : "尚未生成预测结果。";

  const mode = state.latestPredictionMeta?.generation_mode || (state.latestPrediction ? "saved" : "--");
  elements.overviewGenerationMode.textContent = mode;
  elements.overviewGenerationDesc.textContent = state.latestPredictionMeta?.llm_error
    ? "模型调用失败，已回退到规则版。"
    : state.latestPrediction
      ? "最近结果的解释和建议来源。"
      : "预测完成后这里会显示来源。";

  elements.overviewChatCount.textContent = `${state.chatHistory.length}`;
  elements.overviewChatDesc.textContent = state.chatHistory.length
    ? `最近一条：${state.chatHistory[state.chatHistory.length - 1].question}`
    : "问答模块里会保留最近聊天记录。";
}

function renderUsageViews() {
  const analysis = analyzeDraftRows();
  const records = analysis.validRecords.length ? analysis.validRecords : sortRecords(state.usageRecords);

  elements.draftStatus.textContent = `草稿 ${state.usageDraft.length} 行，${analysis.validRecords.length} 行有效${
    analysis.partialCount ? `，${analysis.partialCount} 行待补充` : ""
  }`;

  if (!records.length) {
    elements.usageList.className = "usage-list empty-state";
    elements.usageList.textContent = "还没有有效数据。";
    elements.usageCount.textContent = "0 条记录";
    elements.summaryLatestMonth.textContent = "--";
    elements.summaryLatestValue.textContent = "暂无数据";
    elements.summaryRecentAverage.textContent = "--";
    elements.summaryRecentNote.textContent = "暂无数据";
    elements.summaryPeakMonth.textContent = "--";
    elements.summaryPeakValue.textContent = "暂无数据";
    elements.summaryRecordCount.textContent = "0";
    elements.summaryRecordNote.textContent = analysis.partialCount ? `${analysis.partialCount} 行待补充` : "等待录入";
    renderUsageChart([]);
    updateOverview();
    return;
  }

  const latest = records[records.length - 1];
  const recentThree = records.slice(-3);
  const recentAverage = recentThree.reduce((sum, item) => sum + item.power_kwh, 0) / recentThree.length;
  const peak = [...records].sort((a, b) => b.power_kwh - a.power_kwh)[0];

  elements.usageCount.textContent = `${records.length} 条有效记录`;
  elements.summaryLatestMonth.textContent = latest.usage_month;
  elements.summaryLatestValue.textContent = `${formatNumber(latest.power_kwh)} kWh`;
  elements.summaryRecentAverage.textContent = `${formatNumber(recentAverage)} kWh`;
  elements.summaryRecentNote.textContent = `最近 ${recentThree.length} 个月平均水平`;
  elements.summaryPeakMonth.textContent = peak.usage_month;
  elements.summaryPeakValue.textContent = `${formatNumber(peak.power_kwh)} kWh`;
  elements.summaryRecordCount.textContent = `${analysis.validRecords.length}`;
  elements.summaryRecordNote.textContent = analysis.partialCount ? `${analysis.partialCount} 行待补充` : "草稿完整";

  elements.usageList.className = "usage-list";
  elements.usageList.innerHTML = records
    .slice(-8)
    .reverse()
    .map(
      (record) => `
        <div class="usage-row">
          <strong>${escapeHtml(record.usage_month)}</strong>
          <span>${formatNumber(record.power_kwh)} kWh</span>
          <span>${record.bill_amount !== null ? `${formatNumber(record.bill_amount)} 元` : "--"}</span>
        </div>
      `
    )
    .join("");

  renderUsageChart(records);
  updateOverview();
}

function updateHeaderState() {
  elements.currentUserId.textContent = state.currentUsername || "未创建";
  elements.llmStatusText.textContent = state.llmConfig?.enabled
    ? state.llmConfig.model_name || "已配置"
    : "未配置";
}

function setPredictionResult(prediction, meta = null) {
  state.latestPrediction = prediction;
  state.latestPredictionMeta = meta;

  if (!prediction) {
    elements.predictionMonthCard.textContent = "--";
    elements.predictedKwh.textContent = "--";
    elements.predictedBill.textContent = "--";
    elements.predictionRange.textContent = "--";
    elements.predictionDelta.textContent = "--";
    elements.predictionTargetMonth.textContent = "目标月份 --";
    elements.generationMode.textContent = "--";
    elements.predictionNote.textContent = "尚未生成预测";
    elements.reasonText.className = "rich-text empty-state";
    elements.adviceText.className = "rich-text empty-state";
    elements.reasonText.textContent = "执行预测后会在这里显示原因分析。";
    elements.adviceText.textContent = "执行预测后会在这里显示节能建议。";
    elements.llmErrorBadge.classList.add("hidden");
    return;
  }

  const records = getRenderableRecords();
  const latest = records.length ? records[records.length - 1] : null;
  const delta = latest ? prediction.predicted_kwh - latest.power_kwh : null;
  const deltaText =
    delta === null
      ? "--"
      : `${delta >= 0 ? "+" : ""}${formatNumber(delta)} kWh${latest && latest.power_kwh ? ` (${formatNumber((delta / latest.power_kwh) * 100)}%)` : ""}`;

  elements.predictionMonthCard.textContent = prediction.target_month;
  elements.predictedKwh.textContent = `${formatNumber(prediction.predicted_kwh, 2)} kWh`;
  elements.predictedBill.textContent = prediction.predicted_bill !== null ? `${formatNumber(prediction.predicted_bill, 2)} 元` : "--";
  elements.predictionRange.textContent = `${formatNumber(prediction.lower_bound, 2)} - ${formatNumber(prediction.upper_bound, 2)}`;
  elements.predictionDelta.textContent = deltaText;
  elements.predictionTargetMonth.textContent = `目标月份 ${prediction.target_month}`;
  elements.generationMode.textContent = meta?.generation_mode || "saved";
  elements.reasonText.className = "rich-text";
  elements.adviceText.className = "rich-text";
  elements.reasonText.textContent = prediction.reason_text || "暂无原因分析。";
  elements.adviceText.textContent = prediction.advice_text || "暂无节电建议。";

  if (meta?.llm_error) {
    elements.llmErrorBadge.classList.remove("hidden");
    elements.predictionNote.textContent = "大模型调用失败，已回退到规则版建议";
  } else if (meta?.generation_mode === "llm") {
    elements.llmErrorBadge.classList.add("hidden");
    elements.predictionNote.textContent = "当前结果由用户配置的大模型生成解释和建议";
  } else if (meta?.generation_mode) {
    elements.llmErrorBadge.classList.add("hidden");
    elements.predictionNote.textContent = `当前结果来源：${meta.generation_mode}`;
  } else {
    elements.llmErrorBadge.classList.add("hidden");
    elements.predictionNote.textContent = "已加载最近预测结果";
  }
}

function renderChatHistory() {
  if (!state.chatHistory.length) {
    elements.chatHistory.className = "chat-history empty-state";
    elements.chatHistory.textContent = "还没有提问记录。";
    return;
  }

  elements.chatHistory.className = "chat-history";
  elements.chatHistory.innerHTML = state.chatHistory
    .slice()
    .reverse()
    .map(
      (item) => `
        <div class="chat-item">
          <div class="chat-meta">
            <span class="chat-role">Question</span>
            <span class="chat-mode">${escapeHtml(item.generation_mode || "saved")}${item.llm_error ? " / fallback" : ""}</span>
          </div>
          <div class="rich-text">${escapeHtml(item.question)}</div>
          <div class="chat-meta" style="margin-top: 12px;">
            <span class="chat-role">Answer</span>
            <span class="chat-mode">${item.created_at ? escapeHtml(item.created_at.replace("T", " ").slice(0, 16)) : ""}</span>
          </div>
          <div class="rich-text">${escapeHtml(item.answer)}</div>
        </div>
      `
    )
    .join("");
}

function resetScenarioPanel() {
  elements.scenarioResult.className = "rich-text empty-state";
  elements.scenarioResult.textContent = "运行模拟后会在这里显示节电效果。";
}

function resetForNewUser() {
  state.usageRecords = [];
  state.usageDraft = [];
  state.latestPrediction = null;
  state.latestPredictionMeta = null;
  state.llmConfig = null;
  state.chatHistory = [];
  ensureDraftRows();
  updateHeaderState();
  updateOverview();
  renderUsageTable();
  renderUsageViews();
  renderChatHistory();
  setPredictionResult(null);
  resetScenarioPanel();
  elements.llmPreview.className = "info-strip muted";
  elements.llmPreview.textContent = "尚未测试模型连接。";
}

function parseCsvText(text) {
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
      throw new Error(`CSV 第 ${index + 1} 行格式不正确。`);
    }
    return {
      usage_month: parts[0] || "",
      power_kwh: parts[1] || "",
      bill_amount: parts[2] || "",
      avg_temperature: parts[3] || "",
      holiday_count: parts[4] || "",
    };
  });
}

function downloadCsvTemplate() {
  const content = [
    "usage_month,power_kwh,bill_amount,avg_temperature,holiday_count",
    "2025-10,188,105.3,18,3",
    "2025-11,201,112.6,14,2",
    "2025-12,235,131.6,8,2",
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

async function loadUserProfile() {
  if (!state.userId) {
    return;
  }

  try {
    const response = await apiFetch(`/users/${state.userId}`);
    state.currentUsername = response.data.user.username || "";
    localStorage.setItem("household_power_username", state.currentUsername);
  } catch {
    state.userId = "";
    state.currentUsername = "";
    localStorage.removeItem("household_power_user_id");
    localStorage.removeItem("household_power_username");
  }

  updateHeaderState();
  updateOverview();
}

async function loadChatHistory() {
  if (!state.userId) {
    return;
  }

  try {
    const response = await apiFetch(`/chat/${state.userId}`);
    state.chatHistory = (response.data.records || []).map((record) => ({
      ...record,
      generation_mode: "saved",
      llm_error: null,
    }));
  } catch {
    state.chatHistory = [];
  }

  renderChatHistory();
  updateOverview();
}

async function createUser(event) {
  event.preventDefault();
  const response = await apiFetch("/users/create", {
    method: "POST",
    body: JSON.stringify({
      username: normalizeValue($("#username").value),
      family_size: normalizeNumber($("#family-size").value),
      house_area: normalizeNumber($("#house-area").value),
      air_conditioner_count: normalizeNumber($("#air-conditioner-count").value),
      water_heater_type: normalizeValue($("#water-heater-type").value),
      cooking_type: normalizeValue($("#cooking-type").value),
    }),
  });

  state.userId = String(response.data.user.id);
  state.currentUsername = response.data.user.username || "";
  localStorage.setItem("household_power_user_id", state.userId);
  localStorage.setItem("household_power_username", state.currentUsername);
  resetForNewUser();
  setActiveView("overview");
  showToast(`用户已创建：${state.currentUsername}`);
}

async function testLlmConfig() {
  const response = await apiFetch("/llm/test", {
    method: "POST",
    body: JSON.stringify({
      provider: $("#provider").value,
      base_url: normalizeValue(elements.baseUrl.value),
      api_key: normalizeValue(elements.apiKey.value),
      model_name: normalizeValue(elements.modelName.value),
      temperature: normalizeNumber(elements.temperature.value) ?? 0.3,
      enabled: true,
      prompt: "Reply with OK only.",
    }),
  });

  elements.llmPreview.className = "info-strip success";
  elements.llmPreview.textContent = `连接成功，返回预览：${response.data.preview}`;
  showToast("模型连接测试成功");
}

async function saveLlmConfig() {
  ensureUser();
  const response = await apiFetch("/llm/config", {
    method: "POST",
    body: JSON.stringify({
      user_id: Number(state.userId),
      provider: $("#provider").value,
      base_url: normalizeValue(elements.baseUrl.value),
      api_key: normalizeValue(elements.apiKey.value),
      model_name: normalizeValue(elements.modelName.value),
      temperature: normalizeNumber(elements.temperature.value) ?? 0.3,
      enabled: true,
    }),
  });

  state.llmConfig = response.data.config;
  updateHeaderState();
  updateOverview();
  elements.llmPreview.className = "info-strip success";
  elements.llmPreview.textContent = `已保存配置：${state.llmConfig.model_name} @ ${state.llmConfig.base_url}`;
  showToast("模型配置已保存");
}

async function loadLlmConfig() {
  if (!state.userId) {
    return;
  }

  try {
    const response = await apiFetch(`/llm/config/${state.userId}`);
    state.llmConfig = response.data.config;
    elements.baseUrl.value = state.llmConfig.base_url || "";
    elements.modelName.value = state.llmConfig.model_name || "";
    elements.temperature.value = state.llmConfig.temperature ?? 0.3;
    elements.apiKey.value = "";
    elements.llmPreview.className = "info-strip success";
    elements.llmPreview.textContent = `已加载模型配置：${state.llmConfig.model_name}，Key：${state.llmConfig.masked_api_key || "已保存"}`;
  } catch {
    state.llmConfig = null;
    elements.llmPreview.className = "info-strip muted";
    elements.llmPreview.textContent = "当前用户还没有保存模型配置。";
  }

  updateHeaderState();
  updateOverview();
}

async function clearLlmConfig() {
  ensureUser();
  await apiFetch(`/llm/config/${state.userId}`, { method: "DELETE" });
  state.llmConfig = null;
  elements.apiKey.value = "";
  elements.llmPreview.className = "info-strip muted";
  elements.llmPreview.textContent = "已清除当前用户的模型配置。";
  updateHeaderState();
  showToast("模型配置已清除");
}

async function refreshUsage() {
  ensureUser();
  const response = await apiFetch(`/usage/${state.userId}`);
  state.usageRecords = sortRecords(response.data.records || []);
  setDraftRecords(state.usageRecords);
}

async function uploadUsage() {
  ensureUser();
  const analysis = analyzeDraftRows({ strict: true });
  if (!analysis.validRecords.length) {
    throw new Error("请先录入至少一条有效的月度用电记录。");
  }

  await apiFetch("/usage/upload", {
    method: "POST",
    body: JSON.stringify({
      user_id: Number(state.userId),
      records: analysis.validRecords,
    }),
  });

  state.usageRecords = analysis.validRecords;
  showToast(`已上传 ${analysis.validRecords.length} 条记录`);
  renderUsageViews();
}

async function runPrediction() {
  ensureUser();
  const response = await apiFetch("/predict/monthly", {
    method: "POST",
    body: JSON.stringify({
      user_id: Number(state.userId),
      target_month: elements.targetMonth.value || null,
    }),
  });

  setPredictionResult(response.data.prediction, response.data);
  updateOverview();
  setActiveView("prediction");
  showToast(`已生成 ${response.data.prediction.target_month} 的预测结果`);
}

async function refreshLatestPrediction() {
  ensureUser();
  const response = await apiFetch(`/predict/${state.userId}`);
  setPredictionResult(response.data.prediction, {
    generation_mode: "saved",
    llm_error: null,
  });
  updateOverview();
}

async function regenerateAdvice() {
  ensureUser();
  if (!state.latestPrediction) {
    throw new Error("请先执行一次预测。");
  }

  const response = await apiFetch("/advice/generate", {
    method: "POST",
    body: JSON.stringify({ user_id: Number(state.userId) }),
  });

  state.latestPrediction.reason_text = response.data.reason_text;
  state.latestPrediction.advice_text = response.data.advice_text;
  setPredictionResult(state.latestPrediction, response.data);
  updateOverview();
  showToast("已重新生成建议");
}

async function simulateScenario() {
  ensureUser();
  const response = await apiFetch("/scenario/simulate", {
    method: "POST",
    body: JSON.stringify({
      user_id: Number(state.userId),
      reduce_ac_hours_per_day: normalizeNumber($("#reduce-ac-hours").value) ?? 0,
      reduce_water_heater_hours_per_day: normalizeNumber($("#reduce-water-hours").value) ?? 0,
    }),
  });

  const data = response.data;
  elements.scenarioResult.className = "rich-text";
  elements.scenarioResult.textContent =
    `基线用电：${formatNumber(data.baseline_kwh, 2)} kWh\n` +
    `模拟后用电：${formatNumber(data.simulated_kwh, 2)} kWh\n` +
    `预计节省：${formatNumber(data.saved_kwh, 2)} kWh\n` +
    `模拟后电费：${formatNumber(data.simulated_bill, 2)} 元\n\n${data.summary}`;
}

async function sendChat() {
  ensureUser();
  const question = normalizeValue(elements.chatQuestion.value);
  if (!question) {
    throw new Error("请输入问题。");
  }

  const response = await apiFetch("/chat", {
    method: "POST",
    body: JSON.stringify({
      user_id: Number(state.userId),
      question,
    }),
  });

  state.chatHistory.push({
    ...response.data.chat,
    generation_mode: response.data.generation_mode,
    llm_error: response.data.llm_error,
  });
  renderChatHistory();
  updateOverview();
  elements.chatQuestion.value = "";
  setActiveView("chat");

  if (response.data.llm_error) {
    showToast("模型调用失败，已自动回退到规则版回答", "error");
  }
}

function handleDraftInput(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const row = input.closest("tr");
  if (!row) {
    return;
  }

  const index = Number(row.dataset.index);
  const field = input.dataset.field;
  if (!Number.isInteger(index) || !field) {
    return;
  }

  state.usageDraft[index][field] = input.value;
  renderUsageViews();
}

function handleDraftActions(event) {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  if (button.dataset.action === "delete-row") {
    const row = button.closest("tr");
    if (!row) {
      return;
    }
    const index = Number(row.dataset.index);
    state.usageDraft.splice(index, 1);
    ensureDraftRows();
    renderUsageTable();
    renderUsageViews();
  }
}

async function importCsvFile(file) {
  const text = await file.text();
  const rows = parseCsvText(text);
  setDraftRecords(rows);
  showToast(`已导入 ${rows.length} 行 CSV 数据`);
}

function fillUserDemo() {
  $("#username").value = "demo_home";
  $("#family-size").value = "3";
  $("#house-area").value = "92";
  $("#air-conditioner-count").value = "2";
  $("#water-heater-type").value = "电热水器";
  $("#cooking-type").value = "电磁炉";
}

function fillUsageDemo() {
  setDraftRecords(demoUsageRecords());
}

function addUsageRow() {
  state.usageDraft.push(createDraftRow());
  renderUsageTable();
  renderUsageViews();
}

function bindNavigation() {
  document.body.addEventListener("click", (event) => {
    const target = event.target.closest("[data-view-target]");
    if (!target) {
      return;
    }
    setActiveView(target.dataset.viewTarget);
  });
}

function bindActions() {
  $("#user-form").addEventListener("submit", (event) =>
    createUser(event)
      .then(loadLlmConfig)
      .catch((error) => showToast(error.message, "error"))
  );

  $("#fill-user-demo").addEventListener("click", fillUserDemo);
  $("#fill-usage-demo").addEventListener("click", fillUsageDemo);
  $("#add-usage-row").addEventListener("click", addUsageRow);
  $("#import-csv").addEventListener("click", () => elements.csvFileInput.click());
  $("#download-template").addEventListener("click", downloadCsvTemplate);
  $("#upload-usage").addEventListener("click", () => uploadUsage().catch((error) => showToast(error.message, "error")));
  $("#refresh-usage").addEventListener("click", () => refreshUsage().catch((error) => showToast(error.message, "error")));
  $("#run-prediction").addEventListener("click", () => runPrediction().catch((error) => showToast(error.message, "error")));
  $("#refresh-prediction").addEventListener("click", () => refreshLatestPrediction().catch((error) => showToast(error.message, "error")));
  $("#regenerate-advice").addEventListener("click", () => regenerateAdvice().catch((error) => showToast(error.message, "error")));
  $("#simulate-scenario").addEventListener("click", () => simulateScenario().catch((error) => showToast(error.message, "error")));
  $("#send-chat").addEventListener("click", () => sendChat().catch((error) => showToast(error.message, "error")));

  $("#test-llm").addEventListener("click", () =>
    testLlmConfig().catch((error) => {
      elements.llmPreview.className = "info-strip error";
      elements.llmPreview.textContent = error.message;
      showToast(error.message, "error");
    })
  );

  $("#save-llm").addEventListener("click", () => saveLlmConfig().catch((error) => showToast(error.message, "error")));
  $("#clear-llm").addEventListener("click", () => clearLlmConfig().catch((error) => showToast(error.message, "error")));

  elements.usageTableBody.addEventListener("input", handleDraftInput);
  elements.usageTableBody.addEventListener("click", handleDraftActions);

  elements.csvFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      await importCsvFile(file);
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      event.target.value = "";
    }
  });

  elements.chatQuestion.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendChat().catch((error) => showToast(error.message, "error"));
    }
  });

  $("#quick-questions").addEventListener("click", (event) => {
    const button = event.target.closest("[data-question]");
    if (!button) {
      return;
    }
    elements.chatQuestion.value = button.dataset.question || "";
    sendChat().catch((error) => showToast(error.message, "error"));
  });
}

async function hydrate() {
  ensureDraftRows();
  updateHeaderState();
  renderUsageTable();
  renderUsageViews();
  renderChatHistory();
  setPredictionResult(null);
  resetScenarioPanel();
  setActiveView(state.currentView, false);

  if (!state.userId) {
    return;
  }

  await loadUserProfile();
  await loadLlmConfig();
  await loadChatHistory();

  try {
    await refreshUsage();
  } catch {
    state.usageRecords = [];
    renderUsageViews();
  }

  try {
    await refreshLatestPrediction();
  } catch {
    // ignore missing prediction
  }
}

bindNavigation();
bindActions();
hydrate().catch((error) => showToast(error.message, "error"));

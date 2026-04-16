import { startTransition, useEffect, useRef, useState } from "react";

import Sidebar from "./components/Sidebar.jsx";
import Toast from "./components/Toast.jsx";
import Topbar from "./components/Topbar.jsx";
import { requestJson } from "./lib/api.js";
import {
  VIEW_META,
  analyzeDraftRows,
  createDraftRow,
  demoUsageRecords,
  downloadCsvTemplate,
  ensureDraftRows,
  formatNumber,
  getRenderableRecords,
  normalizeNumber,
  normalizeValue,
  parseCsvText
} from "./lib/powerUtils.js";
import ChatHistoryView from "./views/ChatHistoryView.jsx";
import ChatView from "./views/ChatView.jsx";
import ModelConfigView from "./views/ModelConfigView.jsx";
import OverviewView from "./views/OverviewView.jsx";
import PredictionView from "./views/PredictionView.jsx";
import ProfileView from "./views/ProfileView.jsx";
import ScenarioView from "./views/ScenarioView.jsx";
import UsageView from "./views/UsageView.jsx";

const STORAGE_KEYS = {
  activeView: "household_power_active_view",
  userId: "household_power_user_id",
  username: "household_power_username"
};

const DEFAULT_PROFILE_FORM = {
  username: "",
  family_size: "",
  house_area: "",
  air_conditioner_count: "",
  water_heater_type: "",
  cooking_type: ""
};

const DEFAULT_MODEL_FORM = {
  provider: "openai-compatible",
  base_url: "",
  api_key: "",
  model_name: "",
  temperature: "0.3"
};

const DEFAULT_SCENARIO_FORM = {
  reduce_ac_hours_per_day: "",
  reduce_water_heater_hours_per_day: ""
};

const DEFAULT_LLM_PREVIEW = {
  tone: "muted",
  text: "尚未测试模型连接。"
};

const DEFAULT_SCENARIO_RESULT = {
  empty: true,
  text: "运行模拟后会在这里显示节电效果。"
};

function toInputValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return `${value}`;
}

function buildDraftRows(records) {
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

function buildUsageSummary(records, partialCount) {
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
  const peak = [...records].sort((a, b) => Number(b.power_kwh) - Number(a.power_kwh))[0];

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

function buildPredictionViewModel(prediction, meta, renderableRecords) {
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
    predictedBill: prediction.predicted_bill !== null ? `${formatNumber(prediction.predicted_bill, 2)} 元` : "--",
    predictionRange: `${formatNumber(prediction.lower_bound, 2)} - ${formatNumber(prediction.upper_bound, 2)}`,
    deltaText: delta === null ? "--" : `${delta >= 0 ? "+" : ""}${formatNumber(delta)} kWh${deltaPercent}`,
    note
  };
}

function buildOverviewData({
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

export default function App() {
  const [currentView, setCurrentView] = useState(localStorage.getItem(STORAGE_KEYS.activeView) || "overview");
  const [userId, setUserId] = useState(localStorage.getItem(STORAGE_KEYS.userId) || "");
  const [currentUsername, setCurrentUsername] = useState(localStorage.getItem(STORAGE_KEYS.username) || "");
  const [profileForm, setProfileForm] = useState(DEFAULT_PROFILE_FORM);
  const [modelForm, setModelForm] = useState(DEFAULT_MODEL_FORM);
  const [usageRecords, setUsageRecords] = useState([]);
  const [usageDraft, setUsageDraft] = useState(() => ensureDraftRows([]));
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [latestPredictionMeta, setLatestPredictionMeta] = useState(null);
  const [targetMonth, setTargetMonth] = useState("");
  const [llmConfig, setLlmConfig] = useState(null);
  const [llmPreview, setLlmPreview] = useState(DEFAULT_LLM_PREVIEW);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatError, setChatError] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [pendingChatQuestion, setPendingChatQuestion] = useState("");
  const [scenarioForm, setScenarioForm] = useState(DEFAULT_SCENARIO_FORM);
  const [scenarioResult, setScenarioResult] = useState(DEFAULT_SCENARIO_RESULT);
  const [toast, setToast] = useState({ visible: false, tone: "info", message: "" });

  const toastTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  const usageAnalysis = analyzeDraftRows(usageDraft);
  const renderableRecords = getRenderableRecords(usageDraft, usageRecords);
  const usageSummary = buildUsageSummary(renderableRecords, usageAnalysis.partialCount);
  const predictionViewModel = buildPredictionViewModel(latestPrediction, latestPredictionMeta, renderableRecords);
  const overview = buildOverviewData({
    userId,
    currentUsername,
    llmConfig,
    renderableRecords,
    partialCount: usageAnalysis.partialCount,
    latestPrediction,
    latestPredictionMeta,
    chatHistory
  });
  const draftStatus = `草稿 ${usageDraft.length} 行，${usageAnalysis.validRecords.length} 行有效${
    usageAnalysis.partialCount ? `，${usageAnalysis.partialCount} 行待补全` : ""
  }`;
  const latestChat = chatHistory.at(-1) || null;

  function showToast(message, tone = "info") {
    setToast({ visible: true, tone, message });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, visible: false }));
    }, 2800);
  }

  function navigate(view) {
    startTransition(() => {
      setCurrentView(view);
    });
  }

  function requireUserId() {
    if (!userId) {
      throw new Error("请先创建一个家庭用户。");
    }
    return Number(userId);
  }

  function resetUserBoundState() {
    setUsageRecords([]);
    setUsageDraft(ensureDraftRows([]));
    setLatestPrediction(null);
    setLatestPredictionMeta(null);
    setLlmConfig(null);
    setLlmPreview(DEFAULT_LLM_PREVIEW);
    setChatHistory([]);
    setChatQuestion("");
    setChatError("");
    setIsChatLoading(false);
    setPendingChatQuestion("");
    setScenarioForm(DEFAULT_SCENARIO_FORM);
    setScenarioResult(DEFAULT_SCENARIO_RESULT);
    setTargetMonth("");
    setModelForm(DEFAULT_MODEL_FORM);
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.activeView, currentView);
  }, [currentView]);

  useEffect(() => {
    if (userId) {
      localStorage.setItem(STORAGE_KEYS.userId, userId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.userId);
    }
  }, [userId]);

  useEffect(() => {
    if (currentUsername) {
      localStorage.setItem(STORAGE_KEYS.username, currentUsername);
    } else {
      localStorage.removeItem(STORAGE_KEYS.username);
    }
  }, [currentUsername]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateExistingUser() {
      if (!userId) {
        return;
      }

      try {
        const userResponse = await requestJson(`/users/${userId}`);
        if (cancelled) {
          return;
        }

        const user = userResponse.data.user;
        setCurrentUsername(user.username || "");
        setProfileForm({
          username: user.username || "",
          family_size: toInputValue(user.family_size),
          house_area: toInputValue(user.house_area),
          air_conditioner_count: toInputValue(user.air_conditioner_count),
          water_heater_type: user.water_heater_type || "",
          cooking_type: user.cooking_type || ""
        });
      } catch {
        if (!cancelled) {
          setUserId("");
          setCurrentUsername("");
          resetUserBoundState();
        }
        return;
      }

      try {
        const llmResponse = await requestJson(`/llm/config/${userId}`);
        if (!cancelled) {
          const config = llmResponse.data.config;
          setLlmConfig(config);
          setModelForm({
            provider: config.provider || "openai-compatible",
            base_url: config.base_url || "",
            api_key: "",
            model_name: config.model_name || "",
            temperature: toInputValue(config.temperature ?? 0.3)
          });
          setLlmPreview({
            tone: "success",
            text: `已加载模型配置：${config.model_name}，Key：${config.masked_api_key || "已保存"}`
          });
        }
      } catch {
        if (!cancelled) {
          setLlmConfig(null);
          setModelForm(DEFAULT_MODEL_FORM);
          setLlmPreview({
            tone: "muted",
            text: "当前用户还没有保存模型配置。"
          });
        }
      }

      try {
        const usageResponse = await requestJson(`/usage/${userId}`);
        if (!cancelled) {
          const records = usageResponse.data.records || [];
          setUsageRecords(records);
          setUsageDraft(buildDraftRows(records));
        }
      } catch {
        if (!cancelled) {
          setUsageRecords([]);
          setUsageDraft(ensureDraftRows([]));
        }
      }

      try {
        const predictionResponse = await requestJson(`/predict/${userId}`);
        if (!cancelled) {
          setLatestPrediction(predictionResponse.data.prediction);
          setLatestPredictionMeta({ generation_mode: "saved", llm_error: null });
        }
      } catch {
        if (!cancelled) {
          setLatestPrediction(null);
          setLatestPredictionMeta(null);
        }
      }

      try {
        const chatResponse = await requestJson(`/chat/${userId}`);
        if (!cancelled) {
          setChatHistory(
            (chatResponse.data.records || []).map((record) => ({
              ...record,
              generation_mode: "saved",
              llm_error: null
            }))
          );
          setChatError("");
        }
      } catch {
        if (!cancelled) {
          setChatHistory([]);
          setChatError("");
        }
      }
    }

    hydrateExistingUser().catch((error) => {
      if (!cancelled) {
        showToast(error.message, "error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  function handleProfileChange(event) {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  }

  function handleModelChange(event) {
    const { name, value } = event.target;
    setModelForm((current) => ({ ...current, [name]: value }));
  }

  function handleScenarioChange(event) {
    const { name, value } = event.target;
    setScenarioForm((current) => ({ ...current, [name]: value }));
  }

  function handleUsageChange(index, field, value) {
    setUsageDraft((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
    );
  }

  function handleFillUserDemo() {
    setProfileForm({
      username: "demo_home",
      family_size: "3",
      house_area: "92",
      air_conditioner_count: "2",
      water_heater_type: "电热水器",
      cooking_type: "电磁炉"
    });
  }

  async function handleCreateUser(event) {
    event.preventDefault();

    const response = await requestJson("/users/create", {
      method: "POST",
      body: JSON.stringify({
        username: normalizeValue(profileForm.username),
        family_size: normalizeNumber(profileForm.family_size),
        house_area: normalizeNumber(profileForm.house_area),
        air_conditioner_count: normalizeNumber(profileForm.air_conditioner_count),
        water_heater_type: normalizeValue(profileForm.water_heater_type),
        cooking_type: normalizeValue(profileForm.cooking_type)
      })
    });

    const user = response.data.user;
    resetUserBoundState();
    setUserId(`${user.id}`);
    setCurrentUsername(user.username || "");
    setProfileForm({
      username: user.username || "",
      family_size: toInputValue(user.family_size),
      house_area: toInputValue(user.house_area),
      air_conditioner_count: toInputValue(user.air_conditioner_count),
      water_heater_type: user.water_heater_type || "",
      cooking_type: user.cooking_type || ""
    });
    navigate("usage");
    showToast(`已创建用户 ${user.username}`);
  }

  async function handleTestLlm() {
    const response = await requestJson("/llm/test", {
      method: "POST",
      body: JSON.stringify({
        provider: modelForm.provider,
        base_url: normalizeValue(modelForm.base_url),
        api_key: normalizeValue(modelForm.api_key),
        model_name: normalizeValue(modelForm.model_name),
        temperature: normalizeNumber(modelForm.temperature) ?? 0.3,
        enabled: true,
        prompt: "Reply with OK only."
      })
    });

    setLlmPreview({
      tone: "success",
      text: `连接成功，返回预览：${response.data.preview}`
    });
    showToast("模型连接测试成功");
  }

  async function handleSaveLlm() {
    const numericUserId = requireUserId();
    const response = await requestJson("/llm/config", {
      method: "POST",
      body: JSON.stringify({
        user_id: numericUserId,
        provider: modelForm.provider,
        base_url: normalizeValue(modelForm.base_url),
        api_key: normalizeValue(modelForm.api_key),
        model_name: normalizeValue(modelForm.model_name),
        temperature: normalizeNumber(modelForm.temperature) ?? 0.3,
        enabled: true
      })
    });

    const config = response.data.config;
    setLlmConfig(config);
    setModelForm((current) => ({ ...current, api_key: "" }));
    setLlmPreview({
      tone: "success",
      text: `已保存配置：${config.model_name} @ ${config.base_url}`
    });
    setChatError("");
    showToast("模型配置已保存");
  }

  async function handleClearLlm() {
    const numericUserId = requireUserId();
    await requestJson(`/llm/config/${numericUserId}`, { method: "DELETE" });
    setLlmConfig(null);
    setModelForm(DEFAULT_MODEL_FORM);
    setLlmPreview({
      tone: "muted",
      text: "已清除当前用户的模型配置。"
    });
    setChatError("");
    showToast("模型配置已清除");
  }

  async function handleRefreshUsage() {
    const numericUserId = requireUserId();
    const response = await requestJson(`/usage/${numericUserId}`);
    const records = response.data.records || [];
    setUsageRecords(records);
    setUsageDraft(buildDraftRows(records));
    showToast(`已加载 ${records.length} 条记录`);
  }

  async function handleUploadUsage() {
    const numericUserId = requireUserId();
    const analysis = analyzeDraftRows(usageDraft, { strict: true });

    if (!analysis.validRecords.length) {
      throw new Error("请先录入至少一条有效的月度用电记录。");
    }

    await requestJson("/usage/upload", {
      method: "POST",
      body: JSON.stringify({
        user_id: numericUserId,
        records: analysis.validRecords
      })
    });

    setUsageRecords(analysis.validRecords);
    setUsageDraft(buildDraftRows(analysis.validRecords));
    showToast(`已上传 ${analysis.validRecords.length} 条记录`);
  }

  function handleFillUsageDemo() {
    setUsageDraft(buildDraftRows(demoUsageRecords()));
  }

  function handleAddUsageRow() {
    setUsageDraft((current) => [...current, createDraftRow()]);
  }

  function handleDeleteUsageRow(index) {
    setUsageDraft((current) => ensureDraftRows(current.filter((_, rowIndex) => rowIndex !== index)));
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const rows = parseCsvText(text);
      setUsageDraft(ensureDraftRows(rows));
      showToast(`已导入 ${rows.length} 条 CSV 草稿`);
    } finally {
      event.target.value = "";
    }
  }

  async function handleRunPrediction() {
    const numericUserId = requireUserId();
    const response = await requestJson("/predict/monthly", {
      method: "POST",
      body: JSON.stringify({
        user_id: numericUserId,
        target_month: targetMonth || null
      })
    });

    setLatestPrediction(response.data.prediction);
    setLatestPredictionMeta({
      generation_mode: response.data.generation_mode,
      llm_error: response.data.llm_error
    });
    navigate("prediction");
    showToast(`已生成 ${response.data.prediction.target_month} 的预测结果`);
  }

  async function handleRefreshPrediction() {
    const numericUserId = requireUserId();
    const response = await requestJson(`/predict/${numericUserId}`);
    setLatestPrediction(response.data.prediction);
    setLatestPredictionMeta({ generation_mode: "saved", llm_error: null });
    showToast("已刷新最近一次预测结果");
  }

  async function handleRegenerateAdvice() {
    const numericUserId = requireUserId();
    if (!latestPrediction) {
      throw new Error("请先执行一次预测。");
    }

    const response = await requestJson("/advice/generate", {
      method: "POST",
      body: JSON.stringify({ user_id: numericUserId })
    });

    setLatestPrediction((current) =>
      current
        ? {
            ...current,
            reason_text: response.data.reason_text,
            advice_text: response.data.advice_text
          }
        : current
    );
    setLatestPredictionMeta({
      generation_mode: response.data.generation_mode,
      llm_error: response.data.llm_error
    });
    showToast("已重新生成解释与建议");
  }

  async function handleSimulateScenario() {
    const numericUserId = requireUserId();
    const response = await requestJson("/scenario/simulate", {
      method: "POST",
      body: JSON.stringify({
        user_id: numericUserId,
        reduce_ac_hours_per_day: normalizeNumber(scenarioForm.reduce_ac_hours_per_day) ?? 0,
        reduce_water_heater_hours_per_day: normalizeNumber(scenarioForm.reduce_water_heater_hours_per_day) ?? 0
      })
    });

    const data = response.data;
    setScenarioResult({
      empty: false,
      text:
        `基线用电量：${formatNumber(data.baseline_kwh, 2)} kWh\n` +
        `模拟后用电量：${formatNumber(data.simulated_kwh, 2)} kWh\n` +
        `预计节省电量：${formatNumber(data.saved_kwh, 2)} kWh\n` +
        `模拟后电费：${formatNumber(data.simulated_bill, 2)} 元\n\n${data.summary}`
    });
  }

  async function handleSendChat(questionOverride = null) {
    const numericUserId = requireUserId();
    const question = normalizeValue(questionOverride ?? chatQuestion);

    if (!question) {
      throw new Error("请先输入你的问题。");
    }

    if (!llmConfig?.enabled) {
      throw new Error("请先在“模型设置”中配置并启用大模型，再使用智能问答。");
    }

    setChatError("");
    setPendingChatQuestion(question);
    setIsChatLoading(true);
    navigate("chat");

    try {
      const response = await requestJson("/chat", {
        method: "POST",
        body: JSON.stringify({
          user_id: numericUserId,
          question
        })
      });

      setChatHistory((current) => [
        ...current,
        {
          ...response.data.chat,
          generation_mode: response.data.generation_mode,
          llm_error: response.data.llm_error
        }
      ]);
      setChatQuestion("");
    } catch (error) {
      setChatError(error.message || "大模型问答失败，请稍后重试。");
      throw error;
    } finally {
      setIsChatLoading(false);
      setPendingChatQuestion("");
    }
  }

  async function runSafely(task) {
    try {
      await task();
    } catch (error) {
      showToast(error.message || "操作失败", "error");
    }
  }

  const currentMeta = VIEW_META[currentView] || VIEW_META.overview;

  return (
    <div className="app-shell">
      <Sidebar
        currentView={currentView}
        currentUsername={currentUsername}
        llmConfig={llmConfig}
        usageCount={renderableRecords.length}
        latestPrediction={latestPrediction}
        onNavigate={navigate}
      />

      <main className="content-shell">
        <Topbar
          title={currentMeta.name}
          note={currentMeta.note}
          currentUsername={currentUsername}
          llmConfig={llmConfig}
          latestPrediction={latestPrediction}
        />

        <div className="view-stack">
          {currentView === "overview" ? (
            <OverviewView
              overview={overview}
              records={renderableRecords}
              prediction={latestPrediction}
              llmConfig={llmConfig}
              onNavigate={navigate}
            />
          ) : null}

          {currentView === "profile" ? (
            <ProfileView
              profileForm={profileForm}
              onChange={handleProfileChange}
              onSubmit={(event) => runSafely(() => handleCreateUser(event))}
              onFillDemo={handleFillUserDemo}
              currentUsername={currentUsername}
              userId={userId}
            />
          ) : null}

          {currentView === "model" ? (
            <ModelConfigView
              modelForm={modelForm}
              onChange={handleModelChange}
              onTest={() => runSafely(handleTestLlm)}
              onSave={() => runSafely(handleSaveLlm)}
              onClear={() => runSafely(handleClearLlm)}
              llmPreview={llmPreview}
              llmConfig={llmConfig}
            />
          ) : null}

          {currentView === "usage" ? (
            <UsageView
              usageDraft={usageDraft}
              onUsageChange={handleUsageChange}
              onDeleteRow={handleDeleteUsageRow}
              onAddRow={handleAddUsageRow}
              onFillDemo={handleFillUsageDemo}
              onImportClick={handleImportClick}
              onDownloadTemplate={downloadCsvTemplate}
              onUploadUsage={() => runSafely(handleUploadUsage)}
              onRefreshUsage={() => runSafely(handleRefreshUsage)}
              onFileChange={(event) => runSafely(() => handleFileChange(event))}
              fileInputRef={fileInputRef}
              draftStatus={draftStatus}
              renderableRecords={renderableRecords}
              usageSummary={usageSummary}
            />
          ) : null}

          {currentView === "prediction" ? (
            <PredictionView
              targetMonth={targetMonth}
              onTargetMonthChange={(event) => setTargetMonth(event.target.value)}
              onRunPrediction={() => runSafely(handleRunPrediction)}
              onRefreshPrediction={() => runSafely(handleRefreshPrediction)}
              onRegenerateAdvice={() => runSafely(handleRegenerateAdvice)}
              prediction={latestPrediction}
              predictionMeta={latestPredictionMeta}
              predictionViewModel={predictionViewModel}
            />
          ) : null}

          {currentView === "scenario" ? (
            <ScenarioView
              scenarioForm={scenarioForm}
              onChange={handleScenarioChange}
              onSimulate={() => runSafely(handleSimulateScenario)}
              scenarioResult={scenarioResult}
              latestPrediction={latestPrediction}
            />
          ) : null}

          {currentView === "chat" ? (
            <ChatView
              chatQuestion={chatQuestion}
              onQuestionChange={(event) => setChatQuestion(event.target.value)}
              onQuestionKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void runSafely(handleSendChat);
                }
              }}
              onSend={() => runSafely(handleSendChat)}
              onQuickQuestion={(question) => runSafely(() => handleSendChat(question))}
              onOpenHistory={() => navigate("history")}
              latestChat={latestChat}
              historyCount={chatHistory.length}
              llmEnabled={Boolean(llmConfig?.enabled)}
              isChatLoading={isChatLoading}
              pendingQuestion={pendingChatQuestion}
              chatError={chatError}
            />
          ) : null}

          {currentView === "history" ? (
            <ChatHistoryView
              chatHistory={chatHistory}
              onBackToChat={() => navigate("chat")}
            />
          ) : null}
        </div>
      </main>

      <Toast toast={toast} />
    </div>
  );
}

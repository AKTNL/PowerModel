import { startTransition, useEffect, useRef, useState } from "react";

import {
  DEFAULT_LLM_PREVIEW,
  DEFAULT_MODEL_FORM,
  DEFAULT_PROFILE_FORM,
  DEFAULT_SCENARIO_FORM,
  DEFAULT_SCENARIO_RESULT,
  STORAGE_KEYS
} from "../constants/appDefaults.js";
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
} from "../lib/powerUtils.js";
import { isNationalView } from "../lib/nationalUtils.js";
import {
  buildDraftRows,
  buildOverviewData,
  buildPredictionViewModel,
  buildUsageSummary,
  toInputValue
} from "../lib/viewModels.js";
import {
  clearLlmConfig,
  createUser,
  fetchChatHistory,
  fetchLatestPrediction,
  fetchLlmConfig,
  fetchUsage,
  fetchUser,
  regenerateAdvice,
  runMonthlyPrediction,
  saveLlmConfig,
  sendChatMessage,
  simulateScenario,
  testLlmConfig,
  uploadUsage
} from "../services/appApi.js";
import { useNationalPowerModule } from "./useNationalPowerModule.js";
import { useToast } from "./useToast.js";

function readStoredValue(key) {
  return window.localStorage.getItem(key) || "";
}

function looksLikePlaceholderQuestion(value) {
  return /^[?？�\s]+$/.test(value);
}

function normalizeViewKey(view) {
  if (view === "history") {
    return "chat";
  }

  return view || "overview";
}

export function useHouseholdPowerApp() {
  const { toast, showToast } = useToast();
  const [llmConfig, setLlmConfig] = useState(null);
  const national = useNationalPowerModule(showToast, llmConfig);

  const [currentView, setCurrentView] = useState(() =>
    normalizeViewKey(readStoredValue(STORAGE_KEYS.activeView) || "overview")
  );
  const [userId, setUserId] = useState(() => readStoredValue(STORAGE_KEYS.userId));
  const [currentUsername, setCurrentUsername] = useState(() => readStoredValue(STORAGE_KEYS.username));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => readStoredValue(STORAGE_KEYS.sidebarCollapsed) === "1"
  );
  const [profileForm, setProfileForm] = useState(DEFAULT_PROFILE_FORM);
  const [modelForm, setModelForm] = useState(DEFAULT_MODEL_FORM);
  const [usageRecords, setUsageRecords] = useState([]);
  const [usageDraft, setUsageDraft] = useState(() => ensureDraftRows([]));
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [latestPredictionMeta, setLatestPredictionMeta] = useState(null);
  const [targetMonth, setTargetMonth] = useState("");
  const [llmPreview, setLlmPreview] = useState(DEFAULT_LLM_PREVIEW);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatError, setChatError] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [pendingChatQuestion, setPendingChatQuestion] = useState("");
  const [scenarioForm, setScenarioForm] = useState(DEFAULT_SCENARIO_FORM);
  const [scenarioResult, setScenarioResult] = useState(DEFAULT_SCENARIO_RESULT);

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
    usageAnalysis.partialCount ? `（${usageAnalysis.partialCount} 行待补全）` : ""
  }`;
  const latestChat = chatHistory.at(-1) || null;
  const currentMeta = VIEW_META[currentView] || VIEW_META.overview;
  const inNationalView = isNationalView(currentView);

  function navigate(view) {
    startTransition(() => {
      setCurrentView(normalizeViewKey(view));
    });
  }

  function toggleSidebarCollapse() {
    setIsSidebarCollapsed((current) => !current);
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
    setChatHistory([]);
    setChatQuestion("");
    setChatError("");
    setIsChatLoading(false);
    setPendingChatQuestion("");
    setScenarioForm(DEFAULT_SCENARIO_FORM);
    setScenarioResult(DEFAULT_SCENARIO_RESULT);
    setTargetMonth("");
  }

  function applyLoadedUser(user) {
    setCurrentUsername(user.username || "");
    setProfileForm({
      username: user.username || "",
      family_size: toInputValue(user.family_size),
      house_area: toInputValue(user.house_area),
      air_conditioner_count: toInputValue(user.air_conditioner_count),
      water_heater_type: user.water_heater_type || "",
      cooking_type: user.cooking_type || ""
    });
  }

  function applyLoadedLlmConfig(config) {
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
      text: `已加载平台模型配置：${config.model_name}，Key：${config.masked_api_key || "已保存"}`
    });
  }

  function clearLoadedLlmConfig() {
    setLlmConfig(null);
    setModelForm(DEFAULT_MODEL_FORM);
    setLlmPreview({
      tone: "muted",
      text: "当前还没有保存平台级模型配置。"
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrateGlobalLlmConfig() {
      try {
        const llmResponse = await fetchLlmConfig();
        if (!cancelled) {
          applyLoadedLlmConfig(llmResponse.data.config);
        }
      } catch {
        if (!cancelled) {
          clearLoadedLlmConfig();
        }
      }
    }

    hydrateGlobalLlmConfig().catch((error) => {
      if (!cancelled) {
        showToast(error.message || "加载平台模型配置失败", "error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function applyLoadedChatHistory(records) {
    setChatHistory(
      (records || []).map((record) => ({
        ...record,
        generation_mode: "saved",
        llm_error: null
      }))
    );
    setChatError("");
  }

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.activeView, currentView);
  }, [currentView]);

  useEffect(() => {
    if (userId) {
      window.localStorage.setItem(STORAGE_KEYS.userId, userId);
      return;
    }

    window.localStorage.removeItem(STORAGE_KEYS.userId);
  }, [userId]);

  useEffect(() => {
    if (currentUsername) {
      window.localStorage.setItem(STORAGE_KEYS.username, currentUsername);
      return;
    }

    window.localStorage.removeItem(STORAGE_KEYS.username);
  }, [currentUsername]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, isSidebarCollapsed ? "1" : "0");
  }, [isSidebarCollapsed]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateExistingUser() {
      if (!userId) {
        return;
      }

      try {
        const userResponse = await fetchUser(userId);
        if (cancelled) {
          return;
        }

        applyLoadedUser(userResponse.data.user);
      } catch {
        if (!cancelled) {
          setUserId("");
          setCurrentUsername("");
          resetUserBoundState();
        }
        return;
      }

      try {
        const usageResponse = await fetchUsage(userId);
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
        const predictionResponse = await fetchLatestPrediction(userId);
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
        const chatResponse = await fetchChatHistory(userId);
        if (!cancelled) {
          applyLoadedChatHistory(chatResponse.data.records);
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
        showToast(error.message || "加载用户信息失败", "error");
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

    const response = await createUser({
      username: normalizeValue(profileForm.username) || "",
      family_size: normalizeNumber(profileForm.family_size),
      house_area: normalizeNumber(profileForm.house_area),
      air_conditioner_count: normalizeNumber(profileForm.air_conditioner_count),
      water_heater_type: normalizeValue(profileForm.water_heater_type),
      cooking_type: normalizeValue(profileForm.cooking_type)
    });

    const user = response.data.user;
    resetUserBoundState();
    setUserId(`${user.id}`);
    applyLoadedUser(user);
    navigate("usage");
    showToast(`已创建用户 ${user.username}`);
  }

  async function handleTestLlm() {
    const response = await testLlmConfig({
      provider: modelForm.provider,
      base_url: normalizeValue(modelForm.base_url),
      api_key: normalizeValue(modelForm.api_key),
      model_name: normalizeValue(modelForm.model_name),
      temperature: normalizeNumber(modelForm.temperature) ?? 0.3,
      enabled: true,
      prompt: "Reply with OK only."
    });

    setLlmPreview({
      tone: "success",
      text: `连接成功，返回预览：${response.data.preview}`
    });
    showToast("模型连接测试成功");
  }

  async function handleSaveLlm() {
    const response = await saveLlmConfig({
      provider: modelForm.provider,
      base_url: normalizeValue(modelForm.base_url),
      api_key: normalizeValue(modelForm.api_key),
      model_name: normalizeValue(modelForm.model_name),
      temperature: normalizeNumber(modelForm.temperature) ?? 0.3,
      enabled: true
    });

    applyLoadedLlmConfig(response.data.config);
    setModelForm((current) => ({ ...current, api_key: "" }));
    setLlmPreview({
      tone: "success",
      text: `已保存平台配置：${response.data.config.model_name} @ ${response.data.config.base_url}`
    });
    setChatError("");
    showToast("平台模型配置已保存");
  }

  async function handleClearLlm() {
    await clearLlmConfig();
    setLlmConfig(null);
    setModelForm(DEFAULT_MODEL_FORM);
    setLlmPreview({
      tone: "muted",
      text: "已清除平台级模型配置。"
    });
    setChatError("");
    showToast("平台模型配置已清除");
  }

  async function handleRefreshUsage() {
    const numericUserId = requireUserId();
    const response = await fetchUsage(numericUserId);
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

    await uploadUsage({
      user_id: numericUserId,
      records: analysis.validRecords
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
    const response = await runMonthlyPrediction({
      user_id: numericUserId,
      target_month: targetMonth || null
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
    const response = await fetchLatestPrediction(numericUserId);
    setLatestPrediction(response.data.prediction);
    setLatestPredictionMeta({ generation_mode: "saved", llm_error: null });
    showToast("已刷新最近一次预测结果");
  }

  async function handleRegenerateAdvice() {
    const numericUserId = requireUserId();
    if (!latestPrediction) {
      throw new Error("请先执行一次预测。");
    }

    const response = await regenerateAdvice({
      user_id: numericUserId
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
    const response = await simulateScenario({
      user_id: numericUserId,
      reduce_ac_hours_per_day: normalizeNumber(scenarioForm.reduce_ac_hours_per_day) ?? 0,
      reduce_water_heater_hours_per_day: normalizeNumber(scenarioForm.reduce_water_heater_hours_per_day) ?? 0
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

    if (looksLikePlaceholderQuestion(question)) {
      throw new Error("当前问题内容异常，像是编码损坏后的占位问号，请重新输入一次。");
    }

    if (!llmConfig?.enabled) {
      throw new Error("请先在“模型设置”中配置并启用大模型，再使用智能问答。");
    }

    setChatError("");
    setPendingChatQuestion(question);
    setIsChatLoading(true);
    navigate("chat");

    try {
      const response = await sendChatMessage({
        user_id: numericUserId,
        question
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

  return {
    currentView,
    isSidebarCollapsed,
    toast,
    sidebarProps: {
      currentView,
      currentUsername,
      llmConfig,
      usageCount: renderableRecords.length,
      latestPrediction,
      statusCards: inNationalView
        ? national.sidebarStatusCards
        : [
            { label: "当前用户", value: currentUsername || "尚未创建" },
            { label: "模型状态", value: llmConfig?.enabled ? llmConfig.model_name : "未配置" },
            { label: "数据与预测", value: `${renderableRecords.length} 条记录 / ${latestPrediction?.target_month || "--"}` }
          ],
      onNavigate: navigate,
      isCollapsed: isSidebarCollapsed,
      onToggleCollapse: toggleSidebarCollapse
    },
    topbarProps: {
      title: currentMeta.name,
      note: currentMeta.note,
      currentUsername,
      llmConfig,
      latestPrediction,
      metaItems: inNationalView ? national.topbarMeta : null
    },
    viewProps: {
      overview: {
        overview,
        records: renderableRecords,
        prediction: latestPrediction,
        llmConfig
      },
      profile: {
        profileForm,
        onChange: handleProfileChange,
        onSubmit: (event) => runSafely(() => handleCreateUser(event)),
        onFillDemo: handleFillUserDemo,
        currentUsername,
        userId
      },
      model: {
        modelForm,
        onChange: handleModelChange,
        onTest: () => runSafely(handleTestLlm),
        onSave: () => runSafely(handleSaveLlm),
        onClear: () => runSafely(handleClearLlm),
        llmPreview,
        llmConfig
      },
      usage: {
        usageDraft,
        onUsageChange: handleUsageChange,
        onDeleteRow: handleDeleteUsageRow,
        onAddRow: handleAddUsageRow,
        onFillDemo: handleFillUsageDemo,
        onImportClick: handleImportClick,
        onDownloadTemplate: downloadCsvTemplate,
        onUploadUsage: () => runSafely(handleUploadUsage),
        onRefreshUsage: () => runSafely(handleRefreshUsage),
        onFileChange: (event) => runSafely(() => handleFileChange(event)),
        fileInputRef,
        draftStatus,
        renderableRecords,
        usageSummary
      },
      prediction: {
        targetMonth,
        onTargetMonthChange: (event) => setTargetMonth(event.target.value),
        onRunPrediction: () => runSafely(handleRunPrediction),
        onRefreshPrediction: () => runSafely(handleRefreshPrediction),
        onRegenerateAdvice: () => runSafely(handleRegenerateAdvice),
        prediction: latestPrediction,
        predictionMeta: latestPredictionMeta,
        predictionViewModel
      },
      scenario: {
        scenarioForm,
        onChange: handleScenarioChange,
        onSimulate: () => runSafely(handleSimulateScenario),
        scenarioResult,
        latestPrediction
      },
      chat: {
        chatHistory,
        chatQuestion,
        onQuestionChange: (event) => setChatQuestion(event.target.value),
        onQuestionKeyDown: (event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void runSafely(handleSendChat);
          }
        },
        onSend: () => runSafely(handleSendChat),
        onQuickQuestion: (question) => runSafely(() => handleSendChat(question)),
        latestChat,
        historyCount: chatHistory.length,
        llmEnabled: Boolean(llmConfig?.enabled),
        isChatLoading,
        pendingQuestion: pendingChatQuestion,
        chatError
      },
      ...national.viewProps
    }
  };
}

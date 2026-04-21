import { useEffect, useMemo, useRef, useState } from "react";

import {
  askNationalQuestion,
  fetchNationalDefaultDataset,
  fetchNationalMeta,
  polishNationalReport,
  runNationalForecast,
  validateNationalDataset
} from "../services/nationalApi.js";
import {
  buildNationalOverviewCards,
  buildNationalSupplementSeries,
  buildNationalSidebarCards,
  buildNationalTopbarMeta,
  EMPTY_NATIONAL_RUN
} from "../lib/nationalUtils.js";

function toNationalLlmPayload(config) {
  if (!config?.enabled) {
    return null;
  }

  // The frontend only has the masked global config and never the real API key.
  // Returning null here lets the backend resolve the persisted global config,
  // so national forecast / polish / QA can truly share the same saved model.
  return null;
}

export function useNationalPowerModule(showToast, globalLlmConfig) {
  const EMPTY_REPORT_ANSWER = {
    answer: "",
    message: "",
    status: "",
    question: "",
    requestState: "idle"
  };
  const [meta, setMeta] = useState(null);
  const [defaultDataset, setDefaultDataset] = useState(null);
  const [runResult, setRunResult] = useState(EMPTY_NATIONAL_RUN);
  const [datasetSource, setDatasetSource] = useState("default");
  const [forecastPeriods, setForecastPeriods] = useState(12);
  const [uploadState, setUploadState] = useState({ filename: "", csvContent: "", validation: null });
  const [llmMode, setLlmMode] = useState("cloud_rewrite");
  const [reportQuestion, setReportQuestion] = useState("");
  const [reportAnswer, setReportAnswer] = useState(EMPTY_REPORT_ANSWER);
  const [qaHistory, setQaHistory] = useState([]);
  const [isBooting, setIsBooting] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isPolishingReport, setIsPolishingReport] = useState(false);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const [metaPayload, datasetPayload] = await Promise.all([fetchNationalMeta(), fetchNationalDefaultDataset()]);
        if (cancelled) {
          return;
        }

        setMeta(metaPayload.data);
        setDefaultDataset(datasetPayload.data);
        setForecastPeriods(metaPayload.data.defaults.forecast_periods);
      } catch (error) {
        if (!cancelled) {
          showToast(error.message || "加载国家模块失败", "error");
        }
      } finally {
        if (!cancelled) {
          setIsBooting(false);
        }
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const overviewCards = useMemo(() => buildNationalOverviewCards(runResult.stats), [runResult.stats]);
  const supplementSeries = useMemo(() => buildNationalSupplementSeries(runResult), [runResult]);

  function buildNationalExecutionModePayload() {
    if (llmMode === "local") {
      return {
        enabled: false,
        provider: "openai-compatible",
        base_url: "",
        model: "",
        api_key: ""
      };
    }

    return toNationalLlmPayload(globalLlmConfig);
  }

  function buildSharedLlmPayload() {
    return toNationalLlmPayload(globalLlmConfig);
  }

  const llmModeSummary =
    llmMode === "local"
      ? {
          label: "本地规则",
          tone: "muted",
          text: "当前问答将直接使用本地规则答案，不调用共享平台模型。报告润色按钮仍会按共享平台模型是否可用来决定是否走云端。"
        }
      : llmMode === "cloud_direct"
        ? globalLlmConfig?.enabled
        ? {
            label: "云端独立回答",
            tone: "success",
            text: `当前将使用共享平台模型：${globalLlmConfig.model_name || globalLlmConfig.model || "已配置模型"}。问答会基于 SARIMA 预测上下文由云端模型独立组织答案，不直接沿用本地规则模板。`
          }
        : {
            label: "云端独立回答",
            tone: "error",
            text: "当前选择了云端独立回答，但平台模型尚未配置；本次会自动回退到本地规则。"
          }
        : globalLlmConfig?.enabled
          ? {
              label: "云端润色",
              tone: "success",
              text: `当前将使用共享平台模型：${globalLlmConfig.model_name || globalLlmConfig.model || "已配置模型"}。问答会先生成本地规则答案，再由云端模型润色增强。`
            }
          : {
              label: "云端润色",
              tone: "error",
              text: "当前选择了云端润色，但平台模型尚未配置；本次会自动回退到本地规则。"
          };

  async function handleRunForecast() {
    setIsRunning(true);
    try {
      const response = await runNationalForecast({
        dataset_source: datasetSource,
        forecast_periods: Number(forecastPeriods),
        csv_content: datasetSource === "uploaded" ? uploadState.csvContent : null,
        llm_config: buildNationalExecutionModePayload()
      });
      setRunResult(response.data);
      setReportAnswer(EMPTY_REPORT_ANSWER);
      setQaHistory([]);
      showToast(`已完成${response.data.source_label}的国家预测`, "success");
    } finally {
      setIsRunning(false);
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const response = await validateNationalDataset({
        filename: file.name,
        csv_content: text
      });
      setUploadState({
        filename: file.name,
        csvContent: text,
        validation: response.data
      });
      setDatasetSource("uploaded");
      showToast(`已校验 ${file.name}`, "success");
    } finally {
      event.target.value = "";
    }
  }

  async function handlePolishReport() {
    if (!runResult.report?.draft) {
      return;
    }

    setIsPolishingReport(true);
    try {
      const response = await polishNationalReport({
        draft_report: runResult.report.draft,
        context: {
          latest_value: runResult.stats?.latest_value,
          forecast_periods: runResult.forecast.length
        },
        llm_config: buildSharedLlmPayload()
      });

      setRunResult((current) => ({
        ...current,
        report: {
          draft: response.data.report_text,
          status: response.data.status,
          status_message: response.data.status_message
        }
      }));
      showToast("国家模块报告已更新", "success");
    } catch (error) {
      showToast(error.message || "国家模块报告润色失败", "error");
    } finally {
      setIsPolishingReport(false);
    }
  }

  async function handleAskQuestion() {
    const normalizedQuestion = reportQuestion.trim();
    if (!normalizedQuestion || !runResult.stats) {
      return;
    }

    setIsAskingQuestion(true);
    setReportAnswer({
      answer: "",
      message:
        llmMode === "cloud_direct"
          ? "问题已发送，正在等待云端模型基于当前预测上下文独立生成回答。"
          : llmMode === "cloud_rewrite"
            ? "问题已发送，正在等待云端模型对本地规则答案做润色增强。"
            : "问题已发送，正在使用本地规则与当前 SARIMA 预测结果生成回答。",
      status: "sending",
      question: normalizedQuestion,
      requestState: "pending"
    });

    try {
      const response = await askNationalQuestion({
        question: normalizedQuestion,
        history: runResult.history,
        forecast: runResult.forecast,
        stats: runResult.stats,
        qa_mode: llmMode,
        llm_config: buildNationalExecutionModePayload()
      });

      setReportAnswer({
        answer: response.data.answer,
        message: response.data.status_message,
        status: response.data.status,
        question: normalizedQuestion,
        requestState: "done"
      });
      setQaHistory((current) => [
        {
          id: `${Date.now()}-${current.length}`,
          question: normalizedQuestion,
          answer: response.data.answer,
          message: response.data.status_message,
          status: response.data.status,
          mode: llmMode,
          createdAt: new Date().toISOString()
        },
        ...current
      ]);
      showToast(
        response.data.status === "cloud_direct"
          ? "已收到云端独立回答"
          : response.data.status === "cloud_rewrite"
            ? "已收到云端润色回答"
          : response.data.status === "fallback_local"
            ? "云端失败，已回退本地回答"
            : "已收到本地回答",
        response.data.status === "fallback_local" ? "warn" : "success"
      );
    } catch (error) {
      setReportAnswer({
        answer: "",
        message: error.message || "问题发送失败，请稍后重试。",
        status: "error",
        question: normalizedQuestion,
        requestState: "failed"
      });
      setQaHistory((current) => [
        {
          id: `${Date.now()}-${current.length}`,
          question: normalizedQuestion,
          answer: "",
          message: error.message || "问题发送失败，请稍后重试。",
          status: "error",
          mode: llmMode,
          createdAt: new Date().toISOString()
        },
        ...current
      ]);
      showToast(error.message || "国家问答失败", "error");
    } finally {
      setIsAskingQuestion(false);
    }
  }

  return {
    isBooting,
    isRunning,
    sidebarStatusCards: buildNationalSidebarCards({ runResult, savedLlmConfig: globalLlmConfig, defaultDataset, uploadState }),
    topbarMeta: buildNationalTopbarMeta({ savedLlmConfig: globalLlmConfig, datasetSource }),
    viewProps: {
      nationalOverview: {
        runResult,
        datasetSource,
        onDatasetSourceChange: setDatasetSource,
        forecastPeriods,
        onForecastPeriodsChange: setForecastPeriods,
        uploadState,
        onImportClick: () => fileInputRef.current?.click(),
        onFileChange: handleFileChange,
        fileInputRef,
        onRunForecast: handleRunForecast,
        overviewCards,
        supplementSeries,
        isBooting,
        isRunning
      },
      nationalReport: {
        runResult,
        llmMode,
        onLlmModeChange: setLlmMode,
        llmModeSummary,
        reportQuestion,
        onReportQuestionChange: setReportQuestion,
        onAskQuestion: handleAskQuestion,
        reportAnswer,
        qaHistory,
        onPolishReport: handlePolishReport,
        isPolishingReport,
        isAskingQuestion
      },
      nationalSources: {
        meta,
        defaultDataset,
        runResult,
        uploadState
      }
    }
  };
}

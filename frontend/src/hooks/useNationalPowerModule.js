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

  return {
    enabled: Boolean(config.enabled),
    provider: config.provider || "openai-compatible",
    base_url: config.base_url || "",
    model: config.model_name || "",
    api_key: ""
  };
}

export function useNationalPowerModule(showToast, globalLlmConfig) {
  const [meta, setMeta] = useState(null);
  const [defaultDataset, setDefaultDataset] = useState(null);
  const [runResult, setRunResult] = useState(EMPTY_NATIONAL_RUN);
  const [datasetSource, setDatasetSource] = useState("default");
  const [forecastPeriods, setForecastPeriods] = useState(12);
  const [uploadState, setUploadState] = useState({ filename: "", csvContent: "", validation: null });
  const [reportQuestion, setReportQuestion] = useState("");
  const [reportAnswer, setReportAnswer] = useState({ answer: "", message: "" });
  const [isBooting, setIsBooting] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
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
  async function handleRunForecast() {
    setIsRunning(true);
    try {
      const response = await runNationalForecast({
        dataset_source: datasetSource,
        forecast_periods: Number(forecastPeriods),
        csv_content: datasetSource === "uploaded" ? uploadState.csvContent : null,
        llm_config: toNationalLlmPayload(globalLlmConfig)
      });
      setRunResult(response.data);
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
    const response = await polishNationalReport({
      draft_report: runResult.report.draft,
      context: {
        latest_value: runResult.stats?.latest_value,
        forecast_periods: runResult.forecast.length
      },
      llm_config: toNationalLlmPayload(globalLlmConfig) || {
        enabled: false,
        provider: "openai-compatible",
        base_url: "",
        model: "",
        api_key: ""
      }
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
  }

  async function handleAskQuestion() {
    const response = await askNationalQuestion({
      question: reportQuestion,
      history: runResult.history,
      forecast: runResult.forecast,
      stats: runResult.stats,
      llm_config: toNationalLlmPayload(globalLlmConfig)
    });
    setReportAnswer({
      answer: response.data.answer,
      message: response.data.status_message
    });
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
        reportQuestion,
        onReportQuestionChange: setReportQuestion,
        onAskQuestion: handleAskQuestion,
        reportAnswer,
        onPolishReport: handlePolishReport
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

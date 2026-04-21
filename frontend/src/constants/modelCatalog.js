export const MODEL_SERVICE_PRESETS = [
  {
    key: "zhipu",
    label: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    placeholder: "glm-4.7 / glm-4-air"
  },
  {
    key: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    placeholder: "deepseek-chat / deepseek-reasoner"
  },
  {
    key: "gemini",
    label: "Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    placeholder: "gemini-2.5-flash / gemini-2.5-pro"
  },
  {
    key: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    placeholder: "gpt-4o-mini / gpt-4.1"
  },
  {
    key: "custom",
    label: "自定义",
    baseUrl: "",
    placeholder: "填写你自己的模型标识"
  }
];

function normalizeUrl(value) {
  return (value || "").trim().replace(/\/+$/, "").toLowerCase();
}

export function getPresetByKey(key) {
  return MODEL_SERVICE_PRESETS.find((item) => item.key === key) || MODEL_SERVICE_PRESETS.at(-1);
}

export function inferPresetKeyFromConfig(config) {
  const normalizedUrl = normalizeUrl(config?.base_url);
  if (!normalizedUrl) {
    return "custom";
  }

  const matchedPreset = MODEL_SERVICE_PRESETS.find(
    (item) => item.key !== "custom" && normalizeUrl(item.baseUrl) === normalizedUrl
  );

  return matchedPreset?.key || "custom";
}

import Panel from "../components/Panel.jsx";

export default function ModelConfigView({
  modelForm,
  onChange,
  onTest,
  onSave,
  onClear,
  llmPreview,
  llmConfig
}) {
  return (
    <div className="module-view is-active" data-view="model">
      <Panel
        kicker="LLM"
        title="模型设置"
        note="这里接你自己的 OpenAI 兼容模型。预测数值仍由后端完成，大模型主要负责解释、建议和问答。"
      >
        <div className="form-grid">
          <label>
            Provider
            <select name="provider" value={modelForm.provider} onChange={onChange}>
              <option value="openai-compatible">openai-compatible</option>
            </select>
          </label>
          <label>
            Temperature
            <input
              name="temperature"
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={modelForm.temperature}
              onChange={onChange}
            />
          </label>
          <label className="field-span-2">
            Base URL
            <input
              name="base_url"
              value={modelForm.base_url}
              onChange={onChange}
              placeholder="https://api.example.com/v1"
            />
          </label>
          <label>
            Model Name
            <input
              name="model_name"
              value={modelForm.model_name}
              onChange={onChange}
              placeholder="gpt-4o-mini / deepseek-chat"
            />
          </label>
          <label>
            API Key
            <input
              name="api_key"
              type="password"
              value={modelForm.api_key}
              onChange={onChange}
              placeholder="sk-..."
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="ghost-button" onClick={onTest}>
            测试连接
          </button>
          <button type="button" className="primary-button" onClick={onSave}>
            保存配置
          </button>
          <button type="button" className="danger-button" onClick={onClear}>
            清除配置
          </button>
        </div>

        <div className={`info-strip ${llmPreview.tone}`.trim()}>{llmPreview.text}</div>

        <div className="summary-grid">
          <article className="summary-card">
            <span>当前生效模型</span>
            <strong>{llmConfig?.enabled ? llmConfig.model_name : "--"}</strong>
            <p>{llmConfig?.enabled ? llmConfig.base_url : "还没有给当前用户保存模型配置。"}</p>
          </article>
          <article className="summary-card">
            <span>API Key 状态</span>
            <strong>{llmConfig?.has_api_key ? "已保存" : "未保存"}</strong>
            <p>{llmConfig?.masked_api_key || "页面不会回显完整 Key。"}</p>
          </article>
        </div>
      </Panel>
    </div>
  );
}

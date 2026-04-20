import Panel from "../components/Panel.jsx";

export default function NationalModelView({ llmForm, onLlmFormChange, savedLlmConfig, onTest, onSave, onClear }) {
  function updateField(key, value) {
    onLlmFormChange((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="module-view is-active" data-view="national-model">
      <Panel kicker="National LLM" title="国家模块模型设置" note="国家预测使用独立配置，避免和家庭模块的用户级模型设置互相覆盖。">
        <div className="panel-heading">
          <label className="toggle-field">
            <input type="checkbox" checked={llmForm.enabled} onChange={(event) => updateField("enabled", event.target.checked)} />
            <span>启用国家模块增强</span>
          </label>
        </div>

        <div className="two-col-grid">
          <label className="field-block">
            <span>Provider</span>
            <input value={llmForm.provider} onChange={(event) => updateField("provider", event.target.value)} />
          </label>
          <label className="field-block">
            <span>Model</span>
            <input value={llmForm.model} onChange={(event) => updateField("model", event.target.value)} />
          </label>
        </div>

        <label className="field-block">
          <span>Base URL</span>
          <input value={llmForm.base_url} onChange={(event) => updateField("base_url", event.target.value)} />
        </label>

        <label className="field-block">
          <span>API Key</span>
          <input
            type="password"
            value={llmForm.api_key}
            onChange={(event) => updateField("api_key", event.target.value)}
            placeholder={savedLlmConfig?.has_api_key ? "已保存密钥，可留空保持不变" : "输入国家模块 API Key"}
          />
        </label>

        <div className="action-row">
          <button className="secondary-button" type="button" onClick={onTest}>
            测试连接
          </button>
          <button className="primary-button" type="button" onClick={onSave}>
            保存配置
          </button>
          <button className="secondary-button" type="button" onClick={onClear}>
            清除配置
          </button>
        </div>

        <div className="info-panel">
          <span>当前已保存配置</span>
          <strong>{savedLlmConfig?.enabled ? `${savedLlmConfig.model} @ ${savedLlmConfig.base_url}` : "暂无"}</strong>
          <small>{savedLlmConfig?.masked_api_key || "尚未保存 API Key"}</small>
        </div>
      </Panel>
    </div>
  );
}

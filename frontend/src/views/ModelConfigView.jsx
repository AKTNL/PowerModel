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
      <div className="page-grid">
        <Panel
          kicker="LLM"
          title="模型设置"
          note="这里接入你自己的 OpenAI 兼容模型。数值预测仍由后端完成，大模型主要负责解释、建议和问答。"
        >
          <div className="page-intro-strip">
            <div className="intro-pill">
              <span>协议类型</span>
              <strong>OpenAI Compatible</strong>
            </div>
            <div className="intro-pill">
              <span>建议顺序</span>
              <strong>先测试，再保存</strong>
            </div>
          </div>

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
        </Panel>

        <div className="page-side-stack">
          <section className="side-panel">
            <div className="side-panel-head">
              <p className="panel-kicker">Runtime</p>
              <h3>当前接入状态</h3>
            </div>
            <div className="status-tile-grid">
              <article className="status-tile">
                <span>当前模型</span>
                <strong>{llmConfig?.enabled ? llmConfig.model_name : "--"}</strong>
                <p>{llmConfig?.enabled ? llmConfig.base_url : "当前用户还没有保存模型配置。"}</p>
              </article>
              <article className="status-tile status-warm">
                <span>API Key 状态</span>
                <strong>{llmConfig?.has_api_key ? "已保存" : "未保存"}</strong>
                <p>{llmConfig?.masked_api_key || "页面不会回显完整 Key，只显示掩码。"}</p>
              </article>
            </div>
          </section>

          <section className="side-panel">
            <div className="side-panel-head">
              <p className="panel-kicker">Tips</p>
              <h3>接入建议</h3>
            </div>
            <div className="info-list">
              <div className="info-list-item">
                <strong>Base URL 不要填到具体接口</strong>
                <p>只需要填到服务根路径，比如 `https://api.xxx.com/v1`，系统会自动拼接 `chat/completions`。</p>
              </div>
              <div className="info-list-item">
                <strong>先测试再保存</strong>
                <p>这样能更快定位是地址、Key 还是模型名的问题。</p>
              </div>
              <div className="info-list-item">
                <strong>问答必须依赖大模型</strong>
                <p>预测解释仍可回退到规则版，但智能问答不会再用固定模板，模型调用失败时会直接提示错误原因。</p>
              </div>
              <div className="info-list-item">
                <strong>GLM-4.7 系列已自动关闭思维链输出</strong>
                <p>如果你接的是智谱 GLM-4.7，系统会自动关闭默认思考模式，避免出现“有推理但没有最终回答”的空回复。</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

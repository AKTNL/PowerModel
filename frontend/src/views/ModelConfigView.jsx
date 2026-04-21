import Panel from "../components/Panel.jsx";
import { getPresetByKey, MODEL_SERVICE_PRESETS } from "../constants/modelCatalog.js";

export default function ModelConfigView({
  modelForm,
  onChange,
  onTest,
  onDiagnose,
  onSave,
  onClear,
  llmPreview,
  isTestingLlm,
  isDiagnosingLlm,
  isSavingLlm,
  isClearingLlm,
  llmConfig
}) {
  const isBusy = isTestingLlm || isDiagnosingLlm || isSavingLlm || isClearingLlm;
  const selectedPreset = getPresetByKey(modelForm.service_preset);
  const operationLabel = isTestingLlm
    ? "正在测试连接"
    : isDiagnosingLlm
      ? "正在诊断真实问答"
      : isSavingLlm
        ? "正在保存配置"
        : isClearingLlm
          ? "正在清除配置"
          : "";
  const operationCopy = isTestingLlm
    ? "系统正在验证地址、模型名称和 API Key 的可用性。"
    : isDiagnosingLlm
      ? "系统正在用接近国家独立问答的真实负载做诊断，这一步比普通连通性测试更慢。"
    : isSavingLlm
      ? "保存完成后，家庭与国家模块都会立即复用这份平台配置。"
      : isClearingLlm
        ? "清除后，问答和大模型解释都会失去平台级配置。"
        : "";

  return (
    <div className="module-view is-active" data-view="model">
      <div className="page-grid">
        <Panel
          kicker="平台模型"
          title="平台模型设置"
          note="这里配置整个平台共用的 OpenAI 兼容模型。家庭预测和国家预测都会默认使用这份配置。"
        >
          <div className="page-intro-strip">
            <div className="intro-pill">
              <span>协议类型</span>
              <strong>OpenAI 兼容</strong>
            </div>
            <div className="intro-pill">
              <span>建议顺序</span>
              <strong>先测试，再保存</strong>
            </div>
            <div className="intro-pill">
              <span>生效范围</span>
              <strong>家庭 + 国家模块</strong>
            </div>
          </div>

          <div className="form-shell">
            <section className="form-section">
              <div className="form-section-head">
                <p className="form-section-kicker">基础参数</p>
                <h3>连接协议与生成温度</h3>
                <p className="form-section-copy">先确认协议类型和生成温度，再进入模型地址、模型名和 API Key 这一条主配置链路。</p>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span className="form-field-label">常用模型服务</span>
                  <select name="service_preset" value={modelForm.service_preset} onChange={onChange} disabled={isBusy}>
                    {MODEL_SERVICE_PRESETS.map((preset) => (
                      <option key={preset.key} value={preset.key}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                  <span className="form-field-hint">
                    选择常见服务后会自动填入推荐 Base URL；切到“自定义”时，需要你自己填写完整服务地址。
                  </span>
                </label>

                <label className="form-field">
                  <span className="form-field-label">Provider</span>
                  <select name="provider" value={modelForm.provider} onChange={onChange} disabled={isBusy}>
                    <option value="openai-compatible">openai-compatible</option>
                  </select>
                  <span className="form-field-hint">当前页面默认按 OpenAI 兼容协议发起请求。</span>
                </label>

                <label className="form-field">
                  <span className="form-field-label">温度系数</span>
                  <input
                    name="temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={modelForm.temperature}
                    onChange={onChange}
                    disabled={isBusy}
                  />
                  <span className="form-field-hint">建议保持在 `0.2` 到 `0.7` 之间，便于预测解释和问答输出更稳定。</span>
                </label>
              </div>
            </section>

            <section className="form-section form-section-emphasis">
              <div className="form-section-head">
                <p className="form-section-kicker">主配置链路</p>
                <h3>Base URL / 模型名称 / API Key</h3>
                <p className="form-section-copy">这三项决定平台模型是否可用，也是测试连接和保存配置时最常见的问题来源。</p>
              </div>

              <div className="form-grid">
                <label className="form-field field-span-2">
                  <span className="form-field-label">Base URL</span>
                  <input
                    name="base_url"
                    value={modelForm.base_url}
                    onChange={onChange}
                    placeholder="https://api.example.com/v1"
                    disabled={isBusy}
                  />
                  <span className="form-field-hint">
                    {modelForm.service_preset === "custom"
                      ? "自定义模式下请手动填写服务根路径，不要拼到具体接口，系统会自动补全 `chat/completions`。"
                      : `当前已根据“${selectedPreset.label}”自动填入推荐地址；如需改为自己的代理或网关地址，直接修改这里即可。`}
                  </span>
                </label>

                <label className="form-field">
                  <span className="form-field-label">模型名称</span>
                  <input
                    name="model_name"
                    value={modelForm.model_name}
                    onChange={onChange}
                    placeholder={selectedPreset.placeholder || "gpt-4o-mini / deepseek-chat"}
                    disabled={isBusy}
                  />
                  <span className="form-field-hint">这里填写服务端实际暴露的模型标识，不要只写系列名。</span>
                </label>

                <label className="form-field">
                  <span className="form-field-label">API Key</span>
                  <input
                    name="api_key"
                    type="password"
                    value={modelForm.api_key}
                    onChange={onChange}
                    placeholder="sk-..."
                    disabled={isBusy}
                  />
                  <span className="form-field-hint">页面不会回显完整 Key；保存后只显示掩码，重新输入时会覆盖旧值。</span>
                </label>
              </div>
            </section>
          </div>

          <div className="form-action-bar">
            <div className="form-action-meta">
              <div className={`form-status-badge ${isBusy ? "is-busy" : ""}`.trim()}>{isBusy ? operationLabel : "待执行"}</div>
              <p className="form-action-note">
                {isBusy ? operationCopy : "建议先测试连接，再保存配置；“保存配置”是唯一主操作，“清除配置”仅在需要重置时使用。"}
              </p>
            </div>

            <div className="form-actions form-actions-priority">
              <button type="button" className="ghost-button" onClick={onTest} disabled={isBusy}>
                {isTestingLlm ? "测试中..." : "测试连接"}
              </button>
              <button type="button" className="ghost-button diagnostic-button" onClick={onDiagnose} disabled={isBusy}>
                {isDiagnosingLlm ? "诊断中..." : "诊断真实问答"}
              </button>
              <button type="button" className="primary-button" onClick={onSave} disabled={isBusy}>
                {isSavingLlm ? "保存中..." : "保存配置"}
              </button>
              <button type="button" className="danger-button" onClick={onClear} disabled={isBusy}>
                {isClearingLlm ? "清除中..." : "清除配置"}
              </button>
            </div>
          </div>

          {isBusy ? (
            <div className={`form-operation-strip is-${isTestingLlm ? "testing" : isDiagnosingLlm ? "diagnosing" : isSavingLlm ? "saving" : "clearing"}`.trim()}>
              <span className="form-operation-indicator" />
              <div>
                <strong>{operationLabel}</strong>
                <p>{operationCopy}</p>
              </div>
            </div>
          ) : null}

          <div className={`info-strip ${llmPreview.tone}`.trim()}>{llmPreview.text}</div>
        </Panel>

        <div className="page-side-stack">
          <section className="side-panel">
            <div className="side-panel-head">
              <p className="panel-kicker">运行状态</p>
              <h3>当前接入状态</h3>
            </div>
            <div className="status-tile-grid">
              <article className="status-tile">
                <span>当前平台模型</span>
                <strong>{llmConfig?.enabled ? llmConfig.model_name : "--"}</strong>
                <p>{llmConfig?.enabled ? llmConfig.base_url : "当前还没有保存平台级模型配置。"}</p>
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
              <p className="panel-kicker">接入建议</p>
              <h3>接入建议</h3>
            </div>
            <div className="info-list">
              <div className="info-list-item">
                <strong>Base URL 不要填到具体接口</strong>
                <p>只需要填到服务根路径，比如 `https://api.xxx.com/v1`，系统会自动拼接 `chat/completions`。</p>
              </div>
              <div className="info-list-item">
                <strong>常用模型可以直接选预设</strong>
                <p>智谱、DeepSeek、Gemini 和 OpenAI 都会自动带出推荐 URL；如果你走代理或私有网关，再切到“自定义”手动填写即可。</p>
              </div>
              <div className="info-list-item">
                <strong>先测试再保存</strong>
                <p>这样能更快定位是地址、Key 还是模型名的问题，保存后家庭和国家模块都会复用它。</p>
              </div>
              <div className="info-list-item">
                <strong>测试连接不等于真实问答稳定</strong>
                <p>短测试只能说明接口能通；如果你想排查国家独立问答的超时、限流或格式问题，请优先使用“诊断真实问答”。</p>
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

import Panel from "../components/Panel.jsx";
import { formatNumber } from "../lib/powerUtils.js";

export default function PredictionView({
  targetMonth,
  onTargetMonthChange,
  predictionContextForm,
  onPredictionContextChange,
  onRunPrediction,
  onRefreshPrediction,
  onRegenerateAdvice,
  prediction,
  predictionMeta,
  predictionViewModel
}) {
  return (
    <div className="module-view is-active" data-view="prediction">
      <Panel
        className="prediction-panel"
        kicker="预测结果"
        title="预测与建议"
        note="先生成结构化预测和贡献拆解，再把结果交给大模型生成解释与建议；如果模型不可用，会回退到规则版。"
        actions={
          <div className="prediction-actions prediction-toolbar">
            <label className="form-field toolbar-field">
              <span className="form-field-label">目标月份</span>
              <input type="month" value={targetMonth} onChange={onTargetMonthChange} />
              <span className="form-field-hint">可留空，系统会按当前可推断的下一个月份运行预测。</span>
            </label>

            <label className="form-field toolbar-field">
              <span className="form-field-label">目标月平均温度</span>
              <input
                type="number"
                name="avg_temperature"
                step="0.1"
                value={predictionContextForm.avg_temperature}
                onChange={onPredictionContextChange}
                placeholder="例如 31.5"
              />
              <span className="form-field-hint">可留空，系统会继续走季节规则。</span>
            </label>

            <label className="form-field toolbar-field">
              <span className="form-field-label">目标月节假日天数</span>
              <input
                type="number"
                name="holiday_count"
                min="0"
                step="1"
                value={predictionContextForm.holiday_count}
                onChange={onPredictionContextChange}
                placeholder="例如 4"
              />
              <span className="form-field-hint">用于计算节假日贡献，不填则默认不做额外节假日修正。</span>
            </label>

            <div className="toolbar-action-group">
              <button type="button" className="primary-button" onClick={onRunPrediction}>
                运行预测
              </button>
              <button type="button" className="ghost-button" onClick={onRefreshPrediction}>
                刷新结果
              </button>
              <button type="button" className="ghost-button" onClick={onRegenerateAdvice}>
                重新生成建议
              </button>
            </div>
          </div>
        }
      >
        <div className="result-grid result-grid-extended">
          <article className="metric-card">
            <span>目标月份</span>
            <strong>{prediction?.target_month || "--"}</strong>
          </article>
          <article className="metric-card">
            <span>预测用电量</span>
            <strong>{prediction ? `${formatNumber(prediction.predicted_kwh, 2)} kWh` : "--"}</strong>
          </article>
          <article className="metric-card">
            <span>历史基线</span>
            <strong>{predictionViewModel.baselineKwh}</strong>
          </article>
          <article className="metric-card">
            <span>预计电费</span>
            <strong>{predictionViewModel.predictedBill}</strong>
          </article>
          <article className="metric-card">
            <span>预测区间</span>
            <strong>{predictionViewModel.predictionRange}</strong>
          </article>
          <article className="metric-card">
            <span>相对最近月份</span>
            <strong>{predictionViewModel.deltaText}</strong>
          </article>
          <article className="metric-card">
            <span>主导贡献项</span>
            <strong>{predictionViewModel.dominantContributionLabel}</strong>
          </article>
          <article className="metric-card">
            <span>生成模式</span>
            <strong>{predictionMeta?.generation_mode || (prediction ? "saved" : "--")}</strong>
          </article>
        </div>

        <div className="info-strip muted">{predictionViewModel.note}</div>
        {predictionMeta?.llm_error ? <div className="pill">LLM 调用失败，已自动回退到规则生成</div> : null}

        <div className="context-shell">
          <div className="contribution-shell-head">
            <div>
              <h3>上下文对照</h3>
              <p className="subtle-note">把目标月输入和参考值并排展示，直接说明“这个贡献是相对谁算出来的”。</p>
            </div>
          </div>

          {predictionViewModel.contextComparisons.length ? (
            <div className="context-grid">
              {predictionViewModel.contextComparisons.map((item) => (
                <article key={item.key} className="context-card">
                  <div className="context-card-head">
                    <h3>{item.label}</h3>
                    <span className="status-label">参考：{item.sourceText}</span>
                  </div>
                  <div className="context-values">
                    <div className="context-value">
                      <span>{item.targetLabel}</span>
                      <strong>{item.targetText}</strong>
                    </div>
                    <div className="context-value">
                      <span>{item.referenceLabel}</span>
                      <strong>{item.referenceText}</strong>
                    </div>
                    <div className="context-value">
                      <span>{item.deltaLabel}</span>
                      <strong>{item.deltaText}</strong>
                    </div>
                  </div>
                  <p>{item.summary}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">填写目标月平均温度或节假日天数后，这里会显示目标值与参考值对照。</div>
          )}
        </div>

        <div className="waterfall-shell">
          <div className="contribution-shell-head">
            <div>
              <h3>贡献瀑布链路</h3>
              <p className="subtle-note">按“历史基线 → 各修正项 → 最终预测”的顺序展示累计过程。</p>
            </div>
          </div>

          {predictionViewModel.waterfallSteps.length ? (
            <div className="waterfall-strip">
              {predictionViewModel.waterfallSteps.map((item, index) => (
                <div key={item.key} className="waterfall-step-wrap">
                  <article className={`waterfall-step ${item.toneClass}`}>
                    <div className="waterfall-step-head">
                      <span>{item.label}</span>
                      <strong>{item.emphasis}</strong>
                    </div>
                    <div className="waterfall-bar-track">
                      <div className={`waterfall-bar ${item.barClass}`} style={{ width: item.barWidth }} />
                    </div>
                    <p>{item.detail}</p>
                  </article>
                  {index < predictionViewModel.waterfallSteps.length - 1 ? (
                    <div className="waterfall-arrow" aria-hidden="true">
                      →
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">执行预测后，这里会显示从基线到最终预测的累计链路。</div>
          )}
        </div>

        <div className="contribution-shell">
          <div className="contribution-shell-head">
            <div>
              <h3>贡献拆解</h3>
              <p className="subtle-note">把最终预测值拆成基线项和修正项，逐项解释每个数字来自哪里。</p>
            </div>
            <span className="status-label">{predictionViewModel.contributionCountText}</span>
          </div>

          {predictionViewModel.hasContributions ? (
            <div className="contribution-grid">
              {predictionViewModel.contributions.map((item) => (
                <article key={`${item.key}-${item.label}`} className={`contribution-card ${item.toneClass}`}>
                  <div className="contribution-card-head">
                    <div className="contribution-label">
                      <strong>{item.label}</strong>
                      <span>{item.typeLabel}</span>
                    </div>
                    <div className="contribution-value">
                      <strong>{item.formattedKwh}</strong>
                      <span>{item.formattedShare}</span>
                    </div>
                  </div>
                  <p>{item.summary}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">执行预测后，这里会显示结构化的贡献拆解。</div>
          )}

          {predictionViewModel.assumptions.length ? (
            <div className="contribution-shell">
              <div className="contribution-shell-head">
                <div>
                  <h3>预测假设</h3>
                  <p className="subtle-note">这些假设决定了本次预测依赖了哪些历史信息和修正条件。</p>
                </div>
              </div>
              <div className="assumption-list">
                {predictionViewModel.assumptions.map((item, index) => (
                  <span key={`${index}-${item}`} className="assumption-pill">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Panel>

      <Panel kicker="分析说明" title="原因分析与节能建议" note="这里的文本解释和建议都以上面的结构化贡献拆解为依据。">
        <div className="insight-grid">
          <div className="insight-card">
            <div className="insight-head">
              <h3>原因分析</h3>
              <span className="status-label">{prediction ? `目标月份 ${prediction.target_month}` : "等待结果"}</span>
            </div>
            <div className={`rich-text ${prediction ? "" : "empty-state"}`.trim()}>
              {prediction?.reason_text || "执行预测后会在这里显示原因分析。"}
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-head">
              <h3>节能建议</h3>
              <span className="status-label">{predictionMeta?.generation_mode || "--"}</span>
            </div>
            <div className={`rich-text ${prediction ? "" : "empty-state"}`.trim()}>
              {prediction?.advice_text || "执行预测后会在这里显示节能建议。"}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

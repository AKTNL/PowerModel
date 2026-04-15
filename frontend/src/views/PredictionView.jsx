import Panel from "../components/Panel.jsx";
import { formatNumber } from "../lib/powerUtils.js";

export default function PredictionView({
  targetMonth,
  onTargetMonthChange,
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
        kicker="Prediction"
        title="预测与建议"
        note="先出预测结果，再把结果交给大模型生成解释与建议；如果模型不可用，会自动回退到规则版。"
        actions={
          <div className="prediction-actions">
            <label>
              目标月份
              <input type="month" value={targetMonth} onChange={onTargetMonthChange} />
            </label>
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
            <span>生成模式</span>
            <strong>{predictionMeta?.generation_mode || (prediction ? "saved" : "--")}</strong>
          </article>
        </div>

        <div className="info-strip muted">{predictionViewModel.note}</div>
        {predictionMeta?.llm_error ? <div className="pill">LLM 调用失败，已自动回退到规则生成</div> : null}
      </Panel>

      <Panel kicker="Insight" title="原因分析与节能建议" note="这里展示的是最近一次预测对应的解释文本和建议文本。">
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

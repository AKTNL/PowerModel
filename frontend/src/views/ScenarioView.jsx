import Panel from "../components/Panel.jsx";

export default function ScenarioView({
  scenarioForm,
  onChange,
  onSimulate,
  scenarioResult,
  latestPrediction
}) {
  return (
    <div className="module-view is-active" data-view="scenario">
      <Panel
        kicker="Scenario"
        title="情景模拟"
        note="基于最近一次预测结果，模拟减少空调或热水器使用时长后的节电效果。"
      >
        <div className="form-grid">
          <label>
            空调每天减少时长
            <input
              name="reduce_ac_hours_per_day"
              type="number"
              min="0"
              step="0.1"
              value={scenarioForm.reduce_ac_hours_per_day}
              onChange={onChange}
              placeholder="1"
            />
          </label>
          <label>
            热水器每天减少时长
            <input
              name="reduce_water_heater_hours_per_day"
              type="number"
              min="0"
              step="0.1"
              value={scenarioForm.reduce_water_heater_hours_per_day}
              onChange={onChange}
              placeholder="0.5"
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="primary-button" onClick={onSimulate}>
            运行模拟
          </button>
        </div>

        <div className={`rich-text ${scenarioResult.empty ? "empty-state" : ""}`.trim()}>
          {scenarioResult.text}
        </div>

        <div className="summary-grid">
          <article className="summary-card">
            <span>模拟基线</span>
            <strong>{latestPrediction?.target_month || "--"}</strong>
            <p>{latestPrediction ? "最近一次预测会被当作情景模拟的基线。" : "需要先完成一次预测。"}</p>
          </article>
        </div>
      </Panel>
    </div>
  );
}

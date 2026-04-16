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
      <div className="page-grid">
        <Panel
          kicker="Scenario"
          title="情景模拟"
          note="基于最近一次预测结果，模拟减少空调或热水器使用时长后的节电效果，帮助用户判断调整习惯是否值得。"
        >
          <div className="page-intro-strip">
            <div className="intro-pill">
              <span>模拟基线</span>
              <strong>{latestPrediction?.target_month || "未就绪"}</strong>
            </div>
            <div className="intro-pill">
              <span>当前状态</span>
              <strong>{latestPrediction ? "可运行模拟" : "先做预测"}</strong>
            </div>
          </div>

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

          <div className={`result-console ${scenarioResult.empty ? "empty-state" : ""}`.trim()}>
            {scenarioResult.text}
          </div>
        </Panel>

        <div className="page-side-stack">
          <section className="side-panel">
            <div className="side-panel-head">
              <p className="panel-kicker">Baseline</p>
              <h3>模拟状态</h3>
            </div>
            <div className="status-tile-grid">
              <article className="status-tile">
                <span>目标月份</span>
                <strong>{latestPrediction?.target_month || "--"}</strong>
                <p>{latestPrediction ? "最近一次预测会被用作模拟基线。" : "需要先生成预测结果。"}</p>
              </article>
              <article className="status-tile status-green">
                <span>运行状态</span>
                <strong>{latestPrediction ? "READY" : "WAIT"}</strong>
                <p>{latestPrediction ? "当前可以直接调整参数并运行模拟。" : "先去预测页生成下月结果。"}</p>
              </article>
            </div>
          </section>

          <section className="side-panel">
            <div className="side-panel-head">
              <p className="panel-kicker">Assumption</p>
              <h3>结果说明</h3>
            </div>
            <div className="info-list">
              <div className="info-list-item">
                <strong>这是情景估算，不是精确控制</strong>
                <p>当前版本主要做“行为变化会带来多大影响”的方向性判断。</p>
              </div>
              <div className="info-list-item">
                <strong>最适合讲节能收益</strong>
                <p>答辩时可以直接用这页说明“如果用户改变习惯，系统能给出量化反馈”。</p>
              </div>
              <div className="info-list-item">
                <strong>建议先有预测再模拟</strong>
                <p>没有基线预测时，情景模拟的参考意义会明显下降。</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

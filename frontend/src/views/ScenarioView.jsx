import Panel from "../components/Panel.jsx";
import { formatNumber } from "../lib/powerUtils.js";

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
          kicker="情景评估"
          title="情景模拟"
          note="基于最近一次预测结果，按同一套预测口径做反事实模拟。默认保持天气和节假日预测不变，只改变可控行为参数。"
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
            <div className="intro-pill">
              <span>模拟逻辑</span>
              <strong>反事实重算</strong>
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
                placeholder="例如 1"
              />
            </label>
            <label>
              空调设定温度上调
              <input
                name="ac_setpoint_delta_c"
                type="number"
                min="0"
                step="0.5"
                value={scenarioForm.ac_setpoint_delta_c}
                onChange={onChange}
                placeholder="例如 1"
              />
            </label>
            <label>
              热水器模式
              <select name="water_heater_mode" value={scenarioForm.water_heater_mode} onChange={onChange}>
                <option value="keep">保持现状</option>
                <option value="timer">定时加热</option>
                <option value="eco">节能模式</option>
              </select>
            </label>
            <label>
              目标月外出天数
              <input
                name="away_days"
                type="number"
                min="0"
                step="1"
                value={scenarioForm.away_days}
                onChange={onChange}
                placeholder="例如 3"
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="primary-button" onClick={onSimulate}>
              运行模拟
            </button>
          </div>

          {scenarioResult.empty ? (
            <div className="result-console empty-state">{scenarioResult.summary}</div>
          ) : (
            <>
              <div className="result-grid">
                <article className="metric-card">
                  <span>基线用电量</span>
                  <strong>{formatNumber(scenarioResult.baseline_kwh, 2)} kWh</strong>
                </article>
                <article className="metric-card">
                  <span>模拟后用电量</span>
                  <strong>{formatNumber(scenarioResult.simulated_kwh, 2)} kWh</strong>
                </article>
                <article className="metric-card">
                  <span>预计节省电量</span>
                  <strong>{formatNumber(scenarioResult.saved_kwh, 2)} kWh</strong>
                </article>
                <article className="metric-card">
                  <span>预计节省电费</span>
                  <strong>{formatNumber(scenarioResult.saved_bill, 2)} 元</strong>
                </article>
              </div>

              <div className="info-strip">{scenarioResult.summary}</div>

              <div className="contribution-shell">
                <div className="contribution-shell-head">
                  <div>
                    <h3>变化贡献</h3>
                    <p className="subtle-note">这里展示的是相对当前预测基线的可控变化来源。</p>
                  </div>
                  <span className="status-label">{scenarioResult.scenario_contributions.length} 项变化</span>
                </div>

                {scenarioResult.scenario_contributions.length ? (
                  <div className="contribution-grid">
                    {scenarioResult.scenario_contributions.map((item, index) => (
                      <article key={`${item.label}-${index}`} className="contribution-card is-negative">
                        <div className="contribution-card-head">
                          <div className="contribution-label">
                            <strong>{item.label}</strong>
                            <span>情景变化</span>
                          </div>
                          <div className="contribution-value">
                            <strong>{`${Number(item.kwh) >= 0 ? "+" : ""}${formatNumber(item.kwh, 2)} kWh`}</strong>
                            <span>{item.direction === "decrease" ? "节电" : "增负荷"}</span>
                          </div>
                        </div>
                        <p>{item.summary}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">当前没有触发任何有效的情景调整项。</div>
                )}
              </div>
            </>
          )}
        </Panel>

        <div className="page-side-stack">
          <section className="side-panel">
            <div className="side-panel-head">
              <p className="panel-kicker">模拟基线</p>
              <h3>模拟状态</h3>
            </div>
            <div className="status-tile-grid">
              <article className="status-tile">
                <span>目标月份</span>
                <strong>{latestPrediction?.target_month || "--"}</strong>
                <p>{latestPrediction ? "最近一次预测会被用作反事实模拟基线。" : "需要先生成预测结果。"}</p>
              </article>
              <article className="status-tile status-green">
                <span>运行状态</span>
                <strong>{latestPrediction ? "READY" : "WAIT"}</strong>
                <p>{latestPrediction ? "当前可以直接调整参数并运行模拟。" : "先去预测页生成下个月结果。"}</p>
              </article>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

import Panel from "../components/Panel.jsx";
import { formatNumber } from "../lib/powerUtils.js";

function getTrendBars(records) {
  const recent = records.slice(-6);
  const max = Math.max(...recent.map((item) => Number(item.power_kwh) || 0), 1);

  return recent.map((item) => ({
    label: item.usage_month,
    value: Number(item.power_kwh) || 0,
    height: `${Math.max(16, (Number(item.power_kwh) / max) * 100)}%`
  }));
}

function getOperationSignals({ prediction, llmConfig, records }) {
  return [
    {
      label: "预测引擎",
      value: prediction ? "ONLINE" : "STANDBY",
      note: prediction ? `目标月份 ${prediction.target_month}` : "等待生成最新预测",
      tone: prediction ? "cyan" : "dim"
    },
    {
      label: "模型链路",
      value: llmConfig?.enabled ? "LINKED" : "RULES",
      note: llmConfig?.enabled ? llmConfig.model_name : "当前走规则兜底逻辑",
      tone: llmConfig?.enabled ? "amber" : "dim"
    },
    {
      label: "数据基线",
      value: records.length >= 3 ? "READY" : "LOW",
      note: records.length ? `已载入 ${records.length} 条记录` : "尚未录入历史数据",
      tone: records.length >= 3 ? "green" : "dim"
    }
  ];
}

export default function OverviewView({
  overview,
  records,
  prediction,
  llmConfig
}) {
  const trendBars = getTrendBars(records);
  const recentAverage =
    records.length > 0
      ? records.reduce((sum, item) => sum + (Number(item.power_kwh) || 0), 0) / records.length
      : null;
  const peakValue =
    records.length > 0
      ? Math.max(...records.map((item) => Number(item.power_kwh) || 0))
      : null;
  const operationSignals = getOperationSignals({ prediction, llmConfig, records });

  return (
    <div className="module-view is-active" data-view="overview">
      <section className="hero-board">
        <div className="hero-content">
          <p className="eyebrow">Mission Control</p>
          <h2 className="hero-title">家庭用电预测总览屏</h2>
          <p className="hero-copy">
            用一个首页把用户状态、模型接入、历史数据和下月预测全部集中展示，适合答辩时直接讲业务闭环。
          </p>

          <div className="hero-metrics">
            <article className="hero-metric">
              <span>当前家庭</span>
              <strong>{overview.userName}</strong>
              <p>{overview.userDesc}</p>
            </article>
            <article className="hero-metric">
              <span>下月预测</span>
              <strong>{overview.predictionKwh}</strong>
              <p>{overview.predictionDesc}</p>
            </article>
            <article className="hero-metric">
              <span>模型链路</span>
              <strong>{overview.llmStatus}</strong>
              <p>{overview.llmDesc}</p>
            </article>
          </div>
        </div>

        <div className="hero-side">
          <div className="signal-panel">
            <div className="signal-panel-head">
              <span className="signal-dot" />
              <span>System Signals</span>
            </div>
            <div className="signal-grid">
              {operationSignals.map((item) => (
                <article key={item.label} className={`signal-card signal-${item.tone}`.trim()}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.note}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Panel
        kicker="Live Trend"
        title="近 6 个月负荷走势"
        note="这个区域做成首页主视觉，答辩时可以先讲趋势，再切到预测和建议模块。"
      >
        <div className="trend-stage">
          <div className="trend-chart-card">
            {trendBars.length ? (
              <>
                <div className="trend-columns">
                  {trendBars.map((item) => (
                    <div key={item.label} className="trend-column">
                      <div className="trend-bar-shell">
                        <div className="trend-bar" style={{ height: item.height }} />
                      </div>
                      <strong>{formatNumber(item.value, 0)}</strong>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="trend-footer">
                  <div>
                    <span>均值</span>
                    <strong>{recentAverage !== null ? `${formatNumber(recentAverage, 1)} kWh` : "--"}</strong>
                  </div>
                  <div>
                    <span>峰值</span>
                    <strong>{peakValue !== null ? `${formatNumber(peakValue, 1)} kWh` : "--"}</strong>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">录入历史用电后，这里会显示大屏趋势柱状图。</div>
            )}
          </div>

          <div className="trend-summary-card">
            <p className="panel-kicker">Snapshot</p>
            <div className="trend-summary-list">
              <article>
                <span>最新月份</span>
                <strong>{overview.latestMonth}</strong>
                <p>{overview.latestDesc}</p>
              </article>
              <article>
                <span>近期均值</span>
                <strong>{overview.averageKwh}</strong>
                <p>{overview.averageDesc}</p>
              </article>
              <article>
                <span>生成模式</span>
                <strong>{overview.generationMode}</strong>
                <p>{overview.generationDesc}</p>
              </article>
              <article>
                <span>问答记录</span>
                <strong>{overview.chatCount}</strong>
                <p>{overview.chatDesc}</p>
              </article>
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        kicker="Dashboard"
        title="首页关键指标"
        note="保留几张高密度卡片，用来快速解释当前系统的数据状态和模型状态。"
      >
        <div className="overview-grid">
          <article className="overview-card">
            <span>历史记录</span>
            <strong>{overview.recordCount}</strong>
            <p>{overview.recordDesc}</p>
          </article>
          <article className="overview-card">
            <span>最新月份</span>
            <strong>{overview.latestMonth}</strong>
            <p>{overview.latestDesc}</p>
          </article>
          <article className="overview-card">
            <span>近期均值</span>
            <strong>{overview.averageKwh}</strong>
            <p>{overview.averageDesc}</p>
          </article>
          <article className="overview-card">
            <span>最近预测</span>
            <strong>{overview.predictionKwh}</strong>
            <p>{overview.predictionDesc}</p>
          </article>
        </div>
      </Panel>
    </div>
  );
}

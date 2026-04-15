import Panel from "../components/Panel.jsx";

const SHORTCUTS = [
  {
    key: "profile",
    index: "01",
    title: "先创建家庭用户",
    note: "没有用户画像时，其它模块都无法关联数据和模型配置。"
  },
  {
    key: "usage",
    index: "02",
    title: "录入历史用电",
    note: "至少准备几个月的月度数据，预测和建议才有基础。"
  },
  {
    key: "prediction",
    index: "03",
    title: "生成预测与建议",
    note: "跑出数值预测，再用大模型补解释和个性化建议。"
  }
];

export default function OverviewView({ overview, onNavigate }) {
  return (
    <div className="module-view is-active" data-view="overview">
      <Panel
        kicker="Overview"
        title="分模块之后的首页总览"
        note="把当前项目状态、关键指标和下一步动作集中到一个视图里，适合演示和答辩。"
      >
        <div className="overview-grid">
          <article className="overview-card">
            <span>当前家庭</span>
            <strong>{overview.userName}</strong>
            <p>{overview.userDesc}</p>
          </article>
          <article className="overview-card">
            <span>模型状态</span>
            <strong>{overview.llmStatus}</strong>
            <p>{overview.llmDesc}</p>
          </article>
          <article className="overview-card">
            <span>历史记录</span>
            <strong>{overview.recordCount}</strong>
            <p>{overview.recordDesc}</p>
          </article>
          <article className="overview-card">
            <span>最近预测</span>
            <strong>{overview.predictionKwh}</strong>
            <p>{overview.predictionDesc}</p>
          </article>
        </div>

        <div className="summary-grid">
          <article className="summary-card">
            <span>最新月份</span>
            <strong>{overview.latestMonth}</strong>
            <p>{overview.latestDesc}</p>
          </article>
          <article className="summary-card">
            <span>近期均值</span>
            <strong>{overview.averageKwh}</strong>
            <p>{overview.averageDesc}</p>
          </article>
          <article className="summary-card">
            <span>生成模式</span>
            <strong>{overview.generationMode}</strong>
            <p>{overview.generationDesc}</p>
          </article>
          <article className="summary-card">
            <span>问答记录</span>
            <strong>{overview.chatCount}</strong>
            <p>{overview.chatDesc}</p>
          </article>
        </div>
      </Panel>

      <Panel
        kicker="Next Step"
        title="推荐演示路径"
        note="如果这是第一次打开项目，建议按下面这个顺序操作。"
      >
        <div className="shortcut-grid">
          {SHORTCUTS.map((item) => (
            <button
              key={item.key}
              type="button"
              className="shortcut-card"
              onClick={() => onNavigate(item.key)}
            >
              <span>{item.index}</span>
              <strong>{item.title}</strong>
              <p>{item.note}</p>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

import { NAV_ITEMS } from "../lib/powerUtils.js";

export default function Sidebar({
  currentView,
  currentUsername,
  llmConfig,
  usageCount,
  latestPrediction,
  statusCards,
  onNavigate,
  isCollapsed,
  onToggleCollapse
}) {
  const cards =
    statusCards ||
    [
      { label: "当前用户", value: currentUsername || "尚未创建" },
      { label: "模型状态", value: llmConfig?.enabled ? llmConfig.model_name : "未配置" },
      { label: "数据与预测", value: `${usageCount} 条记录 / ${latestPrediction?.target_month || "--"}` }
    ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-bar">
          <p className="eyebrow">Household Power</p>
          <button
            type="button"
            className="sidebar-collapse-button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
            aria-pressed={isCollapsed}
            title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
          >
            <span className={`sidebar-collapse-icon ${isCollapsed ? "is-collapsed" : ""}`.trim()}>
              {isCollapsed ? ">>" : "<<"}
            </span>
          </button>
        </div>
        <h1>家庭 + 国家用电预测平台</h1>
        <p className="sidebar-copy">
          用统一的交互框架承载家庭预测和国家预测两套业务，让演示路径、页面风格和后续扩展都保持一致。
        </p>
      </div>

      <div className="sidebar-status">
        {cards.map((item) => (
          <div className="status-card" key={item.label}>
            <span className="status-label">{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const active = item.key === currentView;
          return (
            <button
              key={item.key}
              type="button"
              className={`sidebar-link ${active ? "is-active" : ""}`.trim()}
              onClick={() => onNavigate(item.key)}
              title={item.title}
              aria-label={item.title}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span className="sidebar-link-main">
                <span className="sidebar-link-title">{item.title}</span>
                <span className="sidebar-link-note">{item.note}</span>
              </span>
              <span className="sidebar-link-indicator" />
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <p className="subtle-note">
          现在这套壳既能跑家庭用户场景，也能承载国家级月度电力预测模块。
        </p>
      </div>
    </aside>
  );
}

import { NAV_ITEMS } from "../lib/powerUtils.js";

export default function Sidebar({
  currentView,
  currentUsername,
  llmConfig,
  usageCount,
  latestPrediction,
  onNavigate
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <p className="eyebrow">Household Power</p>
        <h1>家庭用电智能助手</h1>
        <p className="sidebar-copy">
          用传统预测模型做数值估计，用大模型做解释、建议和问答，让整个 Demo 更完整。
        </p>
      </div>

      <div className="sidebar-status">
        <div className="status-card">
          <span className="status-label">当前用户</span>
          <strong>{currentUsername || "尚未创建"}</strong>
        </div>
        <div className="status-card">
          <span className="status-label">模型状态</span>
          <strong>{llmConfig?.enabled ? llmConfig.model_name : "未配置"}</strong>
        </div>
        <div className="status-card">
          <span className="status-label">数据与预测</span>
          <strong>
            {usageCount} 条记录 / {latestPrediction?.target_month || "--"}
          </strong>
        </div>
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
          前端现已切换为 React 组件化结构，后端接口保持不变，便于后续继续扩展图表和交互。
        </p>
      </div>
    </aside>
  );
}

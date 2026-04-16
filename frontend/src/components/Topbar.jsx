export default function Topbar({
  title,
  note,
  currentUsername,
  llmConfig,
  latestPrediction
}) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">当前模块</p>
        <h2 className="topbar-title">{title}</h2>
        <p className="topbar-copy">{note}</p>
      </div>

      <div className="topbar-actions">
        <div className="topbar-meta">
          <span className="topbar-chip">User</span>
          <strong>{currentUsername || "未创建"}</strong>
        </div>
        <div className="topbar-meta">
          <span className="topbar-chip">LLM</span>
          <strong>{llmConfig?.enabled ? llmConfig.model_name : "未配置"}</strong>
        </div>
        <div className="topbar-meta">
          <span className="topbar-chip">Prediction</span>
          <strong>{latestPrediction?.target_month || "--"}</strong>
        </div>
      </div>
    </header>
  );
}

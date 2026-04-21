export default function Topbar({
  title,
  note,
  currentUsername,
  llmConfig,
  latestPrediction,
  metaItems
}) {
  const items =
    metaItems ||
    [
      { label: "User", value: currentUsername || "未创建" },
      { label: "LLM", value: llmConfig?.enabled ? llmConfig.model_name : "未配置" },
      { label: "Prediction", value: latestPrediction?.target_month || "--" }
    ];

  return (
    <header className="topbar">
      <div className="topbar-main">
        <p className="eyebrow">当前模块</p>
        <h2 className="topbar-title">{title}</h2>
        <p className="topbar-copy">{note}</p>
      </div>

      <div className="topbar-actions">
        {items.map((item) => (
          <div className="topbar-meta" key={item.label}>
            <span className="topbar-chip">{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </header>
  );
}

function buildSeriesGeometry(series, width, height, padding) {
  const values = series.flatMap((item) => item.y || []);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  return series.map((item) => {
    const points = item.y.map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(item.y.length - 1, 1);
      const y = height - padding - ((Number(value) - minValue) / range) * (height - padding * 2);
      return { x, y, value, label: item.x[index] };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");
    const areaPath = `${linePath} L ${points.at(-1)?.x ?? padding} ${height - padding} L ${points[0]?.x ?? padding} ${height - padding} Z`;
    const barWidth = Math.max(18, (width - padding * 2) / Math.max(item.y.length * 1.8, 1));

    return { ...item, points, linePath, areaPath, barWidth };
  });
}

export default function NationalSeriesChart({ title, caption, series = [] }) {
  if (!series.length) {
    return (
      <div className="usage-card">
        <div className="usage-card-head">
          <h3>{title}</h3>
          <span className="status-label">等待结果</span>
        </div>
        <div className="empty-state">{caption || "运行预测后这里会出现图表。"}</div>
      </div>
    );
  }

  const width = 640;
  const height = 240;
  const padding = 36;
  const geometries = buildSeriesGeometry(series, width, height, padding);

  return (
    <div className="usage-card">
      <div className="usage-card-head">
        <h3>{title}</h3>
        <span className="status-label">{series.length} 条序列</span>
      </div>
      <p className="national-chart-caption">{caption}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="national-chart" role="img" aria-label={title}>
        <rect x="0" y="0" width={width} height={height} rx="20" fill="rgba(255,255,255,0.015)" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(169,188,199,0.16)" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(169,188,199,0.16)" />
        {geometries.map((item) => (
          <g key={item.name}>
            {item.chart_type === "bar"
              ? item.points.map((point) => (
                  <rect
                    key={`${item.name}-${point.label}`}
                    x={point.x - item.barWidth / 2}
                    y={point.y}
                    width={item.barWidth}
                    height={height - padding - point.y}
                    rx="8"
                    fill={item.color || "#6fd2cf"}
                    opacity="0.92"
                  />
                ))
              : (
                  <>
                    {item.chart_type === "area" ? <path d={item.areaPath} fill={`${item.color}22`} /> : null}
                    <path d={item.linePath} fill="none" stroke={item.color || "#6fd2cf"} strokeWidth="3" strokeLinecap="round" />
                    {item.points.map((point) => (
                      <circle key={`${item.name}-${point.label}`} cx={point.x} cy={point.y} r="3.5" fill={item.color || "#6fd2cf"} />
                    ))}
                  </>
                )}
          </g>
        ))}
      </svg>
      <div className="national-chart-legend">
        {series.map((item) => (
          <div className="legend-item" key={item.name}>
            <span className="legend-dot" style={{ backgroundColor: item.color || "#6fd2cf" }} />
            <span>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

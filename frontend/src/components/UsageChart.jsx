function buildPoints(records) {
  const values = records.map((item) => Number(item.power_kwh));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  return records.map((record, index) => {
    const x = 56 + (index * (640 - 112)) / Math.max(records.length - 1, 1);
    const y = 188 - ((Number(record.power_kwh) - minValue) / range) * 132;
    return {
      x,
      y,
      label: record.usage_month,
      value: Number(record.power_kwh)
    };
  });
}

export default function UsageChart({ records }) {
  if (!records.length) {
    return (
      <svg id="usage-chart" viewBox="0 0 640 240" role="img" aria-label="暂无用电趋势图">
        <rect x="0" y="0" width="640" height="240" rx="18" fill="rgba(255,255,255,0.02)" />
        <text x="320" y="124" textAnchor="middle" fill="rgba(169,188,199,0.8)" fontSize="16">
          录入有效数据后显示趋势图
        </text>
      </svg>
    );
  }

  const points = buildPoints(records);
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${points.at(-1).x.toFixed(2)} 208 L ${points[0].x.toFixed(2)} 208 Z`;

  return (
    <svg id="usage-chart" viewBox="0 0 640 240" role="img" aria-label="历史用电趋势图">
      <defs>
        <linearGradient id="usage-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(115, 199, 255, 0.3)" />
          <stop offset="100%" stopColor="rgba(115, 199, 255, 0.02)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="640" height="240" rx="18" fill="rgba(255,255,255,0.01)" />
      <line x1="48" y1="32" x2="48" y2="208" stroke="rgba(255,255,255,0.12)" />
      <line x1="48" y1="208" x2="592" y2="208" stroke="rgba(255,255,255,0.12)" />
      <path d={areaPath} fill="url(#usage-fill)" />
      <path d={linePath} fill="none" stroke="#8fd3ff" strokeWidth="3.5" strokeLinecap="round" />
      {points.map((point) => (
        <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="4.5" fill="#f0c488" />
          <text x={point.x} y={point.y - 12} textAnchor="middle" fill="#f4f7fb" fontSize="11">
            {point.value.toFixed(0)}
          </text>
          <text x={point.x} y="224" textAnchor="middle" fill="rgba(196,207,219,0.72)" fontSize="11">
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

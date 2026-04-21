import { useMemo, useState } from "react";

function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "--";
  }

  return numeric.toLocaleString("zh-CN", {
    minimumFractionDigits: numeric >= 100 ? 1 : 3,
    maximumFractionDigits: numeric >= 100 ? 1 : 3
  });
}

function buildChartModel(series, width, height, padding) {
  const labelSet = new Set();
  const labels = [];

  series.forEach((item) => {
    (item.x || []).forEach((label) => {
      const cooked = String(label);
      if (!labelSet.has(cooked)) {
        labelSet.add(cooked);
        labels.push(cooked);
      }
    });
  });

  const values = series.flatMap((item) => (item.y || []).map((value) => Number(value)).filter((value) => Number.isFinite(value)));
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 1;
  const hasBarChart = series.some((item) => item.chart_type === "bar");
  const valueRange = maxValue - minValue;
  const yPadding = valueRange > 0 ? valueRange * 0.12 : Math.max(Math.abs(maxValue) * 0.15, 1);
  const yMin = hasBarChart ? Math.min(0, minValue - yPadding * 0.18) : minValue - yPadding;
  const yMax = maxValue + yPadding;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const xStep = labels.length > 1 ? innerWidth / (labels.length - 1) : 0;
  const barSlotWidth = innerWidth / Math.max(labels.length, 1);
  const lineLabelPositions = new Map(
    labels.map((label, index) => [
      label,
      labels.length === 1 ? padding.left + innerWidth / 2 : padding.left + index * xStep
    ])
  );
  const barLabelPositions = new Map(
    labels.map((label, index) => [
      label,
      padding.left + barSlotWidth * (index + 0.5)
    ])
  );
  const yScale = (value) => padding.top + (1 - (Number(value) - yMin) / Math.max(yMax - yMin, 1e-6)) * innerHeight;
  const baselineY = padding.top + innerHeight;
  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount }, (_, index) => {
    const ratio = index / (tickCount - 1);
    const value = yMax - (yMax - yMin) * ratio;
    return {
      y: yScale(value),
      value,
      label: formatNumber(value)
    };
  });
  const xTickStep = Math.max(1, Math.ceil(labels.length / 6));
  const tickPositionMap = series.every((item) => item.chart_type === "bar") ? barLabelPositions : lineLabelPositions;
  const xTicks = labels
    .map((label, index) => ({
      label,
      x: tickPositionMap.get(label),
      visible: index === 0 || index === labels.length - 1 || index % xTickStep === 0
    }))
    .filter((item) => item.visible);

  const geometries = series.map((item) => {
    const points = item.y.map((value, index) => {
      const label = String(item.x[index]);
      return {
        x: (item.chart_type === "bar" ? barLabelPositions : lineLabelPositions).get(label) ?? padding.left,
        y: yScale(value),
        value: Number(value),
        label
      };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");
    const areaPath = `${linePath} L ${points.at(-1)?.x ?? padding.left} ${baselineY} L ${points[0]?.x ?? padding.left} ${baselineY} Z`;
    const barWidth = Math.min(42, Math.max(18, barSlotWidth * 0.68));

    return {
      ...item,
      points,
      linePath,
      areaPath,
      barWidth
    };
  });

  return {
    geometries,
    xTicks,
    yTicks,
    width,
    height,
    padding
  };
}

export default function NationalSeriesChart({ title, caption, series = [] }) {
  const [activeDatum, setActiveDatum] = useState(null);

  const chartModel = useMemo(() => {
    if (!series.length) {
      return null;
    }

    return buildChartModel(series, 640, 264, {
      top: 24,
      right: 20,
      bottom: 44,
      left: 72
    });
  }, [series]);

  if (!series.length || !chartModel) {
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

  const { geometries, xTicks, yTicks, width, height, padding } = chartModel;
  const tooltipStyle = activeDatum
    ? {
        left: `${Math.min(Math.max((activeDatum.x / width) * 100, 10), 90)}%`,
        top: `${Math.min(Math.max((activeDatum.y / height) * 100, 14), 78)}%`
      }
    : undefined;

  return (
    <div className="usage-card national-chart-card" onMouseLeave={() => setActiveDatum(null)}>
      <div className="usage-card-head">
        <h3>{title}</h3>
        <span className="status-label">{series.length} 条序列</span>
      </div>
      <p className="national-chart-caption">{caption}</p>
      <div className="national-chart-shell">
        <svg viewBox={`0 0 ${width} ${height}`} className="national-chart" role="img" aria-label={title}>
          <rect x="0" y="0" width={width} height={height} rx="20" fill="rgba(255,255,255,0.015)" />
          {yTicks.map((tick) => (
            <g key={`y-${tick.y.toFixed(2)}`}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={width - padding.right}
                y2={tick.y}
                stroke="rgba(255, 255, 255, 0.06)"
                strokeDasharray="4 6"
              />
              <text x={padding.left - 12} y={tick.y + 4} textAnchor="end" className="national-chart-axis-label">
                {tick.label}
              </text>
            </g>
          ))}
          <text x={padding.left - 12} y={padding.top - 6} textAnchor="start" className="national-chart-axis-unit">
            单位：亿千瓦时
          </text>
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="rgba(255,255,255,0.18)"
          />
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="rgba(255,255,255,0.18)"
          />
          <text x={width - padding.right} y={height - padding.bottom - 10} textAnchor="end" className="national-chart-axis-unit">
            月份
          </text>
          {xTicks.map((tick) => (
            <g key={`x-${tick.label}`}>
              <line
                x1={tick.x}
                y1={height - padding.bottom}
                x2={tick.x}
                y2={height - padding.bottom + 6}
                stroke="rgba(255,255,255,0.18)"
              />
              <text x={tick.x} y={height - 12} textAnchor="middle" className="national-chart-axis-label">
                {tick.label}
              </text>
            </g>
          ))}
          {geometries.map((item) => (
            <g key={item.name}>
              {item.chart_type === "bar"
                ? item.points.map((point) => (
                    <g key={`${item.name}-${point.label}`}>
                      <rect
                        x={point.x - item.barWidth / 2}
                        y={point.y}
                        width={item.barWidth}
                        height={height - padding.bottom - point.y}
                        rx="10"
                        fill={item.color || "#6fd2cf"}
                        opacity="0.92"
                        onMouseEnter={() =>
                          setActiveDatum({
                            seriesName: item.name,
                            label: point.label,
                            value: point.value,
                            color: item.color || "#6fd2cf",
                            x: point.x,
                            y: point.y
                          })
                        }
                        onFocus={() =>
                          setActiveDatum({
                            seriesName: item.name,
                            label: point.label,
                            value: point.value,
                            color: item.color || "#6fd2cf",
                            x: point.x,
                            y: point.y
                          })
                        }
                        onBlur={() => setActiveDatum(null)}
                        tabIndex={0}
                      />
                      <text x={point.x} y={point.y - 10} textAnchor="middle" className="national-chart-point-label">
                        {formatNumber(point.value)}
                      </text>
                    </g>
                  ))
                : (
                    <>
                      {item.chart_type === "area" ? <path d={item.areaPath} fill={`${item.color || "#6fd2cf"}1f`} /> : null}
                      <path
                        d={item.linePath}
                        fill="none"
                        stroke={item.color || "#6fd2cf"}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {item.points.map((point) => (
                        <g key={`${item.name}-${point.label}`}>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="9"
                            fill="transparent"
                            onMouseEnter={() =>
                              setActiveDatum({
                                seriesName: item.name,
                                label: point.label,
                                value: point.value,
                                color: item.color || "#6fd2cf",
                                x: point.x,
                                y: point.y
                              })
                            }
                            onFocus={() =>
                              setActiveDatum({
                                seriesName: item.name,
                                label: point.label,
                                value: point.value,
                                color: item.color || "#6fd2cf",
                                x: point.x,
                                y: point.y
                              })
                            }
                            onBlur={() => setActiveDatum(null)}
                            tabIndex={0}
                          />
                          <circle cx={point.x} cy={point.y} r="3.8" fill={item.color || "#6fd2cf"} pointerEvents="none" />
                        </g>
                      ))}
                    </>
                  )}
            </g>
          ))}
        </svg>
        {activeDatum ? (
          <div className="national-chart-tooltip" style={tooltipStyle}>
            <span className="legend-dot" style={{ backgroundColor: activeDatum.color }} />
            <div className="national-chart-tooltip-copy">
              <strong>{activeDatum.seriesName}</strong>
              <span>{activeDatum.label}</span>
              <span>{formatNumber(activeDatum.value)}</span>
              <span className="national-chart-tooltip-unit">单位：亿千瓦时</span>
            </div>
          </div>
        ) : null}
      </div>
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

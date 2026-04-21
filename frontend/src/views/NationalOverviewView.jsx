import NationalSeriesChart from "../components/NationalSeriesChart.jsx";
import Panel from "../components/Panel.jsx";

export default function NationalOverviewView({
  runResult,
  datasetSource,
  onDatasetSourceChange,
  forecastPeriods,
  onForecastPeriodsChange,
  uploadState,
  onImportClick,
  onFileChange,
  fileInputRef,
  onRunForecast,
  overviewCards,
  supplementSeries,
  isBooting,
  isRunning
}) {
  return (
    <div className="module-view is-active" data-view="national-overview">
      <section className="hero-board">
        <div className="hero-content">
          <p className="eyebrow">国家模块</p>
          <h2 className="hero-title">国家用电预测总览</h2>
          <p className="hero-copy">在当前家庭系统的框架里接入国家级月度用电预测，统一展示数据来源、预测区间、分析报告与问答工作台。</p>
        </div>
        <div className="hero-side">
          <div className="signal-panel compact-panel">
            <div className="signal-panel-head">
              <span className="signal-dot" />
              <span>运行操作</span>
            </div>
            <p className="hero-copy">选择数据来源和预测月份数后，即可在当前工作区直接运行国家预测。</p>
            <button className="primary-button" type="button" onClick={onRunForecast} disabled={isBooting || isRunning}>
              {isRunning ? "正在运行..." : "运行国家预测"}
            </button>
          </div>
        </div>
      </section>

      <Panel kicker="数据设置" title="数据与参数" note="默认使用内置国家能源局公开数据，也支持上传同结构 CSV。">
        <div className="national-control-grid">
          <div className="form-panel">
            <div className="toggle-row">
              <label className="toggle-option">
                <input
                  type="radio"
                  name="nationalDatasetSource"
                  checked={datasetSource === "default"}
                  onChange={() => onDatasetSourceChange("default")}
                />
                <span>官方数据</span>
              </label>
              <label className="toggle-option">
                <input
                  type="radio"
                  name="nationalDatasetSource"
                  checked={datasetSource === "uploaded"}
                  onChange={() => onDatasetSourceChange("uploaded")}
                />
                <span>上传 CSV</span>
              </label>
            </div>

            <div className="field-grid">
              <label className="field-block">
                <span>预测月份数</span>
                <input
                  type="number"
                  min="6"
                  max="12"
                  value={forecastPeriods}
                  onChange={(event) => onForecastPeriodsChange(event.target.value)}
                />
              </label>
              <label className="field-block">
                <span>上传数据</span>
                <button type="button" className="ghost-button" onClick={onImportClick}>
                  选择 CSV
                </button>
              </label>
            </div>

            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFileChange} />

            <div className="info-strip muted">
              {uploadState.validation
                ? `已校验 ${uploadState.filename}，区间 ${uploadState.validation.summary.history_start} 至 ${uploadState.validation.summary.history_end}`
                : "未上传自定义数据时，将直接使用仓库内置的国家级官方月度数据。"}
            </div>
          </div>

          <div className="summary-grid">
            {overviewCards.map((item) => (
              <article className="summary-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </div>
      </Panel>

      <Panel kicker="趋势分析" title="国家预测图表" note="保留国家模块的业务语义，同时统一使用当前项目的图表容器和工作区布局。">
        <div className="usage-grid national-chart-grid">
          <NationalSeriesChart title="历史趋势" caption="历史用电量与 3 个月移动均值。" series={runResult.charts.history} />
          <NationalSeriesChart title="预测区间" caption="未来月份的预测值和上下界。" series={runResult.charts.forecast} />
          <NationalSeriesChart title="季节性分布" caption="按月份统计的平均用电量。" series={runResult.charts.seasonality} />
          <NationalSeriesChart
            title="预测高位月份"
            caption="挑出预测值较高的月份，方便快速定位未来潜在高峰。"
            series={supplementSeries}
          />
          <div className="usage-card national-table-card">
            <div className="usage-card-head">
              <h3>预测结果表</h3>
              <span className="status-label">{runResult.forecast.length} 行</span>
            </div>
            {runResult.forecast.length ? (
              <div className="table-shell">
                <table className="usage-table">
                  <thead>
                    <tr>
                      <th>月份</th>
                      <th>预测值</th>
                      <th>下界</th>
                      <th>上界</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runResult.forecast.map((item) => (
                      <tr key={item.date}>
                        <td>{item.date}</td>
                        <td>{item.forecast}</td>
                        <td>{item.lower_bound}</td>
                        <td>{item.upper_bound}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">运行预测后，这里会显示未来月份结果。</div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

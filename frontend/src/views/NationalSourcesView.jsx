import Panel from "../components/Panel.jsx";

function buildCleanRows(defaultDataset, runResult) {
  if (runResult.history?.length) {
    return runResult.history.map((item) => ({
      date: item.date,
      consumption_billion_kwh: item.value,
      is_imputed: item.is_imputed,
      source: item.source,
      source_url: item.source_url,
      note: item.note
    }));
  }

  return (
    defaultDataset?.cleaned_records?.map((item) => ({
      date: item.date,
      consumption_billion_kwh: item.value,
      is_imputed: item.is_imputed,
      source: item.source,
      source_url: item.source_url,
      note: item.note
    })) || []
  );
}

function renderTable(rows, title) {
  if (!rows.length) {
    return <div className="empty-state">暂无数据。</div>;
  }

  const columns = Object.keys(rows[0]);
  return (
    <div className="usage-card">
      <div className="usage-card-head">
        <h3>{title}</h3>
        <span className="status-label">{rows.length} 行</span>
      </div>
      <div className="table-shell">
        <table className="usage-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 24).map((row, index) => (
              <tr key={`${title}-${index}`}>
                {columns.map((column) => (
                  <td key={`${title}-${index}-${column}`}>{`${row[column] ?? ""}`}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function NationalSourcesView({ meta, defaultDataset, runResult, uploadState }) {
  const rawRows = runResult.raw_records?.length ? runResult.raw_records : defaultDataset?.raw_records || [];
  const cleanRows = buildCleanRows(defaultDataset, runResult);

  return (
    <div className="module-view is-active" data-view="national-sources">
      <Panel kicker="来源文档" title="国家数据来源与字段说明" note="保留国家模块的数据口径说明，方便你在答辩或演示时解释数据来源。">
        <div className="insight-grid">
          <div className="insight-card markdown-panel">
            <div className="insight-head">
              <h3>字段说明</h3>
            </div>
            <pre>{meta?.documents?.data_schema_markdown || "加载中..."}</pre>
          </div>
          <div className="insight-card markdown-panel">
            <div className="insight-head">
              <h3>官方来源</h3>
            </div>
            <pre>{meta?.documents?.official_sources_markdown || "加载中..."}</pre>
          </div>
        </div>
        {uploadState.validation ? (
          <div className="info-strip muted">
            上传文件 {uploadState.filename} 已通过校验，历史区间 {uploadState.validation.summary.history_start} 至 {uploadState.validation.summary.history_end}。
          </div>
        ) : null}
      </Panel>

      <Panel kicker="数据预览" title="数据预览" note="默认展示清洗后数据和原始来源数据，各取前 24 行。">
        <div className="usage-grid national-source-grid">
          {renderTable(cleanRows, "清洗后数据")}
          {renderTable(rawRows, "原始来源数据")}
        </div>
      </Panel>
    </div>
  );
}

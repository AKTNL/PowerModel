import Panel from "../components/Panel.jsx";
import UsageChart from "../components/UsageChart.jsx";
import { formatNumber } from "../lib/powerUtils.js";

export default function UsageView({
  usageDraft,
  onUsageChange,
  onDeleteRow,
  onAddRow,
  onFillDemo,
  onImportClick,
  onDownloadTemplate,
  onUploadUsage,
  onRefreshUsage,
  onFileChange,
  fileInputRef,
  draftStatus,
  renderableRecords,
  usageSummary
}) {
  return (
    <div className="module-view is-active" data-view="usage">
      <Panel
        kicker="Usage"
        title="历史用电"
        note="你可以直接录入月度数据，也可以从 Excel 导出成 CSV 后导入。上传时只会提交有效行。"
      >
        <div className="toolbar">
          <button type="button" className="ghost-button" onClick={onFillDemo}>
            填充示例
          </button>
          <button type="button" className="ghost-button" onClick={onAddRow}>
            新增一行
          </button>
          <button type="button" className="ghost-button" onClick={onImportClick}>
            导入 CSV
          </button>
          <button type="button" className="ghost-button" onClick={onDownloadTemplate}>
            下载模板
          </button>
          <button type="button" className="primary-button" onClick={onUploadUsage}>
            上传记录
          </button>
          <button type="button" className="ghost-button" onClick={onRefreshUsage}>
            刷新记录
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onFileChange}
        />

        <div className="draft-status">{draftStatus}</div>

        <div className="table-shell">
          <table className="usage-table">
            <thead>
              <tr>
                <th>月份</th>
                <th>用电量 kWh</th>
                <th>电费</th>
                <th>平均温度</th>
                <th>节假日天数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {usageDraft.map((row, index) => (
                <tr key={`${index}-${row.usage_month}`}>
                  <td>
                    <input
                      type="month"
                      value={row.usage_month}
                      onChange={(event) => onUsageChange(index, "usage_month", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={row.power_kwh}
                      placeholder="188"
                      onChange={(event) => onUsageChange(index, "power_kwh", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={row.bill_amount}
                      placeholder="105.3"
                      onChange={(event) => onUsageChange(index, "bill_amount", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.1"
                      value={row.avg_temperature}
                      placeholder="18"
                      onChange={(event) => onUsageChange(index, "avg_temperature", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={row.holiday_count}
                      placeholder="3"
                      onChange={(event) => onUsageChange(index, "holiday_count", event.target.value)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="table-action-button danger"
                      onClick={() => onDeleteRow(index)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="summary-grid">
          <article className="summary-card">
            <span>最新月份</span>
            <strong>{usageSummary.latestMonth}</strong>
            <p>{usageSummary.latestValue}</p>
          </article>
          <article className="summary-card">
            <span>最近均值</span>
            <strong>{usageSummary.recentAverage}</strong>
            <p>{usageSummary.recentNote}</p>
          </article>
          <article className="summary-card">
            <span>峰值月份</span>
            <strong>{usageSummary.peakMonth}</strong>
            <p>{usageSummary.peakValue}</p>
          </article>
          <article className="summary-card">
            <span>有效记录</span>
            <strong>{usageSummary.recordCount}</strong>
            <p>{usageSummary.recordNote}</p>
          </article>
        </div>
      </Panel>

      <Panel kicker="Trend" title="趋势图与最近记录" note="图表和列表都基于当前草稿中的有效记录实时更新。">
        <div className="usage-grid">
          <div className="usage-card">
            <div className="usage-card-head">
              <h3>月度趋势</h3>
              <span className="status-label">{renderableRecords.length} 条有效记录</span>
            </div>
            <UsageChart records={renderableRecords} />
          </div>

          <div className="usage-card">
            <div className="usage-card-head">
              <h3>最近记录</h3>
              <span className="status-label">按月份倒序</span>
            </div>
            {renderableRecords.length ? (
              <div className="usage-list">
                {renderableRecords
                  .slice(-8)
                  .reverse()
                  .map((record) => (
                    <div className="usage-row" key={record.usage_month}>
                      <strong>{record.usage_month}</strong>
                      <span>{formatNumber(record.power_kwh)} kWh</span>
                      <span>{record.bill_amount !== null ? `${formatNumber(record.bill_amount)} 元` : "--"}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="empty-state">还没有有效用电记录。</div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

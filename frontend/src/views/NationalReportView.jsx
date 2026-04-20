import Panel from "../components/Panel.jsx";

export default function NationalReportView({
  runResult,
  reportQuestion,
  onReportQuestionChange,
  onAskQuestion,
  reportAnswer,
  onPolishReport
}) {
  return (
    <div className="module-view is-active" data-view="national-report">
      <Panel
        kicker="Report"
        title="国家分析报告"
        note="先用本地规则生成报告，再按需用大模型做润色；问答工作台与报告共用同一份预测上下文。"
        actions={
          <button type="button" className="ghost-button" onClick={onPolishReport} disabled={!runResult.report?.draft}>
            重新润色
          </button>
        }
      >
        <div className="insight-grid">
          <div className="insight-card">
            <div className="insight-head">
              <h3>自动分析报告</h3>
              <span className="status-label">{runResult.report?.status || "waiting"}</span>
            </div>
            <div className="info-strip muted">{runResult.report?.status_message || "先运行一次国家预测。"}</div>
            <textarea className="national-report-textarea" readOnly value={runResult.report?.draft || ""} rows={18} />
          </div>

          <div className="insight-card">
            <div className="insight-head">
              <h3>问答工作台</h3>
              <span className="status-label">National QA</span>
            </div>
            <label className="field-block">
              <span>问题</span>
              <input
                value={reportQuestion}
                onChange={(event) => onReportQuestionChange(event.target.value)}
                placeholder="例如：未来一年全国用电量趋势如何？"
              />
            </label>
            <button type="button" className="primary-button" onClick={onAskQuestion} disabled={!runResult.stats || !reportQuestion.trim()}>
              发送问题
            </button>
            <div className="info-strip muted">{reportAnswer.message || "提交问题后，这里会显示回答来源状态。"}</div>
            <div className="rich-text">{reportAnswer.answer || "运行预测并提问后，这里会显示国家模块的回答。"}</div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

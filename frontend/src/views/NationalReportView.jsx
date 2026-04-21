import Panel from "../components/Panel.jsx";

export default function NationalReportView({
  runResult,
  llmMode,
  onLlmModeChange,
  llmModeSummary,
  reportQuestion,
  onReportQuestionChange,
  onAskQuestion,
  reportAnswer,
  qaHistory,
  onPolishReport,
  isPolishingReport,
  isAskingQuestion
}) {
  const statusLabelMap = {
    sending: "发送中",
    local: "本地规则",
    cloud: "云端润色",
    cloud_rewrite: "云端润色",
    cloud_direct: "云端独立回答",
    fallback_local: "回退到本地",
    error: "请求失败"
  };
  const modeLabelMap = {
    local: "本地规则",
    cloud_rewrite: "云端润色",
    cloud_direct: "云端独立回答"
  };
  const answerTone =
    reportAnswer.status === "cloud_rewrite" || reportAnswer.status === "cloud_direct"
      ? "success"
      : reportAnswer.status === "fallback_local" || reportAnswer.status === "error"
        ? "error"
        : "muted";

  function formatHistoryTime(value) {
    if (!value) {
      return "--";
    }

    return new Date(value).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  return (
    <div className="module-view is-active" data-view="national-report">
      <Panel
        kicker="分析报告"
        title="国家分析报告"
        note="报告先基于本地预测生成，再按需用共享平台模型润色；问答工作台可以在本地规则、云端润色和云端独立回答三种模式之间切换。"
        actions={
          <div className="report-actions">
            <div className="report-mode-picker">
              <span className="report-mode-label">问答模式</span>
              <div className="toggle-row compact-toggle-row">
                <label className={`toggle-option ${llmMode === "local" ? "is-active" : ""}`.trim()}>
                  <input
                    type="radio"
                    name="nationalLlmMode"
                    checked={llmMode === "local"}
                    onChange={() => onLlmModeChange("local")}
                  />
                  <span>本地规则</span>
                </label>
                <label className={`toggle-option ${llmMode === "cloud_rewrite" ? "is-active" : ""}`.trim()}>
                  <input
                    type="radio"
                    name="nationalLlmMode"
                    checked={llmMode === "cloud_rewrite"}
                    onChange={() => onLlmModeChange("cloud_rewrite")}
                  />
                  <span>云端润色</span>
                </label>
                <label className={`toggle-option ${llmMode === "cloud_direct" ? "is-active" : ""}`.trim()}>
                  <input
                    type="radio"
                    name="nationalLlmMode"
                    checked={llmMode === "cloud_direct"}
                    onChange={() => onLlmModeChange("cloud_direct")}
                  />
                  <span>云端独立回答</span>
                </label>
              </div>
            </div>

            <button type="button" className="ghost-button" onClick={onPolishReport} disabled={!runResult.report?.draft || isPolishingReport}>
              {isPolishingReport ? "正在润色..." : "重新润色"}
            </button>
          </div>
        }
      >
        <div className={`info-strip ${llmModeSummary.tone}`.trim()}>{llmModeSummary.text}</div>

        <div className="insight-grid">
          <div className="insight-card">
            <div className="insight-head">
              <h3>自动分析报告</h3>
              <span className="status-label">{statusLabelMap[runResult.report?.status] || runResult.report?.status || "等待生成"}</span>
            </div>
            <div className="info-strip muted">{runResult.report?.status_message || "先运行一次国家预测。"}</div>
            <textarea className="national-report-textarea" readOnly value={runResult.report?.draft || ""} rows={18} />
          </div>

          <div className="insight-card">
            <div className="insight-head">
              <h3>问答工作台</h3>
              <span className="status-label">{statusLabelMap[reportAnswer.status] || reportAnswer.status || "国家问答"}</span>
            </div>
            <label className="field-block">
              <span>问题</span>
              <input
                value={reportQuestion}
                onChange={(event) => onReportQuestionChange(event.target.value)}
                placeholder="例如：未来一年全国用电量趋势如何？"
              />
            </label>
            <button
              type="button"
              className="primary-button"
              onClick={onAskQuestion}
              disabled={!runResult.stats || !reportQuestion.trim() || isAskingQuestion}
            >
              {isAskingQuestion ? "问题发送中..." : "发送问题"}
            </button>
            <div className="national-qa-meta">
              <span className="status-label">
                {reportAnswer.question ? `最近一次问题：${reportAnswer.question}` : "尚未发送问题"}
              </span>
              <span className={`status-label ${isAskingQuestion ? "is-busy" : ""}`.trim()}>
                {isAskingQuestion
                  ? "请求处理中"
                  : reportAnswer.requestState === "done"
                    ? "回答已返回"
                    : reportAnswer.requestState === "failed"
                      ? "发送失败"
                      : "等待发送"}
              </span>
            </div>
            <div className={`info-strip ${answerTone}`.trim()}>
              {reportAnswer.message || "提交问题后，这里会明确显示本次使用的是云端大模型、本地规则，还是云端失败后的回退结果。"}
            </div>
            <div className={`rich-text national-answer-panel ${isAskingQuestion ? "is-pending" : ""}`.trim()}>
              {reportAnswer.answer || (isAskingQuestion ? "正在整理回答，请稍候..." : "运行预测并提问后，这里会显示国家模块的回答。")}
            </div>

            <div className="national-qa-history-block">
              <div className="insight-head national-qa-history-head">
                <h3>历史问答</h3>
                <span className="status-label">{qaHistory.length ? `${qaHistory.length} 条记录` : "暂无记录"}</span>
              </div>

              {qaHistory.length ? (
                <div className="chat-history chat-history-elevated">
                  <div className="history-timeline national-history-timeline">
                    {qaHistory.map((item) => (
                      <article className="chat-item history-card national-history-card" key={item.id}>
                        <div className="national-history-meta">
                          <span className="status-label">{modeLabelMap[item.mode] || item.mode || "问答记录"}</span>
                          <span className="chat-session-time">{formatHistoryTime(item.createdAt)}</span>
                        </div>
                        <div className="chat-pair">
                          <div className="chat-bubble chat-bubble-question">
                            <span className="chat-role">问题</span>
                            <div className="rich-text">{item.question}</div>
                          </div>
                          <div className={`chat-bubble ${item.status === "error" ? "chat-bubble-thinking" : "chat-bubble-answer"}`.trim()}>
                            <span className="chat-role">{statusLabelMap[item.status] || "回答"}</span>
                            <div className="rich-text">{item.answer || item.message}</div>
                          </div>
                          <div className={`info-strip ${item.status === "error" ? "error" : item.status === "cloud_direct" || item.status === "cloud_rewrite" ? "success" : "muted"}`.trim()}>
                            {item.message}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="chat-history-empty national-chat-history-empty">
                  <strong>还没有历史问答</strong>
                  <p>发送过的问题都会保留在这里。重新运行国家预测后，历史问答会按新的预测上下文重新开始记录。</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

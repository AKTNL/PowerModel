import Panel from "../components/Panel.jsx";
import { formatDateTime } from "../lib/powerUtils.js";

export default function ChatHistoryView({ chatHistory, onBackToChat }) {
  const latestRecord = chatHistory.at(-1) || null;

  return (
    <div className="module-view is-active" data-view="history">
      <div className="page-grid">
        <Panel
          kicker="History"
          title="历史对话"
          note="这里集中展示最近的问答记录，聊天页只保留当前输入和最新回复。"
          actions={
            <div className="prediction-actions">
              <button type="button" className="primary-button" onClick={onBackToChat}>
                返回智能问答
              </button>
            </div>
          }
        >
          {chatHistory.length ? (
            <div className="chat-history history-timeline">
              {[...chatHistory].reverse().map((item) => (
                <article className="chat-item chat-pair history-card" key={item.id ?? `${item.created_at}-${item.question}`}>
                  <div className="chat-bubble chat-bubble-question">
                    <div className="chat-meta">
                      <span className="chat-role">Question</span>
                      <span className="chat-mode">{formatDateTime(item.created_at)}</span>
                    </div>
                    <div className="rich-text">{item.question}</div>
                  </div>

                  <div className="chat-bubble chat-bubble-answer">
                    <div className="chat-meta">
                      <span className="chat-role">Answer</span>
                      <span className="chat-mode">{item.generation_mode || "saved"}</span>
                    </div>
                    <div className={`rich-text ${item.answer ? "" : "empty-state"}`.trim()}>
                      {item.answer || "该记录没有返回有效回答。"}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="chat-empty-panel">
              <strong>还没有历史问答记录</strong>
              <p>你可以先到“智能问答”页提一个问题，回答成功后这里会自动累计展示。</p>
            </div>
          )}
        </Panel>

        <div className="page-side-stack">
          <section className="side-panel">
            <div className="side-panel-head">
              <p className="panel-kicker">Archive</p>
              <h3>对话摘要</h3>
            </div>
            <div className="status-tile-grid">
              <article className="status-tile status-green">
                <span>历史条数</span>
                <strong>{chatHistory.length}</strong>
                <p>页面当前按时间倒序展示最近的问答记录。</p>
              </article>
              <article className="status-tile">
                <span>最近一次提问</span>
                <strong>{latestRecord ? formatDateTime(latestRecord.created_at) : "--"}</strong>
                <p>{latestRecord?.question || "等待新的问答记录。"}</p>
              </article>
            </div>
          </section>

          <section className="side-panel">
            <div className="side-panel-head">
              <p className="panel-kicker">Usage</p>
              <h3>使用建议</h3>
            </div>
            <div className="info-list">
              <div className="info-list-item">
                <strong>聊天页只看最新回复</strong>
                <p>这样可以把提问输入和当前回答放在一个更轻量的视图里，不会越聊越长。</p>
              </div>
              <div className="info-list-item">
                <strong>历史页适合回看演示流程</strong>
                <p>如果答辩时需要证明模型有连续问答能力，直接切到这里更清楚。</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

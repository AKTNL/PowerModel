import Panel from "../components/Panel.jsx";
import { QUICK_QUESTIONS, formatDateTime } from "../lib/powerUtils.js";

export default function ChatView({
  chatQuestion,
  onQuestionChange,
  onQuestionKeyDown,
  onSend,
  onQuickQuestion,
  onOpenHistory,
  latestChat,
  historyCount,
  llmEnabled,
  isChatLoading,
  pendingQuestion,
  chatError
}) {
  const disabled = !llmEnabled || isChatLoading;

  return (
    <div className="module-view is-active" data-view="chat">
      <div className="page-grid">
        <Panel
          kicker="Chat"
          title="智能问答"
          note="这里保留提问输入和最新一轮回复；完整历史已经拆到单独页面。"
          actions={
            <div className="prediction-actions">
              <button type="button" className="ghost-button" onClick={onOpenHistory}>
                查看历史对话
              </button>
            </div>
          }
        >
          <div className="page-intro-strip">
            <div className="intro-pill">
              <span>问答引擎</span>
              <strong>{llmEnabled ? "LLM Online" : "未连接"}</strong>
            </div>
            <div className="intro-pill">
              <span>历史记录</span>
              <strong>{historyCount} 条</strong>
            </div>
            <div className="intro-pill">
              <span>当前状态</span>
              <strong>{isChatLoading ? "思考中..." : "可提问"}</strong>
            </div>
          </div>

          {!llmEnabled ? (
            <div className="info-strip error">请先在“模型设置”里配置并启用大模型，再使用智能问答。</div>
          ) : null}

          {chatError ? <div className="info-strip error">{chatError}</div> : null}

          <div className="quick-questions">
            {QUICK_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                className="quick-question-button"
                onClick={() => onQuickQuestion(question)}
                disabled={disabled}
              >
                {question}
              </button>
            ))}
          </div>

          <div className="chat-compose chat-compose-elevated">
            <label className="field-span-2" style={{ width: "100%" }}>
              输入你的问题
              <textarea
                rows="4"
                value={chatQuestion}
                onChange={onQuestionChange}
                onKeyDown={onQuestionKeyDown}
                placeholder="例如：为什么这个月的预测比上个月高？"
                disabled={disabled}
              />
            </label>
            <button type="button" className="primary-button chat-send-button" onClick={onSend} disabled={disabled}>
              {isChatLoading ? "思考中..." : "发送问题"}
            </button>
          </div>

          {isChatLoading ? (
            <div className="chat-history chat-history-elevated">
              <div className="chat-item chat-pair chat-thinking-card">
                <div className="chat-bubble chat-bubble-question">
                  <div className="chat-meta">
                    <span className="chat-role">Question</span>
                    <span className="chat-mode">pending</span>
                  </div>
                  <div className="rich-text">{pendingQuestion || chatQuestion || "正在处理你的问题..."}</div>
                </div>

                <div className="chat-bubble chat-bubble-answer chat-bubble-thinking">
                  <div className="chat-meta">
                    <span className="chat-role">Answer</span>
                    <span className="chat-mode">thinking</span>
                  </div>
                  <div className="thinking-indicator" aria-label="大模型正在思考">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            </div>
          ) : latestChat ? (
            <div className="chat-history chat-history-elevated">
              <div className="chat-item chat-pair current-chat-card">
                <div className="chat-bubble chat-bubble-question">
                  <div className="chat-meta">
                    <span className="chat-role">Latest Question</span>
                    <span className="chat-mode">{formatDateTime(latestChat.created_at)}</span>
                  </div>
                  <div className="rich-text">{latestChat.question}</div>
                </div>

                <div className="chat-bubble chat-bubble-answer">
                  <div className="chat-meta">
                    <span className="chat-role">Latest Answer</span>
                    <span className="chat-mode">{latestChat.generation_mode || "llm"}</span>
                  </div>
                  <div className={`rich-text ${latestChat.answer ? "" : "empty-state"}`.trim()}>
                    {latestChat.answer || "本次没有返回有效回答，请检查右侧状态或重新提问。"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="chat-empty-panel">
              <strong>还没有提问记录</strong>
              <p>配置好模型后，点击上方快捷问题或直接输入你的问题开始对话。</p>
            </div>
          )}
        </Panel>

        <div className="page-side-stack">
          <section className="side-panel">
            <div className="side-panel-head">
              <p className="panel-kicker">Status</p>
              <h3>对话状态</h3>
            </div>
            <div className="status-tile-grid">
              <article className={`status-tile ${llmEnabled ? "status-green" : "status-warm"}`.trim()}>
                <span>模型连接</span>
                <strong>{llmEnabled ? "READY" : "OFF"}</strong>
                <p>{llmEnabled ? "当前可以直接发起大模型问答。" : "需要先在模型设置页面完成配置。"}</p>
              </article>
              <article className={`status-tile ${isChatLoading ? "status-green" : ""}`.trim()}>
                <span>当前流程</span>
                <strong>{isChatLoading ? "BUSY" : "IDLE"}</strong>
                <p>{isChatLoading ? "模型正在生成回复，请稍等。" : `最近已累计 ${historyCount} 条历史问答。`}</p>
              </article>
            </div>
          </section>

          <section className="side-panel">
            <div className="side-panel-head">
              <p className="panel-kicker">Prompting</p>
              <h3>提问建议</h3>
            </div>
            <div className="info-list">
              <div className="info-list-item">
                <strong>尽量问具体问题</strong>
                <p>例如“为什么比上个月高”“如果空调每天少开 1 小时会怎样”，比泛泛提问更容易拿到可执行回答。</p>
              </div>
              <div className="info-list-item">
                <strong>优先围绕当前预测追问</strong>
                <p>系统会自动带入最近一次预测结果、历史用电和家庭画像，围绕这些内容提问效果最好。</p>
              </div>
              <div className="info-list-item">
                <strong>历史记录已经独立出去</strong>
                <p>如果你需要回看之前的多轮问答，直接点击“查看历史对话”会更清楚。</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

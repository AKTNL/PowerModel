import Panel from "../components/Panel.jsx";
import { QUICK_QUESTIONS, formatDateTime } from "../lib/powerUtils.js";

export default function ChatView({
  chatQuestion,
  onQuestionChange,
  onQuestionKeyDown,
  onSend,
  onQuickQuestion,
  chatHistory
}) {
  return (
    <div className="module-view is-active" data-view="chat">
      <Panel
        kicker="Chat"
        title="智能问答"
        note="问答会自动带入当前用户、最近用电记录、最近预测和最近几轮对话上下文。"
      >
        <div className="quick-questions">
          {QUICK_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              className="quick-question-button"
              onClick={() => onQuickQuestion(question)}
            >
              {question}
            </button>
          ))}
        </div>

        <div className="chat-compose">
          <label className="field-span-2" style={{ width: "100%" }}>
            输入你的问题
            <textarea
              rows="4"
              value={chatQuestion}
              onChange={onQuestionChange}
              onKeyDown={onQuestionKeyDown}
              placeholder="例如：为什么这个月的预测比上个月高？"
            />
          </label>
          <button type="button" className="primary-button" onClick={onSend}>
            发送问题
          </button>
        </div>

        {chatHistory.length ? (
          <div className="chat-history">
            {[...chatHistory].reverse().map((item) => (
              <div className="chat-item" key={item.id ?? `${item.created_at}-${item.question}`}>
                <div className="chat-meta">
                  <span className="chat-role">Question</span>
                  <span className="chat-mode">
                    {item.generation_mode || "saved"}
                    {item.llm_error ? " / fallback" : ""}
                  </span>
                </div>
                <div className="rich-text">{item.question}</div>
                <div className="chat-meta" style={{ marginTop: 12 }}>
                  <span className="chat-role">Answer</span>
                  <span className="chat-mode">{formatDateTime(item.created_at)}</span>
                </div>
                <div className="rich-text">{item.answer}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">还没有提问记录。</div>
        )}
      </Panel>
    </div>
  );
}

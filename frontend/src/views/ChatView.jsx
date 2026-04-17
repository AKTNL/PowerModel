import { useEffect, useState } from "react";

import Panel from "../components/Panel.jsx";
import { QUICK_QUESTIONS, formatDateTime } from "../lib/powerUtils.js";

function summarizeText(value, maxLength = 56) {
  const normalized = `${value || ""}`.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "暂无内容";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

export default function ChatView({
  chatHistory,
  chatQuestion,
  onQuestionChange,
  onQuestionKeyDown,
  onSend,
  onQuickQuestion,
  latestChat,
  historyCount,
  llmEnabled,
  isChatLoading,
  pendingQuestion,
  chatError
}) {
  const disabled = !llmEnabled || isChatLoading;
  const [selectedChatId, setSelectedChatId] = useState(() => latestChat?.id ?? null);

  useEffect(() => {
    if (isChatLoading) {
      return;
    }

    if (!chatHistory.length) {
      setSelectedChatId(null);
      return;
    }

    if (!chatHistory.some((item) => item.id === selectedChatId)) {
      setSelectedChatId(chatHistory.at(-1)?.id ?? null);
    }
  }, [chatHistory, isChatLoading, selectedChatId]);

  useEffect(() => {
    if (!isChatLoading && latestChat?.id) {
      setSelectedChatId(latestChat.id);
    }
  }, [latestChat?.id, isChatLoading]);

  const selectedChat = chatHistory.find((item) => item.id === selectedChatId) || latestChat || null;

  return (
    <div className="module-view is-active" data-view="chat">
      <div className="chat-workspace">
        <section className="side-panel chat-history-panel">
          <div className="side-panel-head">
            <p className="panel-kicker">Archive</p>
            <h3>历史对话</h3>
          </div>

          <div className="chat-history-panel-meta">
            <div className="intro-pill">
              <span>记录总数</span>
              <strong>{historyCount}</strong>
            </div>
            <div className="intro-pill">
              <span>当前状态</span>
              <strong>{isChatLoading ? "思考中" : "可提问"}</strong>
            </div>
          </div>

          {chatHistory.length ? (
            <div className="chat-session-list">
              {[...chatHistory].reverse().map((item) => {
                const active = !isChatLoading && item.id === selectedChatId;

                return (
                  <button
                    key={item.id ?? `${item.created_at}-${item.question}`}
                    type="button"
                    className={`chat-session-card ${active ? "is-active" : ""}`.trim()}
                    onClick={() => setSelectedChatId(item.id ?? null)}
                  >
                    <div className="chat-session-head">
                      <strong className="chat-session-title">{summarizeText(item.question, 24)}</strong>
                      <span className="chat-session-time">{formatDateTime(item.created_at)}</span>
                    </div>
                    <p className="chat-session-preview">{summarizeText(item.answer, 72)}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="chat-history-empty">
              <strong>还没有历史对话</strong>
              <p>发送第一条问题后，这里会按时间顺序保留最近的问答记录。</p>
            </div>
          )}
        </section>

        <Panel
          kicker="Chat"
          title="智能问答"
          note="左侧快速回看历史记录，右侧继续当前提问、查看完整回复。"
          className="chat-main-panel"
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
                placeholder="例如：为什么这个月的预测比上个月更高？"
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
          ) : selectedChat ? (
            <div className="chat-history chat-history-elevated">
              <div className="chat-item chat-pair current-chat-card">
                <div className="chat-bubble chat-bubble-question">
                  <div className="chat-meta">
                    <span className="chat-role">Question</span>
                    <span className="chat-mode">{formatDateTime(selectedChat.created_at)}</span>
                  </div>
                  <div className="rich-text">{selectedChat.question}</div>
                </div>

                <div className="chat-bubble chat-bubble-answer">
                  <div className="chat-meta">
                    <span className="chat-role">Answer</span>
                    <span className="chat-mode">{selectedChat.generation_mode || "llm"}</span>
                  </div>
                  <div className={`rich-text ${selectedChat.answer ? "" : "empty-state"}`.trim()}>
                    {selectedChat.answer || "本次没有返回有效回答，请检查模型状态后重新提问。"}
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

          <div className="chat-prompt-notes">
            <article className="chat-note-card">
              <strong>尽量问具体问题</strong>
              <p>例如“为什么比上个月高”或“空调每天少开 1 小时会怎样”，比泛泛提问更容易得到可执行回答。</p>
            </article>
            <article className="chat-note-card">
              <strong>优先围绕当前预测追问</strong>
              <p>系统会自动带入最近预测、历史用电和家庭画像，围绕这些内容提问通常效果更好。</p>
            </article>
            <article className="chat-note-card">
              <strong>左侧可回看历史记录</strong>
              <p>点击左侧任一问答即可在右侧查看完整内容，不需要再切换到独立历史页面。</p>
            </article>
          </div>
        </Panel>
      </div>
    </div>
  );
}

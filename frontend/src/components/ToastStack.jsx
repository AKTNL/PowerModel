const TONE_ICON = {
  success: "\u2714",
  error: "\u2716",
  info: "\u24D8",
  warn: "\u26A0"
};

const TONE_CLASS = {
  success: "toast-item--success",
  error: "toast-item--error",
  info: "",
  warn: "toast-item--warn"
};

export default function ToastStack({ items }) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="toast-stack" aria-live="polite">
      {items.map((item) => {
        const tone = item.tone || "info";
        return (
          <div
            key={item.id}
            className={`toast-item ${TONE_CLASS[tone] || ""} ${item.leaving ? "is-leaving" : ""}`.trim()}
            role="status"
          >
            {TONE_ICON[tone] ? <span className="toast-icon">{TONE_ICON[tone]}</span> : null}
            {item.message}
          </div>
        );
      })}
    </div>
  );
}

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function CollapsibleSection({ kicker, title, defaultOpen = true, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="side-panel">
      <div className="side-panel-head">
        <div>
          {kicker ? <p className="panel-kicker">{kicker}</p> : null}
          <h3>{title}</h3>
        </div>
      </div>
      <button
        type="button"
        className={`side-panel-toggle ${!isOpen ? "is-collapsed" : ""}`.trim()}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        {isOpen ? "收起" : "展开"}
        <ChevronDown size={14} />
      </button>
      <div className={`side-panel-content ${!isOpen ? "is-collapsed" : ""}`.trim()}>
        {children}
      </div>
    </section>
  );
}

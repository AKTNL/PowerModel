import { NAV_ITEMS } from "../lib/powerUtils.js";

function IconBase({ children }) {
  return (
    <svg
      className="top-nav-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const NAV_ICONS = {
  overview: (
    <IconBase>
      <path d="M4 13.5 12 5l8 8.5" />
      <path d="M6.5 12.5V20h11v-7.5" />
      <path d="M10 20v-5h4v5" />
    </IconBase>
  ),
  profile: (
    <IconBase>
      <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M5 20c.7-3.3 3-5 7-5s6.3 1.7 7 5" />
    </IconBase>
  ),
  model: (
    <IconBase>
      <path d="M8 4h8" />
      <path d="M9 20h6" />
      <path d="M12 4v4" />
      <path d="M12 16v4" />
      <rect x="6" y="8" width="12" height="8" rx="3" />
      <path d="M9.5 12h.01" />
      <path d="M14.5 12h.01" />
    </IconBase>
  ),
  usage: (
    <IconBase>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </IconBase>
  ),
  prediction: (
    <IconBase>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 3.2-3.2 2.6 2.6L19 8" />
      <path d="M15 8h4v4" />
    </IconBase>
  ),
  scenario: (
    <IconBase>
      <path d="M6 6h5v5H6z" />
      <path d="M13 13h5v5h-5z" />
      <path d="M11 8.5h3.5A3.5 3.5 0 0 1 18 12" />
      <path d="M13 15.5H9.5A3.5 3.5 0 0 1 6 12" />
    </IconBase>
  ),
  chat: (
    <IconBase>
      <path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v4A3.5 3.5 0 0 1 15.5 14H12l-4 4v-4A3.5 3.5 0 0 1 5 10.5z" />
      <path d="M9 8.5h6" />
      <path d="M9 11h3.5" />
    </IconBase>
  ),
  nationalOverview: (
    <IconBase>
      <path d="M4 19h16" />
      <path d="M6 16V9" />
      <path d="M12 16V5" />
      <path d="M18 16v-4" />
      <path d="M4.5 9.5 12 5l7.5 4.5" />
    </IconBase>
  ),
  nationalReport: (
    <IconBase>
      <path d="M7 3.5h7l3 3V20.5H7z" />
      <path d="M14 3.5v4h4" />
      <path d="M10 11h4" />
      <path d="M10 14h5" />
      <path d="M10 17h3" />
    </IconBase>
  ),
  nationalSources: (
    <IconBase>
      <path d="M5 5.5c1.6-1 3.7-1 6 0v14c-2.3-1-4.4-1-6 0z" />
      <path d="M19 5.5c-1.6-1-3.7-1-6 0v14c2.3-1 4.4-1 6 0z" />
      <path d="M11 5.5h2v14h-2z" />
    </IconBase>
  )
};

function getNavIcon(item) {
  return NAV_ICONS[item.key] || <span className="top-nav-icon-fallback">{item.icon}</span>;
}

export default function Sidebar({
  currentView,
  onNavigate,
  compactProgress = 0
}) {
  const progress = Math.min(Math.max(compactProgress, 0), 1);

  return (
    <header className="top-nav" style={{ "--nav-progress": progress }}>
      <div className="top-nav-brand">
        <div className="top-nav-brand-lockup">
          <span className="top-nav-brand-mark" aria-hidden="true">
            <span />
          </span>
          <div className="top-nav-brand-text">
            <p className="eyebrow">Energy Console</p>
            <h1>家庭 + 国家用电预测平台</h1>
          </div>
        </div>
      </div>

      <nav className="top-nav-links" aria-label="功能导航">
        {NAV_ITEMS.map((item) => {
          const active = item.key === currentView;
          return (
            <button
              key={item.key}
              type="button"
              className={`top-nav-link ${active ? "is-active" : ""}`.trim()}
              onClick={() => onNavigate(item.key)}
              aria-label={item.title}
              aria-current={active ? "page" : undefined}
            >
              <span className="top-nav-link-icon">{getNavIcon(item)}</span>
              <span className="top-nav-link-main">
                <span className="top-nav-link-title">{item.title}</span>
                <span className="top-nav-link-note">{item.note}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}

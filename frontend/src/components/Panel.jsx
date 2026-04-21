export default function Panel({
  title,
  kicker,
  note,
  actions = null,
  headerAside = null,
  className = "",
  children
}) {
  const sideContent = headerAside || actions;

  return (
    <section className={`panel ${className}`.trim()}>
      {(title || kicker || note || sideContent) && (
        <div className={`module-header ${sideContent ? "has-aside" : "is-simple"}`.trim()}>
          <div className="module-header-main">
            {kicker ? <p className="panel-kicker">{kicker}</p> : null}
            {title ? <h2>{title}</h2> : null}
            {note ? <p className="topbar-copy">{note}</p> : null}
          </div>
          {sideContent ? <div className="module-header-side">{sideContent}</div> : null}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}

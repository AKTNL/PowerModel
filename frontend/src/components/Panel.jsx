export default function Panel({
  title,
  kicker,
  note,
  actions = null,
  className = "",
  children
}) {
  return (
    <section className={`panel ${className}`.trim()}>
      {(title || kicker || note || actions) && (
        <div className="module-header">
          <div>
            {kicker ? <p className="panel-kicker">{kicker}</p> : null}
            {title ? <h2>{title}</h2> : null}
            {note ? <p className="topbar-copy">{note}</p> : null}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

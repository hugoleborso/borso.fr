/* RunnerChip — avatar + name + bib used everywhere */
const { useMemo: _u } = React;

function RunnerAvatar({ runner, size = 32, dim = false, ring = false }) {
  const { hue, initials } = runner;
  const bg = `oklch(0.70 0.13 ${hue})`;
  const ink = `oklch(0.18 0.06 ${hue})`;
  return (
    <span
      style={{
        width: size, height: size, borderRadius: "50%",
        background: bg, color: ink,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: Math.round(size * 0.42),
        letterSpacing: "-0.02em",
        flexShrink: 0,
        opacity: dim ? 0.55 : 1,
        boxShadow: ring ? `0 0 0 2px var(--bg-elev), 0 0 0 3.5px ${bg}` : "none",
        position: "relative",
      }}
      title={runner.name}
    >
      {initials}
    </span>
  );
}

function RunnerBib({ runner, size = 26 }) {
  return (
    <span className="mono"
      style={{
        minWidth: size, height: size, padding: "0 6px",
        borderRadius: 4, display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-elev-2)", border: "1px solid var(--line)",
        fontSize: 11, fontWeight: 600, color: "var(--ink-2)"
      }}>
      {String(runner.bib).padStart(3, "0")}
    </span>
  );
}

function RunnerLine({ runner, secondary, onClick }) {
  return (
    <div className="row" style={{cursor: onClick? "pointer":"default"}} onClick={onClick}>
      <RunnerAvatar runner={runner} size={28} />
      <div style={{display:"flex", flexDirection:"column", minWidth:0}}>
        <div style={{fontWeight: 500, fontSize: 13, color:"var(--ink)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
          {runner.name}
        </div>
        {secondary !== undefined && (
          <div style={{fontSize: 11, color:"var(--ink-3)"}} className="mono">{secondary}</div>
        )}
      </div>
    </div>
  );
}

window.RunnerAvatar = RunnerAvatar;
window.RunnerBib = RunnerBib;
window.RunnerLine = RunnerLine;

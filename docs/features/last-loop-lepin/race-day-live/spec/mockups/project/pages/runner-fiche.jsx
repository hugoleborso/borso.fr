/* RunnerFichePage — /r/<slug>
   Pick a runner (default first IN), show their fiche: avatar, status, town,
   loop-by-loop timing chart, total loops, total km, and trail of recent punches. */

const { useState: _rfS } = React;

function RunnerFichePage({ phase, setRoute }) {
  // Default: leader if any; otherwise first runner
  const defaultSlug = (phase.inRace[0] || phase.runners[0]).slug;
  const [slug, setSlug] = _rfS(defaultSlug);
  const runner = phase.runners.find(r => r.slug === slug) || phase.runners[0];

  return (
    <div className="rf" data-screen-label="03 Fiche coureur">
      <aside className="rf-sidebar">
        <div className="eyebrow" style={{marginBottom:"var(--d-3)"}}>Sélectionner · /r/&lt;slug&gt;</div>
        <input className="input" placeholder="Chercher un nom…" style={{marginBottom:"var(--d-3)"}} />
        <div className="rf-list">
          {phase.runners.map(r => (
            <button key={r.slug}
                    className={`rf-listitem ${r.slug === slug ? "active" : ""}`}
                    onClick={() => setSlug(r.slug)}>
              <RunnerAvatar runner={r} size={26} dim={r.status === "DNF"} />
              <div style={{flex:1, minWidth:0}}>
                <div className="rf-li-name">{r.name}</div>
                <div className="rf-li-meta mono">{r.town}</div>
              </div>
              <span className={`rf-tag rf-tag-${r.status.toLowerCase()}`}>{r.status === "IN" ? `${r.completedLoops}b` : r.status === "DNF" ? "DNF" : "★"}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="rf-main">
        <header className="rf-hero">
          <div className="rf-hero-photo">
            <RunnerAvatar runner={runner} size={96} />
            <span className="rf-hero-bib mono">#{String(runner.bib).padStart(3,"0")}</span>
          </div>
          <div style={{flex:1, minWidth:0}}>
            <div className="row" style={{gap:"var(--d-3)", marginBottom:"var(--d-2)"}}>
              <StatusBadge status={runner.status} />
              <span className="muted mono" style={{fontSize:11}}>/r/{runner.slug}</span>
            </div>
            <h1 className="rf-name">{runner.name}</h1>
            <div className="rf-sub">
              {runner.town} · {runner.gender === "F" ? "F" : "M"} · {runner.age} ans · pace habituelle {runner.avgLoopMin}'
            </div>
            <div className="row" style={{gap:"var(--d-2)", marginTop:"var(--d-4)"}}>
              <button className="btn btn-sm" onClick={()=>setRoute("spectator")}>← Spectateur</button>
              <button className="btn btn-sm">Partager le lien</button>
            </div>
          </div>
          <div className="rf-stats">
            <Stat label="Boucles" labelEn="LOOPS" value={runner.completedLoops} />
            <Stat label="Distance" labelEn="DIST" value={(runner.completedLoops * 6.706).toFixed(1)} unit="km" />
            <Stat label="D+ cumulé" labelEn="ELEV" value={(runner.completedLoops * 184).toLocaleString("fr-FR")} unit="m" />
            <Stat label="Rang" labelEn="RANK" value={runner.status === "IN" ? runner.rank : "—"} />
          </div>
        </header>

        <div className="rf-grid">
          <div className="card">
            <div className="card-head">
              <div className="card-title">Boucles bouclées <span className="en">LOOP TIMES</span></div>
              <div className="card-meta">{runner.completedLoops} pointages</div>
            </div>
            <div className="card-body">
              <LoopTimings runner={runner} phase={phase} />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Position estimée <span className="en">POSITION</span></div>
              <div className="card-meta">{runner.status === "IN" ? `${Math.round(runner.progress*100)}% sur la boucle` : "Hors course"}</div>
            </div>
            <div className="card-body" style={{display:"grid", placeItems:"center", padding:"var(--d-4)"}}>
              <svg viewBox="0 0 100 100" style={{width:"100%", maxWidth:280, aspectRatio:"1/1"}}>
                <ellipse cx="50" cy="55" rx="48" ry="40" fill="var(--bg-elev-2)" stroke="var(--line-soft)" strokeWidth="0.4" strokeDasharray="0.6 0.4" />
                <path d={window.COURSE_PATH} fill="none" stroke="var(--line)" strokeWidth="1.6" />
                <path d={window.COURSE_PATH} fill="none" stroke="var(--accent)" strokeWidth="0.55" strokeLinecap="round" strokeDasharray="0.6 1.2" />
                {runner.status === "IN" && <RunnerDotOnPath runner={runner} />}
                <circle cx="50" cy="12" r="2.2" fill="var(--bg)" stroke="var(--ink)" strokeWidth="0.6" />
              </svg>
            </div>
          </div>

          <div className="card" style={{gridColumn:"1 / -1"}}>
            <div className="card-head">
              <div className="card-title">Historique de pointages <span className="en">PUNCH HISTORY</span></div>
              <div className="card-meta">Dernières 12 boucles</div>
            </div>
            <div className="card-body flush">
              <PunchHistory runner={runner} phase={phase} />
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .rf {
          display: grid;
          grid-template-columns: 280px 1fr;
          height: 100%; min-height: 0;
        }
        @media (max-width: 980px) { .rf { grid-template-columns: 220px 1fr; } }
        .rf-sidebar {
          border-right: 1px solid var(--line-soft);
          padding: var(--d-4) var(--d-4) 0;
          display: flex; flex-direction: column; gap: 0;
          min-height: 0;
        }
        .rf-list { overflow: auto; min-height: 0; flex: 1; display: flex; flex-direction: column; gap: 1px; padding-bottom: var(--d-4); }
        .rf-listitem {
          display: flex; align-items: center; gap: var(--d-2);
          padding: 6px var(--d-2); border-radius: var(--radius-1);
          text-align: left;
        }
        .rf-listitem:hover { background: var(--bg-elev); }
        .rf-listitem.active { background: var(--bg-elev-2); }
        .rf-li-name { font-size: 12.5px; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rf-li-meta { font-size: 10px; color: var(--ink-3); }
        .rf-tag {
          font-family: var(--font-mono); font-size: 9px;
          padding: 2px 5px; border-radius: 3px;
          background: var(--bg-elev-2); color: var(--ink-3);
          border: 1px solid var(--line);
          letter-spacing: 0.05em;
        }
        .rf-tag-in { color: var(--accent); border-color: color-mix(in oklch, var(--accent) 40%, var(--line)); }
        .rf-tag-dnf { color: var(--danger); border-color: color-mix(in oklch, var(--danger) 40%, var(--line)); }
        .rf-tag-winner { color: var(--warn); border-color: color-mix(in oklch, var(--warn) 40%, var(--line)); }

        .rf-main { overflow: auto; min-height: 0; padding: var(--d-5) var(--d-6); display:flex; flex-direction:column; gap: var(--d-5); }

        .rf-hero {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: var(--d-6);
          align-items: center;
        }
        .rf-hero-photo { position: relative; }
        .rf-hero-bib {
          position: absolute; right: -8px; bottom: -4px;
          padding: 3px 7px; background: var(--bg-elev); border: 1px solid var(--line);
          border-radius: var(--radius-pill); font-size: 10px;
          color: var(--ink-2);
        }
        .rf-name {
          margin: 0; font-family: var(--font-display);
          font-weight: 700; font-size: 36px; line-height: 1; letter-spacing: -0.02em;
        }
        .rf-sub { margin-top: 6px; color: var(--ink-3); font-size: 13px; }
        .rf-stats {
          display: grid;
          grid-template-columns: repeat(4, auto);
          gap: var(--d-6);
        }
        @media (max-width: 980px) {
          .rf-hero { grid-template-columns: auto 1fr; }
          .rf-stats { grid-column: 1 / -1; grid-template-columns: repeat(4, 1fr); }
        }

        .rf-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: var(--d-4);
        }
        @media (max-width: 980px) { .rf-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

function Stat({ label, labelEn, value, unit }){
  return (
    <div style={{textAlign:"right"}}>
      <div style={{fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--ink-3)", fontWeight:600}}>
        {label} <span style={{color:"var(--ink-mute)", fontFamily:"var(--font-mono)", fontSize:9}}>{labelEn}</span>
      </div>
      <div style={{fontFamily:"var(--font-display)", fontWeight:700, fontSize:28, letterSpacing:"-0.02em", lineHeight:1.05, color:"var(--ink)"}}>
        {value}{unit && <span style={{fontSize:14, color:"var(--ink-3)", marginLeft:4, fontWeight:500}}>{unit}</span>}
      </div>
    </div>
  );
}

function StatusBadge({ status }){
  if (status === "WINNER") return (
    <span style={{
      padding:"3px 10px", borderRadius:"var(--radius-pill)",
      background:"color-mix(in oklch, var(--warn) 16%, transparent)",
      border:"1px solid color-mix(in oklch, var(--warn) 40%, transparent)",
      color:"var(--warn)", fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase"
    }}>★ Vainqueur·e · winner</span>
  );
  if (status === "DNF") return (
    <span style={{
      padding:"3px 10px", borderRadius:"var(--radius-pill)",
      background:"color-mix(in oklch, var(--danger) 14%, transparent)",
      border:"1px solid color-mix(in oklch, var(--danger) 35%, transparent)",
      color:"var(--danger)", fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase"
    }}>● Sorti·e · DNF</span>
  );
  return (
    <span style={{
      padding:"3px 10px", borderRadius:"var(--radius-pill)",
      background:"color-mix(in oklch, var(--accent) 14%, transparent)",
      border:"1px solid color-mix(in oklch, var(--accent) 35%, transparent)",
      color:"var(--accent)", fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase"
    }}>● En course · in</span>
  );
}

function LoopTimings({ runner, phase }) {
  // Synthesize loop times: avg ± small variance per loop.
  const N = runner.completedLoops;
  if (N === 0) return <div className="muted" style={{padding:"var(--d-4)"}}>Aucune boucle bouclée à ce stade.</div>;
  const times = [];
  let seed = runner.bib * 31;
  for (let i = 0; i < N; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const variance = ((seed / 233280) - 0.5) * 6; // ±3 minutes
    times.push(Math.max(28, runner.avgLoopMin + variance + i*0.1)); // fatigue: +0.1/loop
  }
  const max = 60;
  const min = 30;

  return (
    <div>
      <div style={{display:"flex", alignItems:"flex-end", gap:"3px", height: 150, padding: "var(--d-3) 0"}}>
        {times.map((t, i) => {
          const h = ((t - min) / (max - min)) * 100;
          const danger = t > 55;
          return (
            <div key={i} title={`Boucle ${i+1} · ${t.toFixed(1)}'`} style={{flex:1, display:"flex", flexDirection:"column", justifyContent:"flex-end", gap:4, minWidth: 0}}>
              <div style={{
                height: `${h}%`,
                background: danger ? "var(--danger)" : "var(--accent)",
                borderRadius: "3px 3px 0 0",
                opacity: 0.55 + (i / N) * 0.45,
                minHeight: 4,
              }}></div>
              <div className="mono mute-2" style={{fontSize: 9, textAlign:"center", lineHeight: 1}}>{i+1}</div>
            </div>
          );
        })}
      </div>
      <div style={{display:"flex", justifyContent:"space-between", paddingTop:"var(--d-2)", borderTop:"1px dashed var(--line-soft)", marginTop:"var(--d-2)"}}>
        <span className="mono mute-2" style={{fontSize:11}}>30' min</span>
        <span className="mono mute-2" style={{fontSize:11}}>cut-off 60'</span>
      </div>
    </div>
  );
}

function PunchHistory({ runner, phase }){
  const N = runner.completedLoops;
  const rows = [];
  for (let i = N; i > Math.max(0, N - 12); i--) {
    const ts = `${String(10 + i - 1).padStart(2,"0")}:${String(Math.round(runner.avgLoopMin)).padStart(2,"0")}:${String((runner.bib*7) % 60).padStart(2,"0")}`;
    rows.push({ loop: i, ts, status: "OK" });
  }
  if (runner.status === "DNF") rows.unshift({ loop: runner.dropAt + 1, ts: "—", status: "DNF", reason: runner.dropReason });
  return (
    <table style={{width:"100%", borderCollapse:"collapse", fontSize:13}}>
      <thead>
        <tr style={{textAlign:"left", color:"var(--ink-3)", fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase"}}>
          <th style={{padding:"8px 16px", borderBottom:"1px solid var(--line-soft)"}}>Boucle</th>
          <th style={{padding:"8px 16px", borderBottom:"1px solid var(--line-soft)"}}>Heure pointage</th>
          <th style={{padding:"8px 16px", borderBottom:"1px solid var(--line-soft)"}}>Statut</th>
          <th style={{padding:"8px 16px", borderBottom:"1px solid var(--line-soft)"}}>Note</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r,i) => (
          <tr key={i} style={{borderBottom:"1px solid var(--line-soft)"}}>
            <td style={{padding:"10px 16px"}} className="mono">{String(r.loop).padStart(2,"0")}</td>
            <td style={{padding:"10px 16px"}} className="mono">{r.ts}</td>
            <td style={{padding:"10px 16px"}}>
              {r.status === "DNF"
                ? <span style={{color:"var(--danger)", fontFamily:"var(--font-mono)", fontSize:11}}>DNF</span>
                : <span style={{color:"var(--accent)", fontFamily:"var(--font-mono)", fontSize:11}}>PUNCH</span>}
            </td>
            <td style={{padding:"10px 16px"}} className="muted" >{r.reason || (r.status === "OK" ? "Top respecté" : "")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RunnerDotOnPath({ runner }){
  const ref = React.useRef(null);
  const [pos, setPos] = React.useState(null);
  React.useEffect(() => {
    const svgNS = "http://www.w3.org/2000/svg";
    const p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", window.COURSE_PATH);
    const len = p.getTotalLength();
    const pt = p.getPointAtLength(runner.progress * len);
    setPos([pt.x, pt.y]);
  }, [runner.progress, runner.slug]);
  if (!pos) return null;
  const fill = `oklch(0.70 0.13 ${runner.hue})`;
  return (
    <g>
      <circle cx={pos[0]} cy={pos[1]} r="3.5" fill={fill} stroke="var(--bg-elev)" strokeWidth="0.8" />
      <text x={pos[0]} y={pos[1] + 1.2} fontSize="3" fontWeight="700" textAnchor="middle"
            fill="var(--bg)" style={{fontFamily:"var(--font-display)"}}>{runner.initials}</text>
    </g>
  );
}

window.RunnerFichePage = RunnerFichePage;

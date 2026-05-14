/* Leaderboard — runners currently IN, ranked by completedLoops then arrival.
   Compact rows with rank, avatar, name, loops, last-loop time, status bars. */

function LeaderboardPanel({ phase, onPick }) {
  const inRace = phase.inRace;
  return (
    <div className="card" data-screen-label="leaderboard" style={{minHeight:0}}>
      <div className="card-head">
        <div className="card-title">
          En course
          <span className="en">STILL IN</span>
        </div>
        <div className="card-meta">{inRace.length} · {phase.loopIdx > 0 ? `${phase.loopIdx} boucles bouclées` : "départ imminent"}</div>
      </div>
      <div className="card-body flush" style={{padding: 0}}>
        <div className="lb-head">
          <div className="lb-rank">#</div>
          <div className="lb-name">Coureur·euse <span className="en">RUNNER</span></div>
          <div className="lb-loops">Boucles <span className="en">LOOPS</span></div>
          <div className="lb-last">Dernière <span className="en">LAST</span></div>
          <div className="lb-now">Boucle en cours <span className="en">CURRENT</span></div>
        </div>
        <div className="lb-rows">
          {phase.key === "prerace"
            ? <PreraceList runners={phase.runners} onPick={onPick} />
            : inRace.map(r => <LeaderRow key={r.slug} r={r} phase={phase} onPick={onPick} />)
          }
        </div>
      </div>
      <style>{`
        .lb-head, .lb-row {
          display: grid;
          grid-template-columns: 36px 1fr 70px 70px 1.4fr;
          gap: var(--d-3);
          align-items: center;
          padding: 8px var(--d-5);
        }
        .lb-head {
          font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--ink-3); font-weight: 600;
          border-bottom: 1px solid var(--line-soft);
          background: var(--bg-elev);
          position: sticky; top: 0; z-index: 1;
        }
        .lb-head .en { color: var(--ink-mute); font-family: var(--font-mono); font-size: 9px; margin-left: 4px; letter-spacing: 0.12em; }
        .lb-row {
          border-bottom: 1px solid var(--line-soft);
          font-size: 13px;
        }
        .lb-row:hover { background: var(--bg-elev-2); cursor: pointer; }
        .lb-row.podium { background: linear-gradient(90deg, color-mix(in oklch, var(--accent) 8%, transparent), transparent 60%); }
        .lb-rank { font-family: var(--font-mono); font-weight: 600; font-size: 14px; color: var(--ink-2); }
        .lb-row.podium .lb-rank { color: var(--accent); }
        .lb-loops { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: 13px; color: var(--ink); }
        .lb-last  { font-family: var(--font-mono); font-variant-numeric: tabular-nums; color: var(--ink-2); font-size: 12px; }
        .lb-now {
          display: flex; align-items: center; gap: 8px;
        }
        .lb-now .track {
          flex: 1; height: 6px; background: var(--bg-elev-2);
          border-radius: 999px; overflow: hidden; position: relative;
          border: 1px solid var(--line-soft);
        }
        .lb-now .track > i {
          position: absolute; left: 0; top: 0; bottom: 0;
          background: var(--accent); border-radius: 999px;
        }
        .lb-now .pct {
          font-family: var(--font-mono); font-size: 11px;
          color: var(--ink-3); min-width: 28px; text-align: right;
        }
        .lb-now .done-mark {
          font-family: var(--font-mono); font-size: 10px;
          color: var(--accent); letter-spacing: 0.1em;
        }
      `}</style>
    </div>
  );
}

function LeaderRow({ r, phase, onPick }) {
  const podium = r.rank <= 3;
  const finished = r.progress >= 1;
  const loopMin = Math.round(r.avgLoopMin);
  return (
    <div className={`lb-row${podium? " podium":""}`} onClick={() => onPick && onPick(r.slug)}>
      <div className="lb-rank">{String(r.rank).padStart(2,"0")}</div>
      <div className="lb-name">
        <RunnerLine runner={r} secondary={r.town} />
      </div>
      <div className="lb-loops">{r.completedLoops}</div>
      <div className="lb-last">{phase.loopIdx > 0 ? `${loopMin}'${(r.avgLoopMin*60%60).toFixed(0).padStart(2,"0")}` : "—"}</div>
      <div className="lb-now">
        {finished
          ? <><span className="done-mark">PUNCHED</span><span style={{flex:1}}></span></>
          : <>
              <span className="track"><i style={{width: `${r.progress*100}%`}}></i></span>
              <span className="pct">{Math.round(r.progress*100)}%</span>
            </>}
      </div>
    </div>
  );
}

function PreraceList({ runners, onPick }){
  return (
    <div>
      {runners.map(r => (
        <div key={r.slug} className="lb-row" onClick={()=> onPick && onPick(r.slug)}>
          <div className="lb-rank mono">{String(r.bib).padStart(2,"0")}</div>
          <div className="lb-name"><RunnerLine runner={r} secondary={r.town} /></div>
          <div className="lb-loops mute-2">—</div>
          <div className="lb-last mute-2">—</div>
          <div className="lb-now">
            <span className="eyebrow">Au corral · ready</span>
          </div>
        </div>
      ))}
    </div>
  );
}

window.LeaderboardPanel = LeaderboardPanel;

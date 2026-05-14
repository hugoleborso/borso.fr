/* EliminatedWall — every DNF as a tile, latest at the top, with reason + last loop. */

function EliminatedWallPanel({ phase, onPick }) {
  const dnfs = [...phase.dnf].sort((a,b)=> b.dropAt - a.dropAt);
  return (
    <div className="card" data-screen-label="eliminated-wall">
      <div className="card-head">
        <div className="card-title">
          Mur des éliminés
          <span className="en">DNF WALL</span>
        </div>
        <div className="card-meta">
          {dnfs.length} sortis · {phase.runners.length - phase.dnf.length - phase.winners.length} en piste
        </div>
      </div>
      <div className="card-body flush">
        {dnfs.length === 0 ? (
          <div style={{padding:"var(--d-8) var(--d-5)", textAlign:"center", color:"var(--ink-3)"}}>
            <div className="eyebrow" style={{marginBottom:"var(--d-3)"}}>Aucune sortie pour l'instant</div>
            <div style={{fontSize:13}}>Tous les coureurs sont encore en course.</div>
          </div>
        ) : (
          <div className="wall-grid">
            {dnfs.map(r => (
              <div key={r.slug} className="dnf-tile" onClick={() => onPick && onPick(r.slug)}>
                <div className="dnf-bib mono">#{String(r.bib).padStart(2,"0")}</div>
                <div className="dnf-row">
                  <RunnerAvatar runner={r} size={36} dim />
                  <div style={{flex:1, minWidth:0}}>
                    <div className="dnf-name">{r.name}</div>
                    <div className="dnf-reason">{r.dropReason || "Cut-off"}</div>
                  </div>
                </div>
                <div className="dnf-foot">
                  <span className="mono"><b>{r.dropAt}</b><span className="mute-2"> boucles</span></span>
                  <span className="mono mute-2">{(r.dropAt * 6.706).toFixed(1)} km</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        .wall-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: var(--d-3);
          padding: var(--d-4) var(--d-5);
        }
        .dnf-tile {
          position: relative;
          padding: var(--d-3) var(--d-4);
          border: 1px solid var(--line);
          border-radius: var(--radius-2);
          background: var(--bg);
          display: flex;
          flex-direction: column;
          gap: var(--d-3);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          overflow: hidden;
        }
        .dnf-tile:hover { border-color: var(--ink-mute); background: var(--bg-elev-2); }
        .dnf-tile::before {
          content:""; position:absolute; left:0; top:0; bottom:0; width: 3px;
          background: var(--danger); opacity: 0.6;
        }
        .dnf-bib {
          font-size: 10px;
          color: var(--ink-mute);
          letter-spacing: 0.08em;
          position: absolute;
          right: 10px; top: 8px;
        }
        .dnf-row { display: flex; gap: var(--d-3); align-items: center; }
        .dnf-name {
          font-size: 13px; font-weight: 500; color: var(--ink);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dnf-reason {
          font-size: 11px; color: var(--ink-3);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dnf-foot {
          display: flex; justify-content: space-between;
          font-size: 11px; color: var(--ink-2);
          padding-top: var(--d-2);
          border-top: 1px dashed var(--line-soft);
        }
      `}</style>
    </div>
  );
}

window.EliminatedWallPanel = EliminatedWallPanel;

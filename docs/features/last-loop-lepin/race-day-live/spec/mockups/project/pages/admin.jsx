/* AdminPage — PIN gate → punch UI optimized for the top-of-hour rush.
   Layout: header with countdown to next top + recent punches feed,
           grid of big runner tiles (un tap = pointage),
           confirmation banner on click. */

const { useState: _aS, useEffect: _aE, useMemo: _aM } = React;

function AdminPage({ phase, setRoute }) {
  const [authed, setAuthed] = _aS(false);
  return authed
    ? <AdminConsole phase={phase} setRoute={setRoute} onLogout={() => setAuthed(false)} />
    : <PinGate onAuth={() => setAuthed(true)} />;
}

function PinGate({ onAuth }) {
  const [pin, setPin] = _aS("");
  const [tries, setTries] = _aS(0);
  const [locked, setLocked] = _aS(false);
  const [err, setErr] = _aS("");

  function submit(e){
    e.preventDefault();
    if (locked) return;
    if (pin === window.EDITION.pin) { onAuth(); return; }
    const t = tries + 1;
    setTries(t);
    if (t >= 3) { setLocked(true); setErr("Trop de tentatives · attendre 60 s."); setTimeout(()=>{setLocked(false); setTries(0); setErr("");}, 8000); }
    else setErr(`PIN invalide · ${3 - t} essai${3 - t > 1 ? "s" : ""} restant${3 - t > 1 ? "s" : ""}.`);
    setPin("");
  }

  return (
    <div style={{
      display:"grid", placeItems:"center", padding:"var(--d-12)", height:"100%",
      background: "var(--bg)"
    }}>
      <form onSubmit={submit} className="card" style={{padding:"var(--d-8)", width:380, gap:"var(--d-4)", display:"flex", flexDirection:"column"}}>
        <div className="eyebrow">Espace orga · admin</div>
        <h1 style={{margin:0, fontFamily:"var(--font-display)", fontSize:24, fontWeight:600, letterSpacing:"-0.01em"}}>
          PIN organisation
        </h1>
        <div style={{color:"var(--ink-3)", fontSize:13, marginTop:-6}}>
          Saisir le code à 4 chiffres remis aux pointeurs. <span className="mute-2">Indice : 4242</span>
        </div>

        <div className="field" style={{marginTop:"var(--d-3)"}}>
          <label className="field-label">PIN <span className="en">PIN</span></label>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoFocus
            disabled={locked}
            value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g,"").slice(0,4)); setErr(""); }}
            style={{fontSize:22, textAlign:"center", letterSpacing:"0.5em", padding:"14px"}}
          />
        </div>

        {err && (
          <div style={{
            padding:"8px 12px", borderRadius:"var(--radius-2)",
            background:"color-mix(in oklch, var(--danger) 14%, transparent)",
            color:"var(--danger)", fontSize:12, fontFamily:"var(--font-mono)",
            border:"1px solid color-mix(in oklch, var(--danger) 30%, transparent)"
          }}>{err}</div>
        )}

        <button className="btn btn-primary btn-lg" type="submit" disabled={locked || pin.length !== 4}
                style={{opacity: (locked || pin.length !== 4) ? 0.5 : 1}}>
          Entrer dans la console
        </button>
        <div className="mute-2" style={{fontSize:11, fontFamily:"var(--font-mono)", textAlign:"center"}}>
          3 tentatives · rate-limit 60 s côté serveur
        </div>
      </form>
    </div>
  );
}

/* ───── console ───── */

function AdminConsole({ phase, setRoute, onLogout }) {
  // Mock punch state — runners with progress>=1 are "ready to punch"
  // Click a tile to "punch" them (turn green for this loop)
  const initialPunched = _aM(() => new Set(
    phase.inRace.filter(r => r.progress >= 1).map(r => r.slug)
  ), [phase.key]);
  const [punched, setPunched] = _aS(initialPunched);
  const [feed, setFeed] = _aS(() => buildInitialFeed(phase));
  const [banner, setBanner] = _aS(null);
  const [tab, setTab] = _aS("punch");

  // reset state when phase changes
  React.useEffect(() => {
    setPunched(new Set(phase.inRace.filter(r => r.progress >= 1).map(r => r.slug)));
    setFeed(buildInitialFeed(phase));
    setBanner(null);
  }, [phase.key]);

  function punch(r){
    const next = new Set(punched);
    if (next.has(r.slug)) {
      next.delete(r.slug);
      setBanner({type:"undo", text:`Pointage annulé — ${r.name}`, ts:now()});
    } else {
      next.add(r.slug);
      setBanner({type:"ok", text:`${r.name} pointé·e · boucle ${phase.loopIdx + 1}`, ts:now()});
      setFeed(f => [{ts: now(), runner: r.name, loop: phase.loopIdx + 1, by:"orga-1", slug:r.slug}, ...f].slice(0, 30));
    }
    setPunched(next);
  }

  const remaining = phase.inRace.filter(r => !punched.has(r.slug));
  const minutesLeft = Math.round(60 * (1 - phase.progressInLoop));
  const urgency = minutesLeft < 5 ? "danger" : minutesLeft < 10 ? "warn" : "ok";

  return (
    <div className="admin-grid" data-screen-label="04 Admin">
      <header className="admin-head">
        <div>
          <div className="eyebrow">Console pointage · admin</div>
          <h1 className="admin-h1">Boucle <span className="mono">{String(phase.loopIdx + 1).padStart(2,"0")}</span> en cours <span className="mute-2"> · loop {phase.loopIdx + 1}</span></h1>
        </div>
        <div className="admin-headtimer">
          <div className="eyebrow">Top horaire dans</div>
          <div className={`headtimer-val urgency-${urgency}`}>
            <span className="mono">{String(minutesLeft).padStart(2,"0")}</span><small>min</small>
          </div>
        </div>
        <div className="row" style={{gap:"var(--d-2)"}}>
          <button className="btn btn-ghost btn-sm" onClick={() => setRoute("spectator")}>Vue spectateur ↗</button>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Quitter</button>
        </div>
      </header>

      <div className="admin-tabs">
        <button className={tab==="punch"?"active":""}  onClick={()=>setTab("punch")}>Pointer <span className="en">PUNCH</span></button>
        <button className={tab==="dnf"?"active":""}    onClick={()=>setTab("dnf")}>DNF top horaire <span className="en">CUT-OFF</span></button>
        <button className={tab==="log"?"active":""}    onClick={()=>setTab("log")}>Journal <span className="en">LOG</span></button>
        <div style={{flex:1}}></div>
        <span className="mute-2 mono" style={{fontSize:11}}>{remaining.length} restants à pointer sur la boucle</span>
      </div>

      <div className="admin-body">
        {tab === "punch" && <PunchGrid phase={phase} punched={punched} onPunch={punch} />}
        {tab === "dnf"   && <DnfWindow  phase={phase} punched={punched} setPunched={setPunched} setFeed={setFeed} setBanner={setBanner} />}
        {tab === "log"   && <PunchFeed feed={feed} />}
      </div>

      {banner && <ActionBanner banner={banner} onClose={() => setBanner(null)} />}

      <style>{`
        .admin-grid {
          display: grid;
          grid-template-rows: auto auto 1fr;
          height: 100%; min-height: 0;
        }
        .admin-head {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: var(--d-6);
          align-items: end;
          padding: var(--d-5) var(--d-6) var(--d-4);
          border-bottom: 1px solid var(--line-soft);
        }
        .admin-h1 {
          margin: 4px 0 0; font-family: var(--font-display);
          font-size: 22px; font-weight: 600; letter-spacing: -0.01em;
        }
        .admin-headtimer { text-align: right; }
        .headtimer-val {
          font-family: var(--font-display); font-weight: 700;
          font-size: 36px; line-height: 1; letter-spacing: -0.02em;
        }
        .headtimer-val small { font-size: 12px; color: var(--ink-3); margin-left: 4px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; }
        .urgency-ok     { color: var(--ink); }
        .urgency-warn   { color: var(--warn); }
        .urgency-danger { color: var(--danger); animation: blink 1s steps(2) infinite; }
        @keyframes blink { 50% { opacity: 0.55; } }

        .admin-tabs {
          display: flex; gap: 2px;
          padding: 0 var(--d-6);
          border-bottom: 1px solid var(--line-soft);
          align-items: center;
        }
        .admin-tabs button {
          padding: 10px 14px;
          font-size: 12px; font-weight: 500; color: var(--ink-3);
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          display: flex; align-items: center; gap: 6px;
        }
        .admin-tabs button .en { font-size: 9px; color: var(--ink-mute); letter-spacing: 0.12em; }
        .admin-tabs button:hover { color: var(--ink); }
        .admin-tabs button.active { color: var(--ink); border-bottom-color: var(--accent); }

        .admin-body { overflow: auto; min-height: 0; }

        .punch-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: var(--d-3);
          padding: var(--d-5) var(--d-6);
        }
        .punch-tile {
          padding: var(--d-3) var(--d-4);
          background: var(--bg-elev);
          border: 1px solid var(--line);
          border-radius: var(--radius-3);
          display: flex; flex-direction: column; gap: var(--d-3);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, transform 0.05s;
          position: relative;
          min-height: 96px;
        }
        .punch-tile:hover { border-color: var(--ink-mute); background: var(--bg-elev-2); }
        .punch-tile:active { transform: scale(0.98); }
        .punch-tile.punched {
          background: color-mix(in oklch, var(--accent) 14%, var(--bg-elev));
          border-color: var(--accent);
        }
        .punch-tile.late {
          border-color: color-mix(in oklch, var(--warn) 50%, var(--line));
        }
        .punch-tile .bib { font-family: var(--font-mono); font-size: 10px; color: var(--ink-mute); letter-spacing: 0.08em; }
        .punch-tile .name { font-size: 14px; font-weight: 500; color: var(--ink); }
        .punch-tile .meta { font-family: var(--font-mono); font-size: 11px; color: var(--ink-3); }
        .punch-tile.punched .meta { color: var(--accent); font-weight: 600; }
        .punch-tile .pace { font-family: var(--font-mono); font-size: 10px; color: var(--ink-mute); letter-spacing: 0.05em; }
        .punch-tile .check {
          position: absolute; top: 8px; right: 8px;
          width: 18px; height: 18px; border-radius: 50%;
          border: 1.5px solid var(--line);
          display: grid; place-items: center;
          color: transparent; font-size: 12px; font-weight: 700;
        }
        .punch-tile.punched .check {
          background: var(--accent); border-color: var(--accent); color: var(--accent-ink);
        }
      `}</style>
    </div>
  );
}

function buildInitialFeed(phase){
  if (phase.loopIdx === 0) return [];
  // Generate ~10 punches for the previous loop
  return window.PUNCH_LOG.map((p,i) => ({...p}));
}
function now(){
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
}

function PunchGrid({ phase, punched, onPunch }){
  if (phase.key === "prerace") return (
    <div style={{padding:"var(--d-6)"}}>
      <div className="eyebrow">Avant départ</div>
      <div style={{marginTop:8, color:"var(--ink-2)"}}>Les boutons de pointage apparaîtront à 10:00, à l'instant où la première boucle démarre.</div>
    </div>
  );
  if (phase.key === "finished") return (
    <div style={{padding:"var(--d-6)"}}>
      <div className="eyebrow">Course terminée</div>
      <div style={{marginTop:8, color:"var(--ink-2)"}}>Plus rien à pointer. Voir « Journal » pour l'historique complet.</div>
    </div>
  );

  return (
    <div className="punch-grid">
      {phase.inRace.map(r => {
        const isPunched = punched.has(r.slug);
        const late = !isPunched && phase.progressInLoop > 0.95;
        const lap = `${Math.round(r.avgLoopMin)}'${String(Math.round((r.avgLoopMin*60)%60)).padStart(2,"0")}`;
        return (
          <button key={r.slug}
                  className={`punch-tile${isPunched ? " punched" : ""}${late ? " late" : ""}`}
                  onClick={() => onPunch(r)}>
            <span className="check">✓</span>
            <div className="row" style={{gap:"var(--d-3)"}}>
              <RunnerAvatar runner={r} size={32} />
              <div style={{minWidth:0}}>
                <div className="bib">#{String(r.bib).padStart(3,"0")}</div>
                <div className="name">{r.name}</div>
              </div>
            </div>
            <div className="row space-between">
              <span className="meta">{isPunched ? "✓ Pointé·e" : `${r.completedLoops} boucles`}</span>
              <span className="pace">~{lap} pace</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DnfWindow({ phase, punched, setPunched, setFeed, setBanner }){
  const inRace = phase.inRace;
  const notPunched = inRace.filter(r => !punched.has(r.slug));
  const minutesLeft = Math.round(60 * (1 - phase.progressInLoop));

  function confirmDnf(r){
    setFeed(f => [{ts: now(), runner: r.name, loop: phase.loopIdx + 1, by:"orga-1", dnf:true, slug:r.slug}, ...f]);
    setBanner({type:"dnf", text:`${r.name} marqué·e DNF — boucle ${phase.loopIdx + 1}`, ts:now()});
  }

  return (
    <div style={{padding:"var(--d-5) var(--d-6)", display:"flex", flexDirection:"column", gap:"var(--d-4)"}}>
      <div className="row space-between" style={{alignItems:"baseline"}}>
        <div>
          <div className="eyebrow">Top horaire dans {minutesLeft} min · candidats DNF</div>
          <div style={{fontSize:14, color:"var(--ink-2)", marginTop:4}}>
            Tous les coureurs en course n'ayant pas encore pointé. À T+0, le système suggérera ces DNF — vous validez ou contestez (un point manqué = sortie de course).
          </div>
        </div>
      </div>

      {notPunched.length === 0 ? (
        <div className="card" style={{padding:"var(--d-5)"}}>
          <div className="eyebrow">Tous pointés</div>
          <div style={{marginTop:6, color:"var(--ink-2)"}}>Aucun candidat. La boucle {phase.loopIdx + 1} est nette.</div>
        </div>
      ) : (
        <div className="dnf-list">
          {notPunched.map(r => (
            <div key={r.slug} className="dnf-cand">
              <RunnerAvatar runner={r} size={36} />
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontWeight:500}}>{r.name} <span className="mute-2 mono" style={{fontSize:11}}>#{String(r.bib).padStart(3,"0")}</span></div>
                <div className="muted" style={{fontSize:12}}>
                  Pace moyenne ~{r.avgLoopMin}' · dernière vue à {Math.round(r.progress*100)}% du tracé
                </div>
              </div>
              <button className="btn btn-sm">Toujours en piste</button>
              <button className="btn btn-sm btn-danger" onClick={() => confirmDnf(r)}>Valider DNF</button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .dnf-list { display: flex; flex-direction: column; gap: var(--d-2); }
        .dnf-cand {
          display: grid;
          grid-template-columns: auto 1fr auto auto;
          gap: var(--d-4);
          align-items: center;
          padding: var(--d-3) var(--d-4);
          border: 1px solid var(--line);
          border-left: 3px solid var(--warn);
          border-radius: var(--radius-2);
          background: var(--bg-elev);
        }
      `}</style>
    </div>
  );
}

function PunchFeed({ feed }){
  return (
    <div style={{padding:"var(--d-4) var(--d-6)"}}>
      <table style={{width:"100%", borderCollapse:"collapse", fontSize:13}}>
        <thead>
          <tr style={{textAlign:"left", color:"var(--ink-3)", fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase"}}>
            <th style={{padding:"8px 12px", borderBottom:"1px solid var(--line-soft)"}}>Heure</th>
            <th style={{padding:"8px 12px", borderBottom:"1px solid var(--line-soft)"}}>Coureur·euse</th>
            <th style={{padding:"8px 12px", borderBottom:"1px solid var(--line-soft)"}}>Boucle</th>
            <th style={{padding:"8px 12px", borderBottom:"1px solid var(--line-soft)"}}>Action</th>
            <th style={{padding:"8px 12px", borderBottom:"1px solid var(--line-soft)"}}>Par</th>
            <th style={{padding:"8px 12px", borderBottom:"1px solid var(--line-soft)"}}></th>
          </tr>
        </thead>
        <tbody>
          {feed.map((p,i) => (
            <tr key={i} style={{borderBottom:"1px solid var(--line-soft)"}}>
              <td style={{padding:"10px 12px"}} className="mono">{p.ts}</td>
              <td style={{padding:"10px 12px"}}>{p.runner}</td>
              <td style={{padding:"10px 12px"}} className="mono">{p.loop}</td>
              <td style={{padding:"10px 12px"}}>
                {p.dnf
                  ? <span style={{color:"var(--danger)", fontFamily:"var(--font-mono)", fontSize:11}}>DNF</span>
                  : p.corrected
                  ? <span style={{color:"var(--warn)", fontFamily:"var(--font-mono)", fontSize:11}}>CORRIGÉ</span>
                  : <span style={{color:"var(--ink-2)", fontFamily:"var(--font-mono)", fontSize:11}}>PUNCH</span>}
              </td>
              <td style={{padding:"10px 12px"}} className="mono mute-2">{p.by}</td>
              <td style={{padding:"10px 12px", textAlign:"right"}}>
                <button className="btn btn-ghost btn-sm">Éditer</button>
                <button className="btn btn-ghost btn-sm" style={{color:"var(--danger)"}}>Annuler</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionBanner({ banner, onClose }){
  React.useEffect(() => {
    const id = setTimeout(onClose, 3200);
    return () => clearTimeout(id);
  }, [banner.ts]);
  const color = banner.type === "dnf" ? "var(--danger)" : banner.type === "undo" ? "var(--warn)" : "var(--accent)";
  return (
    <div style={{
      position:"fixed", left:"50%", bottom: 24,
      transform: "translateX(-50%)",
      padding:"10px 16px 10px 12px",
      background:"var(--bg-elev-2)",
      border:`1px solid ${color}`,
      borderRadius: "var(--radius-pill)",
      display:"flex", alignItems:"center", gap: 10,
      boxShadow:"var(--shadow-2)",
      zIndex: 100,
    }}>
      <span style={{width:8, height:8, background:color, borderRadius:"50%"}}></span>
      <span style={{fontSize:13, color:"var(--ink)"}}>{banner.text}</span>
      <span className="mono mute-2" style={{fontSize:10, marginLeft:8}}>{banner.ts}</span>
    </div>
  );
}

window.AdminPage = AdminPage;

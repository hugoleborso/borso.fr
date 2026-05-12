/* Countdown — three styles, driven by tweak.
   `phase.progressInLoop` is 0..1 of the current hour.
   We show TIME LEFT until next top horaire (boucle suivante).
*/

function useTick(intervalMs = 1000){
  const [, setN] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setN(n => n+1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

function computeRemaining(phase){
  // returns { totalSec, leftSec, leftMin, leftSecOnly }
  const total = 60 * 60;
  let left;
  if (phase.key === "prerace") {
    // count down to start: assume start is 30 min away at "prerace"
    left = 30 * 60;
  } else if (phase.key === "finished") {
    left = 0;
  } else {
    left = Math.round(total * (1 - phase.progressInLoop));
  }
  // Animate seconds within left using realtime, so it feels live without changing source data
  const realSec = Math.floor(Date.now() / 1000) % 60;
  const fake = Math.max(0, left - realSec);
  return {
    totalSec: total,
    leftSec: fake,
    mm: Math.floor(fake / 60),
    ss: fake % 60,
    progress: 1 - fake / total,
  };
}

function CountdownPanel({ phase, style }) {
  useTick(1000);
  const r = computeRemaining(phase);
  const isPre = phase.key === "prerace";
  const isDone = phase.key === "finished";

  return (
    <div className="card" data-screen-label="countdown">
      <div className="card-head">
        <div className="card-title">
          {isPre ? "Avant le départ" : isDone ? "Course terminée" : "Prochain top horaire"}
          <span className="en">{isPre ? "BEFORE START" : isDone ? "FINISHED" : "NEXT HOURLY TOP"}</span>
        </div>
        <div className="card-meta">
          {isPre ? `Départ ${window.EDITION.startTime}` : isDone ? "—" : `Boucle ${phase.loopIdx + 2}`}
        </div>
      </div>
      <div className="card-body" style={{display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", gap:"var(--d-4)", textAlign:"center"}}>
        {isDone ? (
          <FinishedDisplay />
        ) : (
          <>
            {style === "split-flap" && <SplitFlap mm={r.mm} ss={r.ss} />}
            {style === "ring"       && <RingCountdown mm={r.mm} ss={r.ss} progress={r.progress} />}
            {style === "bar"        && <BarCountdown  mm={r.mm} ss={r.ss} progress={r.progress} />}
            <div className="eyebrow">
              {isPre
                ? <>Lancement&nbsp;de&nbsp;la&nbsp;boucle&nbsp;1 · {window.EDITION.startTime}</>
                : <>Il reste pour finir cette boucle</>}
              <span className="mute-2"> · MM:SS</span>
            </div>
            <CountdownContext phase={phase} r={r} />
          </>
        )}
      </div>
    </div>
  );
}

function CountdownContext({ phase, r }){
  // Show "X coureurs encore en piste / Y attendent au village"
  const inField = phase.inRace.filter(x => x.progress < 1).length;
  const atCorral = phase.inRace.length - inField;
  return (
    <div style={{display:"flex", gap:"var(--d-6)", marginTop:"var(--d-3)", color:"var(--ink-3)", fontSize:12}} className="mono">
      <span><b style={{color:"var(--ink)"}}>{inField}</b> sur la boucle</span>
      <span className="mute-2">·</span>
      <span><b style={{color:"var(--ink)"}}>{atCorral}</b> au corral</span>
      <span className="mute-2">·</span>
      <span><b style={{color:"var(--ink)"}}>{phase.dnf.length}</b> DNF</span>
    </div>
  );
}

function FinishedDisplay(){
  return (
    <div style={{textAlign:"center", padding:"var(--d-6) 0"}}>
      <div className="eyebrow" style={{marginBottom:"var(--d-3)"}}>Course terminée · 24 boucles · 160,9 km</div>
      <div style={{fontFamily:"var(--font-display)", fontWeight:700, fontSize:48, letterSpacing:"-0.02em", lineHeight:1.05}}>
        Léa Fournier
      </div>
      <div style={{color:"var(--ink-3)", marginTop:"var(--d-3)"}}>Vainqueure · 24 boucles bouclées</div>
    </div>
  );
}

/* ───── split-flap ───── */
function SplitFlap({ mm, ss }) {
  return (
    <div style={{display:"flex", alignItems:"center", gap:"var(--d-3)"}}>
      <FlapPair n={mm} />
      <span className="mono" style={{fontSize:48, color:"var(--ink-mute)", lineHeight:1, transform:"translateY(-4px)"}}>:</span>
      <FlapPair n={ss} />
    </div>
  );
}
function FlapPair({ n }) {
  const s = String(n).padStart(2,"0");
  return (
    <div style={{display:"flex", gap:"var(--d-2)"}}>
      <Flap c={s[0]} /><Flap c={s[1]} />
    </div>
  );
}
function Flap({ c }) {
  return (
    <span
      key={c}
      className="mono"
      style={{
        display:"inline-flex", alignItems:"center", justifyContent:"center",
        width: 64, height: 88,
        background: "linear-gradient(180deg, var(--bg-elev-2) 0%, var(--bg-elev-2) 49%, var(--bg) 50%, var(--bg) 100%)",
        border: "1px solid var(--line)",
        borderRadius: 6,
        fontSize: 64, fontWeight: 700, color: "var(--ink)",
        position:"relative",
        boxShadow:"0 4px 12px rgba(0,0,0,0.25)",
        animation: "flap 0.4s ease-out",
      }}
    >
      {c}
      <span aria-hidden style={{position:"absolute", top:"50%", left:0, right:0, height:1, background:"rgba(0,0,0,0.6)"}}></span>
    </span>
  );
}

/* ───── ring ───── */
function RingCountdown({ mm, ss, progress }){
  const r = 70;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);
  return (
    <div style={{position:"relative", width: 200, height: 200}}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle cx="100" cy="100" r={r} fill="none"
                stroke="var(--accent)" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={offset}
                transform="rotate(-90 100 100)" />
      </svg>
      <div style={{position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
        <span className="mono" style={{fontSize: 44, fontWeight: 600, letterSpacing:"-0.02em", lineHeight:1}}>
          {String(mm).padStart(2,"0")}:{String(ss).padStart(2,"0")}
        </span>
      </div>
    </div>
  );
}

/* ───── bar ───── */
function BarCountdown({ mm, ss, progress }){
  return (
    <div style={{width:"100%", maxWidth: 420, display:"flex", flexDirection:"column", alignItems:"center", gap:"var(--d-4)"}}>
      <span className="mono" style={{fontSize: 72, fontWeight: 700, letterSpacing:"-0.04em", lineHeight: 1}}>
        {String(mm).padStart(2,"0")}<span style={{color:"var(--ink-mute)"}}>:</span>{String(ss).padStart(2,"0")}
      </span>
      <div style={{width:"100%", height: 10, background:"var(--bg-elev-2)", borderRadius:999, overflow:"hidden", border:"1px solid var(--line)"}}>
        <div style={{height:"100%", width: `${progress*100}%`, background:"var(--accent)", transition:"width 0.4s linear"}}></div>
      </div>
      <div className="mono mute-2" style={{display:"flex", justifyContent:"space-between", width:"100%", fontSize: 11}}>
        <span>:00</span><span>:15</span><span>:30</span><span>:45</span><span>:60</span>
      </div>
    </div>
  );
}

window.CountdownPanel = CountdownPanel;

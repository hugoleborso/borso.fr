/* app.jsx — top-level shell, route nav, tweak wiring */
const { useState, useMemo, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "aesthetic": "scoreboard",
  "palette": "green",
  "density": "comfortable",
  "phase": "daylight",
  "countdownStyle": "split-flap"
}/*EDITMODE-END*/;

const ROUTES = [
  { key: "home",      fr: "Hors-jour-J",   en: "BEFORE",    Page: window.HomePage },
  { key: "spectator", fr: "Spectateur",    en: "LIVE",      Page: window.SpectatorPage },
  { key: "runner",    fr: "Fiche coureur", en: "RUNNER",    Page: window.RunnerFichePage },
  { key: "admin",     fr: "Admin",         en: "ADMIN",     Page: window.AdminPage },
  { key: "setup",     fr: "Setup édition", en: "SETUP",     Page: window.SetupPage },
];

function useWallClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState("spectator");

  // re-discover pages each render (they may have hot-mounted late)
  const routesResolved = ROUTES.map(r => ({...r, Page: window[
    r.key === "home" ? "HomePage" :
    r.key === "spectator" ? "SpectatorPage" :
    r.key === "runner" ? "RunnerFichePage" :
    r.key === "admin" ? "AdminPage" : "SetupPage"
  ]}));

  const phaseState = useMemo(() => {
    return window.PHASE_STATES.find(p => p.key === t.phase) || window.PHASE_STATES[1];
  }, [t.phase]);

  const current = routesResolved.find(r => r.key === route) || routesResolved[1];
  const Page = current.Page;

  // mirror tweaks onto <html data-...> so CSS can switch aesthetic instantly
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-aesthetic", t.aesthetic);
    root.setAttribute("data-palette", t.palette);
    root.setAttribute("data-density", t.density);
  }, [t.aesthetic, t.palette, t.density]);

  return (
    <div className="app" data-screen-label={`00 ${current.fr}`}>
      <Topbar route={route} setRoute={setRoute} routes={routesResolved} phase={phaseState} />
      <div className="main">
        {Page
          ? <Page phase={phaseState} t={t} setTweak={setTweak} setRoute={setRoute} />
          : <div style={{padding:24, color:"var(--ink-3)"}}>Page « {current.fr} » non chargée.</div>}
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Aesthetic" />
        <TweakRadio
          label="Direction"
          value={t.aesthetic}
          options={["scoreboard", "topo", "telemetry"]}
          onChange={v => setTweak("aesthetic", v)}
        />
        <TweakSelect
          label="Palette / accent"
          value={t.palette}
          options={[
            { value: "green", label: "Forêt" },
            { value: "amber", label: "Ambre" },
            { value: "cyan",  label: "Glacier" },
            { value: "red",   label: "Rouge" },
          ]}
          onChange={v => setTweak("palette", v)}
        />
        <TweakRadio
          label="Densité"
          value={t.density}
          options={["compact", "comfortable", "airy"]}
          onChange={v => setTweak("density", v)}
        />

        <TweakSection label="Course" />
        <TweakSelect
          label="Phase de course"
          value={t.phase}
          options={window.PHASES.map(p => ({ value: p.key, label: p.label }))}
          onChange={v => setTweak("phase", v)}
        />
        <TweakRadio
          label="Style countdown"
          value={t.countdownStyle}
          options={["split-flap", "ring", "bar"]}
          onChange={v => setTweak("countdownStyle", v)}
        />
      </TweaksPanel>
    </div>
  );
}

function Topbar({ route, setRoute, routes, phase }) {
  const now = useWallClock();
  const isLive = phase.key !== "prerace" && phase.key !== "finished";
  const hhmm = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark"></span>
        Last&nbsp;Loop&nbsp;Lépin
        <small>· {window.EDITION.edition} · {window.EDITION.year}</small>
      </div>
      <nav className="nav" aria-label="Sections">
        {routes.map(r => (
          <button key={r.key} className={r.key === route ? "active" : ""} onClick={() => setRoute(r.key)}>
            {r.fr} <span className="en">{r.en}</span>
          </button>
        ))}
      </nav>
      <div className="topbar-right">
        {isLive && <span className="live-pill">Live · boucle {phase.loopIdx + 1}</span>}
        {phase.key === "prerace"  && <span className="live-pill" style={{
          color:"var(--warn)",
          background:"color-mix(in oklch, var(--warn) 14%, transparent)",
          borderColor:"color-mix(in oklch, var(--warn) 35%, transparent)"
        }}>Avant départ</span>}
        {phase.key === "finished" && <span className="live-pill" style={{
          color:"var(--ink-2)",
          background:"var(--bg-elev-2)",
          borderColor:"var(--line)"
        }}>Course terminée</span>}
        <span className="clock"><small>Maintenant</small>{phase.nowLabel}</span>
      </div>
    </header>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

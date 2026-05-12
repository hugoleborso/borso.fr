/* CourseMap — SVG loop with runner dots moving along it.
   Position computed from each runner's `progress` (0..1).
   We also show sunrise/sunset markers as a vertical bar to the side. */

function CourseMapPanel({ phase, onPick }) {
  const inRace = phase.inRace.filter(r => r.progress < 1);
  const punched = phase.inRace.filter(r => r.progress >= 1);

  return (
    <div className="card" data-screen-label="course-map">
      <div className="card-head">
        <div className="card-title">
          Carte du tracé
          <span className="en">COURSE</span>
        </div>
        <div className="card-meta">
          {window.EDITION.loopDistanceKm} km · D+ {window.EDITION.loopDPlusM} m
        </div>
      </div>
      <div className="card-body flush" style={{display:"grid", gridTemplateColumns:"1fr auto", minHeight: 0}}>
        <MapCanvas phase={phase} onPick={onPick} />
        <SunGutter phase={phase} />
      </div>
    </div>
  );
}

function MapCanvas({ phase, onPick }) {
  const path = window.COURSE_PATH;
  const inRace = phase.inRace;
  const isNight = phase.key === "night";
  const isSunset = phase.key === "sunset";

  return (
    <div style={{position:"relative", width:"100%", minHeight: 320, padding: "var(--d-4)"}}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"
           style={{width:"100%", height:"100%", minHeight: 320, display:"block"}}>
        <defs>
          {/* contour line pattern, subtle */}
          <pattern id="contours" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="2.5" fill="none" stroke="var(--line-soft)" strokeWidth="0.15" />
          </pattern>
          {/* lake fill — visible only in topo aesthetic to feel like Lac d'Aiguebelette */}
        </defs>

        {/* lake suggestion behind the loop */}
        <ellipse cx="50" cy="55" rx="48" ry="40"
                 fill="color-mix(in oklch, var(--accent) 4%, var(--bg-elev-2))"
                 stroke="var(--line-soft)" strokeWidth="0.4" strokeDasharray="0.6 0.4" />

        {/* contour fill on top, subtle */}
        <ellipse cx="50" cy="55" rx="48" ry="40" fill="url(#contours)" opacity="0.5" />

        {/* the loop path */}
        <CoursePath path={path} />

        {/* start/finish marker */}
        <StartMarker path={path} />

        {/* runners */}
        {inRace.map(r => <RunnerDot key={r.slug} r={r} path={path} onPick={onPick} />)}
      </svg>

      <MapLegend phase={phase} />

      {(isNight) && <div style={{
        position:"absolute", inset: 0, pointerEvents:"none",
        background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.55) 90%)"
      }}></div>}
      {(isSunset) && <div style={{
        position:"absolute", inset: 0, pointerEvents:"none",
        background: "linear-gradient(180deg, rgba(255,160,80,0.06), rgba(0,0,0,0.0) 60%)"
      }}></div>}
    </div>
  );
}

function CoursePath({ path }) {
  return (
    <>
      <path d={path} fill="none" stroke="var(--line)" strokeWidth="1.6" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="0.55"
            strokeLinecap="round" strokeDasharray="0.6 1.2" opacity="0.9" />
    </>
  );
}

// Track-point sampling: cache an SVG <path> we measure with getPointAtLength
function useSampledPath(d, samples = 400) {
  return React.useMemo(() => {
    // Off-DOM measurement
    const svgNS = "http://www.w3.org/2000/svg";
    const p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", d);
    const len = p.getTotalLength();
    const pts = new Array(samples + 1);
    for (let i = 0; i <= samples; i++) {
      const t = (i / samples) * len;
      const pt = p.getPointAtLength(t);
      pts[i] = [pt.x, pt.y];
    }
    return { pts, len };
  }, [d, samples]);
}

function pointAt(sampled, frac) {
  const f = Math.max(0, Math.min(1, frac));
  const idx = f * (sampled.pts.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(sampled.pts.length - 1, lo + 1);
  const k = idx - lo;
  const [x1, y1] = sampled.pts[lo];
  const [x2, y2] = sampled.pts[hi];
  return [x1 + (x2 - x1) * k, y1 + (y2 - y1) * k];
}

function StartMarker({ path }) {
  const sampled = useSampledPath(path);
  if (!sampled) return null;
  const [x, y] = sampled.pts[0];
  return (
    <g>
      <circle cx={x} cy={y} r="2.2" fill="var(--bg)" stroke="var(--ink)" strokeWidth="0.6" />
      <circle cx={x} cy={y} r="0.8" fill="var(--ink)" />
      <text x={x + 3} y={y - 2} fontSize="2.6" fill="var(--ink-2)" style={{fontFamily:"var(--font-mono)"}}>
        DÉPART / FINISH
      </text>
    </g>
  );
}

function RunnerDot({ r, path, onPick }) {
  const sampled = useSampledPath(path);
  if (!sampled) return null;
  const [x, y] = pointAt(sampled, r.progress);
  const fill = `oklch(0.70 0.13 ${r.hue})`;
  return (
    <g style={{cursor:"pointer"}} onClick={() => onPick && onPick(r.slug)}>
      <circle cx={x} cy={y} r="2.2" fill={fill} stroke="var(--bg-elev)" strokeWidth="0.55" />
      <text x={x} y={y + 0.7} fontSize="1.8" fontWeight="700"
            textAnchor="middle" fill="var(--bg)" style={{fontFamily:"var(--font-display)", pointerEvents:"none"}}>
        {r.initials}
      </text>
    </g>
  );
}

function MapLegend({ phase }) {
  return (
    <div style={{
      position: "absolute", left: "var(--d-4)", bottom: "var(--d-4)",
      display: "flex", flexDirection:"column", gap: 4,
      padding: "6px 10px",
      background: "color-mix(in oklch, var(--bg) 70%, transparent)",
      backdropFilter: "blur(8px)",
      border: "1px solid var(--line)",
      borderRadius: 6,
      fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)",
      lineHeight: 1.3,
    }}>
      <div>Lac d'Aiguebelette · 45.546°N · 5.770°E</div>
      <div className="mute-2">Positions estimées d'après pace moyenne · ±60 s</div>
    </div>
  );
}

/* ───── sunrise/sunset gutter ───── */
function SunGutter({ phase }) {
  // 24-h vertical timeline from 09:00 (1 h before start) to 12:00 next day (after end-of-race)
  const startMin = 9 * 60;
  const endMin = (24 + 12) * 60;
  const range = endMin - startMin;

  const sun = window.EDITION;
  const sunriseMin = parseHm(sun.sunrise) + 24*60; // next morning
  const sunsetMin  = parseHm(sun.sunset);
  const dawnMin    = parseHm(sun.civilDawn) + 24*60;
  const duskMin    = parseHm(sun.civilDusk);

  const raceStart  = 10 * 60;
  const raceEndExp = (24 + 12) * 60; // 24 loops max
  const nowMin     = phase.nowMin;

  function pct(m){ return Math.max(0, Math.min(100, ((m - startMin) / range) * 100)); }

  return (
    <div style={{
      width: 110, padding: "var(--d-4) var(--d-4) var(--d-4) 0",
      borderLeft: "1px solid var(--line-soft)",
      position:"relative", flexShrink: 0
    }}>
      <div className="eyebrow" style={{marginBottom: 6, paddingLeft: "var(--d-3)"}}>Soleil · sun</div>
      <div style={{
        position:"relative", width: 8, height: "calc(100% - 24px)",
        marginLeft: "var(--d-4)",
        borderRadius: 4,
        background: `linear-gradient(
          180deg,
          color-mix(in oklch, var(--warn) 30%, var(--bg-elev-2)) 0%,
          color-mix(in oklch, var(--warn) 30%, var(--bg-elev-2)) ${pct(duskMin)}%,
          var(--bg-elev-2) ${pct(duskMin)}%,
          var(--bg-elev-2) ${pct(sunriseMin)}%,
          color-mix(in oklch, var(--warn) 30%, var(--bg-elev-2)) ${pct(sunriseMin)}%,
          color-mix(in oklch, var(--warn) 30%, var(--bg-elev-2)) 100%
        )`,
        border: "1px solid var(--line-soft)",
      }}>
        {/* event ticks */}
        <SunTick top={pct(sunsetMin)}   label="Coucher" sub={sun.sunset}  />
        <SunTick top={pct(duskMin)}     label="Nuit"    sub={sun.civilDusk} dim />
        <SunTick top={pct(sunriseMin)}  label="Lever"   sub={sun.sunrise} />
        <SunTick top={pct(dawnMin)}     label="Aube"    sub={sun.civilDawn} dim />
        {/* race window */}
        <div style={{
          position:"absolute", left: -2, right: -2,
          top: `${pct(raceStart)}%`, bottom: `${100 - pct(raceEndExp)}%`,
          border: "1px solid var(--accent)",
          borderRadius: 4, pointerEvents:"none",
        }}></div>
        {/* now indicator */}
        <div style={{
          position:"absolute", left: -8, right: -8,
          top: `${pct(nowMin)}%`,
          height: 2, background: "var(--ink)", boxShadow: "0 0 0 1px var(--bg)",
          pointerEvents:"none",
        }}>
          <span style={{
            position:"absolute", left: 12, top: -7,
            fontFamily:"var(--font-mono)", fontSize: 10, color:"var(--ink)",
            background:"var(--bg)", padding:"1px 4px", borderRadius:3,
            border:"1px solid var(--line)",
            whiteSpace:"nowrap"
          }}>
            {phase.nowLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function SunTick({ top, label, sub, dim }){
  return (
    <div style={{
      position:"absolute", left: 12, top: `${top}%`,
      transform:"translateY(-50%)",
      display:"flex", alignItems:"center", gap: 6,
      whiteSpace:"nowrap",
    }}>
      <span style={{display:"block", width: 14, height: 1, background: dim?"var(--line)":"var(--line)"}}></span>
      <div style={{lineHeight:1.1}}>
        <div style={{fontSize: 10, color: dim?"var(--ink-mute)":"var(--ink-3)", letterSpacing:"0.04em"}}>{label}</div>
        <div className="mono" style={{fontSize: 10, color: dim?"var(--ink-mute)":"var(--ink-2)"}}>{sub}</div>
      </div>
    </div>
  );
}

function parseHm(s){
  const [h, m] = s.split(":").map(n => parseInt(n,10));
  return h*60 + m;
}

window.CourseMapPanel = CourseMapPanel;

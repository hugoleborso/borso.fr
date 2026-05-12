/* SetupPage — admin setup d'édition.
   Wizard-ish single screen: edition meta, GPX upload, sunrise/sunset
   (computed, read-only), runner CRUD. */

const { useState: _suS } = React;

function SetupPage({ phase, setRoute }) {
  const [step, setStep] = _suS("edition");

  return (
    <div className="su" data-screen-label="05 Setup">
      <aside className="su-side">
        <div className="eyebrow" style={{padding:"var(--d-4) var(--d-4) var(--d-2)"}}>Setup édition · admin</div>
        <nav className="su-steps">
          {[
            ["edition", "01", "Édition", "Date, lieu, PIN orga"],
            ["gpx",     "02", "Tracé GPX", "Boucle officielle"],
            ["sun",     "03", "Soleil & cut-offs", "Sunrise/sunset auto"],
            ["roster",  "04", "Plateau", "Coureur·euses inscrits"],
            ["review",  "05", "Relecture", "Tout est ok ?"],
          ].map(([k, n, t, d]) => (
            <button key={k} className={`su-step ${step === k ? "active":""}`} onClick={()=>setStep(k)}>
              <span className="su-step-n mono">{n}</span>
              <span>
                <span className="su-step-t">{t}</span>
                <span className="su-step-d">{d}</span>
              </span>
            </button>
          ))}
        </nav>
        <div style={{padding:"var(--d-4)", borderTop:"1px solid var(--line-soft)"}}>
          <button className="btn btn-sm" style={{width:"100%"}} onClick={()=>setRoute("home")}>← Quitter</button>
        </div>
      </aside>

      <section className="su-main">
        {step === "edition" && <EditionForm onNext={()=>setStep("gpx")} />}
        {step === "gpx"     && <GpxUpload   onNext={()=>setStep("sun")} onPrev={()=>setStep("edition")} />}
        {step === "sun"     && <SunReadout  onNext={()=>setStep("roster")} onPrev={()=>setStep("gpx")} />}
        {step === "roster"  && <Roster      onNext={()=>setStep("review")} onPrev={()=>setStep("sun")} />}
        {step === "review"  && <Review      onPrev={()=>setStep("roster")} setRoute={setRoute} />}
      </section>

      <style>{`
        .su {
          display: grid;
          grid-template-columns: 280px 1fr;
          height: 100%; min-height: 0;
        }
        .su-side { border-right: 1px solid var(--line-soft); display: flex; flex-direction: column; min-height: 0; }
        .su-steps { padding: 0 var(--d-2); flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; gap: 2px; }
        .su-step {
          display: grid;
          grid-template-columns: 36px 1fr;
          gap: var(--d-2);
          padding: var(--d-3) var(--d-3);
          border-radius: var(--radius-2);
          align-items: center;
          text-align: left;
        }
        .su-step:hover { background: var(--bg-elev); }
        .su-step.active { background: var(--bg-elev-2); }
        .su-step.active .su-step-n { color: var(--accent); }
        .su-step-n {
          width: 30px; height: 30px;
          display: grid; place-items: center;
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: 50%;
          color: var(--ink-2); font-size: 11px; font-weight: 600;
        }
        .su-step-t { display: block; font-size: 13px; font-weight: 500; color: var(--ink); }
        .su-step-d { display: block; font-size: 11px; color: var(--ink-3); margin-top: 2px; }

        .su-main { overflow: auto; padding: var(--d-6) var(--d-8); display: flex; flex-direction: column; gap: var(--d-5); min-height: 0; }
        .su-h1 { margin: 0; font-family: var(--font-display); font-size: 26px; font-weight: 600; letter-spacing: -0.01em; }
        .su-section-desc { color: var(--ink-3); font-size: 13px; margin-top: 4px; max-width: 60ch; }

        .su-form { display: grid; grid-template-columns: 1fr 1fr; gap: var(--d-4); max-width: 720px; }
        .su-form .field-wide { grid-column: 1 / -1; }
        .su-footer { display: flex; gap: var(--d-3); justify-content: flex-end; padding-top: var(--d-4); border-top: 1px solid var(--line-soft); margin-top: var(--d-4); }
      `}</style>
    </div>
  );
}

function EditionForm({ onNext }) {
  return (
    <div>
      <h1 className="su-h1">Édition <span className="muted" style={{fontWeight:500, fontSize:18}}>· edition</span></h1>
      <p className="su-section-desc">Définir le nom, le lieu, l'horaire et la sécurité d'accès. Ces informations alimentent le site spectateur et la console de pointage.</p>

      <div className="su-form" style={{marginTop:"var(--d-6)"}}>
        <div className="field">
          <label className="field-label">Nom de l'édition <span className="en">NAME</span></label>
          <input className="input" defaultValue="Last Loop Lépin · II · 2026" />
        </div>
        <div className="field">
          <label className="field-label">Slug URL <span className="en">SLUG</span></label>
          <input className="input mono" defaultValue="lll-2026" />
        </div>
        <div className="field">
          <label className="field-label">Date & heure de départ <span className="en">START</span></label>
          <input className="input" type="datetime-local" defaultValue="2026-09-19T10:00" />
        </div>
        <div className="field">
          <label className="field-label">Limite physique <span className="en">RACE END</span></label>
          <input className="input" type="datetime-local" defaultValue="2026-09-20T22:00" />
        </div>
        <div className="field field-wide">
          <label className="field-label">Lieu <span className="en">LOCATION</span></label>
          <input className="input" defaultValue="Lépin-le-Lac, Savoie · Lac d'Aiguebelette" />
        </div>
        <div className="field">
          <label className="field-label">Latitude départ <span className="en">LAT</span></label>
          <input className="input mono" defaultValue="45.5466" />
        </div>
        <div className="field">
          <label className="field-label">Longitude départ <span className="en">LNG</span></label>
          <input className="input mono" defaultValue="5.7706" />
        </div>
        <div className="field">
          <label className="field-label">PIN organisation <span className="en">ADMIN PIN</span></label>
          <input className="input mono" type="password" defaultValue="4242" maxLength={4} />
        </div>
        <div className="field">
          <label className="field-label">Fuseau horaire <span className="en">TZ</span></label>
          <select className="select" defaultValue="Europe/Paris">
            <option>Europe/Paris</option><option>UTC</option>
          </select>
        </div>
      </div>

      <div className="su-footer">
        <button className="btn btn-primary" onClick={onNext}>Suivant · GPX →</button>
      </div>
    </div>
  );
}

function GpxUpload({ onNext, onPrev }){
  const [parsed, setParsed] = _suS({
    filename: "aiguebelette.gpx",
    points: 184,
    distanceKm: 6.706,
    dPlusM: 184,
    startLatLng: "45.5466, 5.7706",
    sha: "a7f9…3c1d",
  });
  const [dragging, setDragging] = _suS(false);

  return (
    <div>
      <h1 className="su-h1">Tracé GPX <span className="muted" style={{fontWeight:500, fontSize:18}}>· course</span></h1>
      <p className="su-section-desc">Importer le fichier GPX de la boucle officielle. La distance et le D+ sont calculés côté serveur (méthode Haversine + seuil de bruit altimétrique 3 m) et stockés en lecture seule.</p>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--d-5)", marginTop:"var(--d-5)"}}>
        <div
          onDragOver={e=>{e.preventDefault(); setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault(); setDragging(false);}}
          style={{
            border: `2px dashed ${dragging ? "var(--accent)" : "var(--line)"}`,
            borderRadius: "var(--radius-3)",
            padding: "var(--d-8)",
            background: dragging ? "color-mix(in oklch, var(--accent) 8%, transparent)" : "var(--bg-elev)",
            textAlign:"center",
            display:"flex", flexDirection:"column", alignItems:"center", gap:"var(--d-3)",
            transition: "all 0.15s",
          }}
        >
          <div style={{fontSize:36, color:"var(--ink-mute)", lineHeight:1}}>↑</div>
          <div style={{fontSize:14, color:"var(--ink-2)"}}>Glisser un <span className="mono">.gpx</span> ici</div>
          <div className="muted" style={{fontSize:12}}>ou</div>
          <button className="btn btn-sm">Parcourir…</button>
          <div className="mute-2 mono" style={{fontSize:11, marginTop:"var(--d-3)"}}>
            Max 2 Mo · une seule track · boucle fermée requise
          </div>
        </div>

        <div className="card" style={{padding:0}}>
          <div className="card-head">
            <div className="card-title">Fichier importé <span className="en">PARSED</span></div>
            <div className="card-meta mono">{parsed.sha}</div>
          </div>
          <div className="card-body">
            <dl style={{margin:0, display:"grid", gridTemplateColumns:"1fr auto", gap:"10px 16px"}}>
              <dt className="muted">Nom du fichier</dt><dd className="mono">{parsed.filename}</dd>
              <dt className="muted">Points</dt><dd className="mono">{parsed.points}</dd>
              <dt className="muted">Distance</dt><dd className="mono">{parsed.distanceKm} km <span className="mute-2">(lecture seule)</span></dd>
              <dt className="muted">D+</dt><dd className="mono">{parsed.dPlusM} m <span className="mute-2">(lecture seule)</span></dd>
              <dt className="muted">Départ / start</dt><dd className="mono">{parsed.startLatLng}</dd>
            </dl>
            <svg viewBox="0 0 100 100" style={{width:"100%", marginTop:"var(--d-4)", aspectRatio:"1/1", maxHeight: 200}}>
              <ellipse cx="50" cy="55" rx="48" ry="40" fill="var(--bg-elev-2)" stroke="var(--line-soft)" strokeWidth="0.4" strokeDasharray="0.6 0.4" />
              <path d={window.COURSE_PATH} fill="none" stroke="var(--accent)" strokeWidth="0.8" />
              <circle cx="50" cy="12" r="2" fill="var(--bg)" stroke="var(--ink)" strokeWidth="0.6" />
            </svg>
          </div>
        </div>
      </div>

      <div className="su-footer">
        <button className="btn" onClick={onPrev}>← Précédent</button>
        <button className="btn btn-primary" onClick={onNext}>Suivant · soleil →</button>
      </div>
    </div>
  );
}

function SunReadout({ onNext, onPrev }) {
  const E = window.EDITION;
  return (
    <div>
      <h1 className="su-h1">Soleil & cut-offs <span className="muted" style={{fontWeight:500, fontSize:18}}>· sun</span></h1>
      <p className="su-section-desc">Sunrise et sunset sont calculés depuis la latitude et la longitude de départ, à la date du jour J — non modifiables (algorithme NOAA, précision ±1 min).</p>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--d-4)", marginTop:"var(--d-5)", maxWidth:720}}>
        <SunStat label="Aube civile" sub="Civil dawn" value={E.civilDawn} note="Visibilité partielle, frontale conseillée" />
        <SunStat label="Lever du soleil" sub="Sunrise" value={E.sunrise} note="Frontale retirable" emphasis />
        <SunStat label="Coucher du soleil" sub="Sunset" value={E.sunset} note="Frontale obligatoire au top suivant" emphasis />
        <SunStat label="Crépuscule civil" sub="Civil dusk" value={E.civilDusk} note="Nuit pleine" />
      </div>

      <div className="card" style={{marginTop:"var(--d-5)", padding: 0}}>
        <div className="card-head">
          <div className="card-title">Calendrier de course <span className="en">SCHEDULE</span></div>
          <div className="card-meta mono">24 boucles · max 26 h</div>
        </div>
        <div className="card-body flush" style={{padding:"var(--d-5)"}}>
          <ScheduleStrip />
        </div>
      </div>

      <div className="su-footer">
        <button className="btn" onClick={onPrev}>← Précédent</button>
        <button className="btn btn-primary" onClick={onNext}>Suivant · plateau →</button>
      </div>
    </div>
  );
}

function SunStat({ label, sub, value, note, emphasis }){
  return (
    <div className="card" style={{padding:"var(--d-4)", border: emphasis ? "1px solid color-mix(in oklch, var(--warn) 35%, var(--line))" : undefined}}>
      <div className="eyebrow">{label} · <span className="mute-2">{sub}</span></div>
      <div style={{fontFamily:"var(--font-display)", fontWeight:600, fontSize:34, letterSpacing:"-0.02em", marginTop:6}}>
        <span className="mono">{value}</span>
      </div>
      <div className="muted" style={{fontSize:12, marginTop:6}}>{note}</div>
    </div>
  );
}

function ScheduleStrip(){
  // 26 horizontal slots, marked with sunrise/sunset
  const tops = Array.from({length: 26}, (_,i) => 10 + i);
  return (
    <div style={{display:"flex", alignItems:"center", gap: 2, overflow:"hidden", paddingBottom: 6}}>
      {tops.map(h => {
        const hh = h % 24;
        const isSunset = hh === 19;
        const isSunrise = hh === 7;
        const isNight = hh >= 20 || hh < 7;
        return (
          <div key={h} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap: 4, minWidth: 0}}>
            <div className="mono" style={{fontSize: 10, color: isSunset || isSunrise ? "var(--warn)" : "var(--ink-3)"}}>
              {String(hh).padStart(2,"0")}
            </div>
            <div style={{
              width: "100%", height: 32,
              background: isNight
                ? "color-mix(in oklch, var(--bg-elev-2) 80%, #000)"
                : "var(--bg-elev-2)",
              border: "1px solid var(--line-soft)",
              borderColor: isSunset || isSunrise ? "var(--warn)" : "var(--line-soft)",
              borderRadius: 3,
              position:"relative",
            }}>
              {(isSunset || isSunrise) && (
                <span style={{
                  position:"absolute", top: -2, left: "50%", width: 1, height: "calc(100% + 4px)",
                  background:"var(--warn)", transform:"translateX(-50%)",
                }}></span>
              )}
            </div>
            <div style={{fontSize: 8, color:"var(--ink-mute)", letterSpacing:"0.05em", textTransform:"uppercase", height: 10, whiteSpace:"nowrap"}}>
              {isSunrise ? "lever" : isSunset ? "coucher" : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Roster({ onNext, onPrev }){
  return (
    <div>
      <h1 className="su-h1">Plateau <span className="muted" style={{fontWeight:500, fontSize:18}}>· roster</span></h1>
      <p className="su-section-desc">CRUD des inscrit·es. Chaque ligne devient un dossard. Liste arrêtée à 18:00 la veille (briefing).</p>

      <div className="row space-between" style={{marginTop:"var(--d-5)"}}>
        <div className="row" style={{gap:"var(--d-3)"}}>
          <input className="input" placeholder="Filtrer…" style={{width: 200}} />
          <button className="btn btn-sm">Importer CSV</button>
        </div>
        <button className="btn btn-sm btn-primary">+ Ajouter un coureur·euse</button>
      </div>

      <div className="card" style={{marginTop:"var(--d-3)", padding: 0}}>
        <table style={{width:"100%", borderCollapse:"collapse", fontSize:13}}>
          <thead>
            <tr style={{textAlign:"left", color:"var(--ink-3)", fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase"}}>
              <th style={{padding:"10px 14px", borderBottom:"1px solid var(--line-soft)"}}>Bib</th>
              <th style={{padding:"10px 14px", borderBottom:"1px solid var(--line-soft)"}}>Nom</th>
              <th style={{padding:"10px 14px", borderBottom:"1px solid var(--line-soft)"}}>Slug</th>
              <th style={{padding:"10px 14px", borderBottom:"1px solid var(--line-soft)"}}>Ville</th>
              <th style={{padding:"10px 14px", borderBottom:"1px solid var(--line-soft)"}}>Cat.</th>
              <th style={{padding:"10px 14px", borderBottom:"1px solid var(--line-soft)"}}>Pace cible</th>
              <th style={{padding:"10px 14px", borderBottom:"1px solid var(--line-soft)"}}></th>
            </tr>
          </thead>
          <tbody>
            {window.RUNNERS.slice(0, 12).map(r => (
              <tr key={r.slug} style={{borderBottom:"1px solid var(--line-soft)"}}>
                <td style={{padding:"10px 14px"}} className="mono">#{String(r.bib).padStart(3,"0")}</td>
                <td style={{padding:"10px 14px"}}>
                  <div className="row" style={{gap:"var(--d-2)"}}>
                    <RunnerAvatar runner={r} size={22} />
                    <span>{r.name}</span>
                  </div>
                </td>
                <td style={{padding:"10px 14px"}} className="mono mute-2">{r.slug}</td>
                <td style={{padding:"10px 14px"}}>{r.town}</td>
                <td style={{padding:"10px 14px"}} className="mono">{r.gender} · {r.age}</td>
                <td style={{padding:"10px 14px"}} className="mono">~{r.avgLoopMin}'</td>
                <td style={{padding:"10px 14px", textAlign:"right"}}>
                  <button className="btn btn-ghost btn-sm">Éditer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{padding:"10px 14px", borderTop:"1px solid var(--line-soft)", textAlign:"center"}}>
          <button className="btn btn-ghost btn-sm">Voir les 13 suivants ↓</button>
        </div>
      </div>

      <div className="su-footer">
        <button className="btn" onClick={onPrev}>← Précédent</button>
        <button className="btn btn-primary" onClick={onNext}>Suivant · relecture →</button>
      </div>
    </div>
  );
}

function Review({ onPrev, setRoute }){
  return (
    <div>
      <h1 className="su-h1">Relecture <span className="muted" style={{fontWeight:500, fontSize:18}}>· review</span></h1>
      <p className="su-section-desc">Tout est prêt. Publier rend la page spectateur visible et active la console de pointage.</p>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"var(--d-4)", marginTop:"var(--d-5)"}}>
        <ReviewCheck ok>Édition créée · slug <span className="mono">lll-2026</span></ReviewCheck>
        <ReviewCheck ok>GPX importé · 184 pts · 6,706 km · D+ 184 m</ReviewCheck>
        <ReviewCheck ok>Sunrise/sunset calculés (Europe/Paris)</ReviewCheck>
        <ReviewCheck ok>25 coureur·euses inscrit·es · liste arrêtée</ReviewCheck>
        <ReviewCheck warn>Liste à figer à <b className="mono">2026-09-18 18:00</b> · briefing</ReviewCheck>
        <ReviewCheck ok>PIN orga défini · 4 chiffres</ReviewCheck>
      </div>

      <div className="su-footer">
        <button className="btn" onClick={onPrev}>← Précédent</button>
        <button className="btn">Sauver brouillon</button>
        <button className="btn btn-primary" onClick={()=>setRoute("home")}>Publier l'édition →</button>
      </div>
    </div>
  );
}

function ReviewCheck({ ok, warn, children }){
  const color = warn ? "var(--warn)" : "var(--accent)";
  return (
    <div style={{
      display:"flex", gap: "var(--d-3)", alignItems:"flex-start",
      padding:"var(--d-4)", border:"1px solid var(--line)", borderRadius:"var(--radius-2)",
      background:"var(--bg-elev)"
    }}>
      <span style={{
        width:18, height:18, borderRadius:"50%",
        background: color, color: "var(--bg)",
        display:"grid", placeItems:"center",
        fontSize: 11, fontWeight: 700, flexShrink:0,
        marginTop: 1,
      }}>{warn ? "!" : "✓"}</span>
      <div style={{fontSize: 13, color:"var(--ink-2)", lineHeight: 1.5}}>{children}</div>
    </div>
  );
}

window.SetupPage = SetupPage;

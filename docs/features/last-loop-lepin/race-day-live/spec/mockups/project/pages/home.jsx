/* HomePage — hors-jour-J, before race day.
   Shows: edition, date, lieu, course (GPX), runners registered, 2025 archive link.
   Switches to a live-status banner when the phase is anything but prerace. */

function HomePage({ phase, setRoute }) {
  const isRaceDay = phase.key !== "prerace";
  return (
    <div className="home" data-screen-label="00 Home">
      <section className="home-hero">
        <div className="home-hero-left">
          <div className="eyebrow">Édition {window.EDITION.edition} · {window.EDITION.year}</div>
          <h1 className="home-h1">
            Last Loop Lépin
            <span className="home-h1-tag">Backyard Ultra · 6,706&nbsp;km/h jusqu'au dernier·ère</span>
          </h1>
          <dl className="home-facts">
            <div><dt>Date</dt><dd>{window.EDITION.date} · départ <span className="mono">{window.EDITION.startTime}</span></dd></div>
            <div><dt>Lieu</dt><dd>{window.EDITION.location}</dd></div>
            <div><dt>Boucle</dt><dd><span className="mono">{window.EDITION.loopDistanceKm} km</span> · D+ <span className="mono">{window.EDITION.loopDPlusM} m</span></dd></div>
            <div><dt>Inscrit·es</dt><dd><span className="mono">{window.EDITION.registered}</span> coureur·euses · liste arrêtée</dd></div>
          </dl>
          <div className="row" style={{marginTop:"var(--d-6)", gap:"var(--d-3)", flexWrap:"wrap"}}>
            {isRaceDay
              ? <button className="btn btn-primary btn-lg" onClick={()=> setRoute("spectator")}>
                  Voir la course en direct →
                </button>
              : <button className="btn btn-primary btn-lg" disabled
                        style={{opacity:0.5, cursor:"default"}}>
                  Direct ouvert le jour J · 10:00
                </button>}
            <button className="btn btn-lg" onClick={()=> setRoute("setup")}>Espace organisation</button>
            <a className="btn btn-ghost btn-lg" href="#archives" onClick={e=>e.preventDefault()}>
              Voir l'édition 2025 ↗
            </a>
          </div>

          {isRaceDay && (
            <div className="home-live-strip">
              <span className="live-pill">Live</span>
              <span>
                Boucle <b className="mono">{phase.loopIdx + 1}</b> en cours ·{" "}
                <b className="mono">{phase.inRace.length}</b> coureur·euses encore en course ·{" "}
                <b className="mono">{phase.dnf.length}</b> DNF
              </span>
              <a onClick={()=>setRoute("spectator")} className="muted" style={{marginLeft:"auto", cursor:"pointer", fontSize:13, textDecoration:"underline"}}>
                Vue spectateur →
              </a>
            </div>
          )}
        </div>

        <div className="home-hero-right">
          <div className="home-course-card">
            <div className="home-course-head">
              <div className="eyebrow">Tracé officiel · GPX</div>
              <div className="mute-2 mono" style={{fontSize:11}}>aiguebelette.gpx · 184 pts</div>
            </div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{width:"100%", aspectRatio:"1/1"}}>
              <ellipse cx="50" cy="55" rx="48" ry="40" fill="color-mix(in oklch, var(--accent) 4%, var(--bg-elev-2))" stroke="var(--line-soft)" strokeWidth="0.4" strokeDasharray="0.6 0.4" />
              <path d={window.COURSE_PATH} fill="none" stroke="var(--line)" strokeWidth="1.6" />
              <path d={window.COURSE_PATH} fill="none" stroke="var(--accent)" strokeWidth="0.55" strokeLinecap="round" strokeDasharray="0.6 1.2" />
              <circle cx="50" cy="12" r="2.2" fill="var(--bg)" stroke="var(--ink)" strokeWidth="0.6" />
              <circle cx="50" cy="12" r="0.8" fill="var(--ink)" />
            </svg>
            <div className="home-course-stats">
              <div><span className="mute-2">DIST</span><b className="mono">6,706 km</b></div>
              <div><span className="mute-2">D+</span><b className="mono">184 m</b></div>
              <div><span className="mute-2">SOL</span><b>Sentier · 70%</b></div>
              <div><span className="mute-2">PARTS</span><b>2 ravitos</b></div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-timeline">
        <div className="home-section-head">
          <div className="eyebrow">Programme · day plan</div>
          <h2>De la première à la dernière boucle</h2>
        </div>
        <div className="home-timeline-grid">
          {[
            { t: "Vendredi 18 · 18:00", title: "Retrait des dossards", desc: "Halle communale, accueil café. Briefing 19:00.", icon: "△" },
            { t: "Samedi 19 · 09:30",  title: "Corral & vérifs", desc: "Tous au corral, vérif matériel obligatoire (frontale, eau).", icon: "◇" },
            { t: "Samedi 19 · 10:00",  title: "Départ boucle 1", desc: "Top horaire — la course commence. Une boucle/h, T+0 = sortie.", icon: "●" },
            { t: "Samedi 19 · 19:36",  title: "Coucher de soleil", desc: "Frontales obligatoires à partir du top suivant.", icon: "☼" },
            { t: "Dimanche 20 · 07:25", title: "Lever de soleil", desc: "Frontales retirables. Café au corral, médical éveillé.", icon: "☼" },
            { t: "Dimanche 20 · 10:00", title: "Limite physique", desc: "24 boucles · 160,9 km. Si encore en jeu, on continue.", icon: "▢" },
          ].map((step,i) => (
            <div key={i} className="home-step">
              <span className="home-step-icon">{step.icon}</span>
              <div>
                <div className="home-step-t mono">{step.t}</div>
                <div className="home-step-title">{step.title}</div>
                <div className="home-step-desc">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-roster">
        <div className="home-section-head">
          <div className="eyebrow">Plateau · roster</div>
          <h2>{window.EDITION.registered} coureur·euses au départ</h2>
        </div>
        <div className="home-runners">
          {window.RUNNERS.map(r => (
            <button key={r.slug} className="home-runner-chip" onClick={()=>setRoute("runner")}>
              <RunnerAvatar runner={r} size={28} />
              <span>{r.name}</span>
              <span className="mono mute-2">#{String(r.bib).padStart(3,"0")}</span>
            </button>
          ))}
        </div>
      </section>

      <footer className="home-foot">
        <div className="row" style={{justifyContent:"space-between", flexWrap:"wrap", gap:"var(--d-4)"}}>
          <div className="mute-2 mono" style={{fontSize:11}}>
            © Last Loop Lépin · association loi 1901 · Savoie
          </div>
          <div className="row" style={{gap:"var(--d-4)"}}>
            <a className="mute-2" style={{fontSize:12}} href="#" onClick={e=>e.preventDefault()}>Règlement</a>
            <a className="mute-2" style={{fontSize:12}} href="#" onClick={e=>e.preventDefault()}>Édition 2025 ↗</a>
            <a className="mute-2" style={{fontSize:12}} href="#" onClick={e=>e.preventDefault()}>Contact orga</a>
          </div>
        </div>
      </footer>

      <style>{`
        .home {
          padding: var(--d-8) var(--d-10);
          overflow: auto;
          height: 100%;
          display: flex; flex-direction: column;
          gap: var(--d-12);
        }
        .home-hero {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: var(--d-10);
          align-items: start;
        }
        @media (max-width: 980px) { .home-hero { grid-template-columns: 1fr; } }
        .home-h1 {
          margin: var(--d-3) 0 var(--d-5);
          font-family: var(--font-display);
          font-size: clamp(36px, 4.8vw, 64px);
          font-weight: 700;
          letter-spacing: -0.025em;
          line-height: 0.98;
          color: var(--ink);
          display: flex; flex-direction: column; gap: var(--d-4);
        }
        .home-h1-tag {
          font-family: var(--font-body);
          font-size: 16px; font-weight: 500;
          letter-spacing: 0; color: var(--ink-2);
          line-height: 1.4;
          max-width: 36ch;
        }
        .home-facts {
          margin: var(--d-4) 0 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--d-3) var(--d-6);
          font-size: 13px;
        }
        .home-facts > div { padding: var(--d-2) 0; border-top: 1px solid var(--line-soft); }
        .home-facts dt { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; }
        .home-facts dd { margin: 4px 0 0; color: var(--ink); font-size: 14px; }

        .home-live-strip {
          display: flex; align-items: center; gap: var(--d-4);
          margin-top: var(--d-6);
          padding: var(--d-3) var(--d-4);
          border: 1px solid var(--line);
          border-radius: var(--radius-2);
          background: var(--bg-elev);
          font-size: 13px; color: var(--ink-2);
        }

        .home-course-card {
          border: 1px solid var(--line);
          border-radius: var(--radius-3);
          background: var(--bg-elev);
          padding: var(--d-4) var(--d-5) var(--d-5);
        }
        .home-course-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: var(--d-3); }
        .home-course-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--d-3);
          padding-top: var(--d-3);
          border-top: 1px solid var(--line-soft);
          font-size: 12px;
        }
        .home-course-stats > div { display: flex; flex-direction: column; gap: 2px; }
        .home-course-stats .mute-2 { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; }
        .home-course-stats b { font-weight: 600; font-size: 13px; color: var(--ink); }

        .home-section-head h2 {
          margin: 4px 0 var(--d-5); font-family: var(--font-display); font-size: 22px; font-weight: 600; letter-spacing: -0.01em;
        }
        .home-timeline-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: var(--d-4);
        }
        .home-step {
          display: grid;
          grid-template-columns: 24px 1fr;
          gap: var(--d-3);
          padding: var(--d-4);
          border: 1px solid var(--line);
          border-radius: var(--radius-2);
          background: var(--bg-elev);
        }
        .home-step-icon {
          font-family: var(--font-mono);
          font-size: 14px; color: var(--accent);
          line-height: 1.2;
        }
        .home-step-t {
          font-size: 11px; color: var(--ink-3); letter-spacing: 0.04em;
          margin-bottom: 4px;
        }
        .home-step-title { font-weight: 600; color: var(--ink); font-size: 14px; }
        .home-step-desc { font-size: 12px; color: var(--ink-3); margin-top: 4px; line-height: 1.4; }

        .home-runners {
          display: flex; flex-wrap: wrap; gap: var(--d-2);
        }
        .home-runner-chip {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 12px 6px 6px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--line);
          background: var(--bg-elev);
          font-size: 13px;
          color: var(--ink);
        }
        .home-runner-chip:hover { background: var(--bg-elev-2); border-color: var(--ink-mute); }
        .home-runner-chip .mono { font-size: 10px; }

        .home-foot { padding-top: var(--d-6); border-top: 1px solid var(--line-soft); margin-top: var(--d-6); }
      `}</style>
    </div>
  );
}

window.HomePage = HomePage;

/* Spectator — 4-up dashboard.
   Layout: countdown (top-left), leaderboard (left), wall (bottom), course map (right) */

function SpectatorPage({ phase, t, setTweak, setRoute }) {
  return (
    <div className="spec-grid" data-screen-label="01 Spectateur">
      <div className="spec-cell spec-leader">
        <LeaderboardPanel phase={phase} onPick={(slug) => setRoute("runner")} />
      </div>
      <div className="spec-cell spec-count">
        <CountdownPanel phase={phase} style={t.countdownStyle} />
      </div>
      <div className="spec-cell spec-map">
        <CourseMapPanel phase={phase} onPick={(slug) => setRoute("runner")} />
      </div>
      <div className="spec-cell spec-wall">
        <EliminatedWallPanel phase={phase} onPick={(slug) => setRoute("runner")} />
      </div>
      <style>{`
        .spec-grid {
          display: grid;
          grid-template-columns: minmax(420px, 1.4fr) minmax(420px, 1fr);
          grid-template-rows: minmax(280px, auto) 1fr;
          grid-template-areas:
            "leader count"
            "leader map"
            "wall   map";
          gap: var(--d-4);
          padding: var(--d-4);
          height: 100%;
          min-height: 0;
        }
        @media (max-width: 1200px) {
          .spec-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto auto auto;
            grid-template-areas: "count" "leader" "map" "wall";
          }
        }
        .spec-count  { grid-area: count; min-height: 280px; }
        .spec-leader { grid-area: leader; min-height: 0; }
        .spec-map    { grid-area: map; min-height: 0; }
        .spec-wall   { grid-area: wall; min-height: 220px; }
        .spec-cell { display: flex; min-height: 0; }
        .spec-cell > * { width: 100%; min-height: 0; }
      `}</style>
    </div>
  );
}

window.SpectatorPage = SpectatorPage;

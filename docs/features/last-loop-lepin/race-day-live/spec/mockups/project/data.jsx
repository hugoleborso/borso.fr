/* ============================================================
   data.jsx — runners, phases, GPX, sun
   Backyard Ultra "Last Loop Lépin" — 6.706 km loop, 1 / hour
   ============================================================ */

// 25 runners; deterministic color from name (HSL hash) + initials.
function colorForName(name){
  let h = 0;
  for (let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}
function initials(name){
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
}

const RUNNER_SEED = [
  ["jean-dupont",       "Jean Dupont",        "Chambéry",            44, "M", 38],
  ["lea-fournier",      "Léa Fournier",       "Grenoble",            46, "F", 32],
  ["mathieu-roux",      "Mathieu Roux",       "Annecy",              42, "M", 41],
  ["chloe-bertrand",    "Chloé Bertrand",     "Lyon",                47, "F", 29],
  ["antoine-marchand",  "Antoine Marchand",   "Aix-les-Bains",       45, "M", 35],
  ["sarah-leblanc",     "Sarah Leblanc",      "Genève",              48, "F", 31],
  ["paul-girard",       "Paul Girard",        "Chambéry",            43, "M", 47],
  ["camille-noel",      "Camille Noël",       "Albertville",         49, "F", 28],
  ["lucas-petit",       "Lucas Petit",        "Lépin-le-Lac",        46, "M", 34],
  ["manon-arnaud",      "Manon Arnaud",       "Voiron",              50, "F", 30],
  ["nicolas-blanc",     "Nicolas Blanc",      "Grenoble",            47, "M", 52],
  ["emma-rolland",      "Emma Rolland",       "Lyon",                51, "F", 27],
  ["thomas-faure",      "Thomas Faure",       "Annecy",              45, "M", 39],
  ["julie-perrin",      "Julie Perrin",       "Chambéry",            53, "F", 33],
  ["hugo-mercier",      "Hugo Mercier",       "Bourg-en-Bresse",     48, "M", 42],
  ["alice-renaud",      "Alice Renaud",       "Genève",              52, "F", 26],
  ["pierre-lopez",      "Pierre Lopez",       "Valence",             46, "M", 44],
  ["clara-vidal",       "Clara Vidal",        "Lyon",                54, "F", 31],
  ["yann-moreau",       "Yann Moreau",        "Annecy",              49, "M", 36],
  ["ines-garnier",      "Inès Garnier",       "Chambéry",            55, "F", 29],
  ["benoit-roy",        "Benoît Roy",         "Saint-Étienne",       50, "M", 45],
  ["zoe-leroy",         "Zoé Leroy",          "Aix-les-Bains",       57, "F", 34],
  ["maxime-bourgeois",  "Maxime Bourgeois",   "Grenoble",            48, "M", 38],
  ["nina-charpentier",  "Nina Charpentier",   "Lyon",                56, "F", 30],
  ["raphael-meyer",     "Raphaël Meyer",      "Lépin-le-Lac",        51, "M", 41],
];

const RUNNERS = RUNNER_SEED.map(([slug, name, town, avgLoopMin, gender, age], i) => ({
  bib: 1 + i,
  slug,
  name,
  town,
  avgLoopMin,        // typical loop time during normal hour
  gender,
  age,
  hue: colorForName(name),
  initials: initials(name),
}));

// Race phases — UI scrubber jumps between these snapshots.
// completedLoops = how many loops each runner has finished; -1 = DNF on that loop attempt; -2 = manual DNF.
// We store result of race-state at a specific point in time.
const PHASES = [
  {
    key: "prerace",
    label: "Pré-course",
    en: "PRE-RACE",
    desc: "30 min avant le départ",
    descEn: "30 min before start",
    nowLabel: "09:30",
    nowMin: 9*60 + 30,       // minutes from midnight Saturday
    loopIdx: 0,               // next loop to start
    progressInLoop: 0,        // 0..1 within current hour
    statuses: null,            // null = everyone "ready"
  },
  {
    key: "daylight",
    label: "Mi-journée",
    en: "MIDDAY",
    desc: "Boucle 4 · 18 coureurs encore en course",
    descEn: "Loop 4 · 18 still in",
    nowLabel: "13:34",
    nowMin: 13*60 + 34,
    loopIdx: 4,
    progressInLoop: 0.57,
  },
  {
    key: "sunset",
    label: "Coucher de soleil",
    en: "SUNSET",
    desc: "Boucle 10 · 9 coureurs · le crépuscule pèse",
    descEn: "Loop 10 · 9 in · twilight",
    nowLabel: "19:18",
    nowMin: 19*60 + 18,
    loopIdx: 10,
    progressInLoop: 0.30,
  },
  {
    key: "night",
    label: "Nuit profonde",
    en: "DEEP NIGHT",
    desc: "Boucle 16 · 5 coureurs · frontales obligatoires",
    descEn: "Loop 16 · 5 in · headlamps",
    nowLabel: "01:42",
    nowMin: (24+1)*60 + 42,
    loopIdx: 16,
    progressInLoop: 0.70,
  },
  {
    key: "duo",
    label: "Duel final",
    en: "FINAL TWO",
    desc: "Boucle 23 · 2 coureurs · l'un d'eux abandonnera",
    descEn: "Loop 23 · 2 in · one will quit",
    nowLabel: "08:51",
    nowMin: (24+8)*60 + 51,
    loopIdx: 23,
    progressInLoop: 0.85,
  },
  {
    key: "finished",
    label: "Course terminée",
    en: "FINISHED",
    desc: "24 boucles · 160,9 km · vainqueur·euse Léa Fournier",
    descEn: "24 loops · 160.9 km · winner Léa Fournier",
    nowLabel: "10:04",
    nowMin: (24+10)*60 + 4,
    loopIdx: 25,
    progressInLoop: 0,
  },
];

// Compute per-runner loops completed + status + finish offsets at each phase.
// Deterministic — based on each runner's avgLoopMin and a stamina threshold.
function buildPhaseState(){
  // Pre-decided drop-out loop per runner (-1 = finishes whole race, won)
  // Engineered so attrition curve matches the phase descriptions above.
  const dropouts = {
    "jean-dupont":      14,
    "mathieu-roux":     12,
    "chloe-bertrand":   23,    // finalist who quits in duo phase ("last loop")
    "antoine-marchand": 8,
    "sarah-leblanc":    16,
    "paul-girard":      6,
    "camille-noel":     19,
    "lucas-petit":      11,
    "manon-arnaud":     10,
    "nicolas-blanc":    3,
    "emma-rolland":     17,
    "thomas-faure":     9,
    "julie-perrin":     7,
    "hugo-mercier":     5,
    "alice-renaud":     15,
    "pierre-lopez":     2,
    "clara-vidal":      13,
    "yann-moreau":      4,
    "ines-garnier":     12,
    "benoit-roy":       1,
    "zoe-leroy":        20,
    "maxime-bourgeois": 9,
    "nina-charpentier": 18,
    "raphael-meyer":    11,
    // lea-fournier — wins (no entry)
  };
  // DNF reason categories per runner (cycled)
  const reasonPool = [
    "Cut-off · n'a pas pointé",
    "Abandon volontaire",
    "Blessure · cheville",
    "Hypothermie · médical",
    "Estomac · vomissements",
    "Sommeil · ne se relève pas",
  ];

  return PHASES.map((phase, pi) => {
    const runners = RUNNERS.map((r, ri) => {
      const out = dropouts[r.slug];
      // For each phase, did this runner already drop?
      // If they drop ON loop K, they are still running at the start of loop K,
      // but DNF appears at top of loop K+1 (didn't make cut-off) OR they manual-DNF mid loop K.
      const isFinished = phase.key === "finished";
      let status, completedLoops, lastLoopRank, dropReason, dropAt;
      if (out !== undefined && phase.loopIdx > out) {
        status = "DNF";
        completedLoops = out;
        dropReason = reasonPool[ri % reasonPool.length];
        dropAt = out;
      } else if (isFinished) {
        if (out === undefined) {
          status = "WINNER";
          completedLoops = 24;
        } else if (out === 23) {
          status = "DNF";
          completedLoops = 23;
          dropReason = "Final · n'a pas confirmé la 24e";
          dropAt = 23;
        } else {
          status = "DNF";
          completedLoops = out;
          dropReason = reasonPool[ri % reasonPool.length];
          dropAt = out;
        }
      } else {
        status = "IN";
        completedLoops = phase.loopIdx; // they're currently running loop (phase.loopIdx + 1)? No, loopIdx = currently-in-progress loop number, and completedLoops = loopIdx (already finished that many)
      }
      // current-loop progress = phase.progressInLoop scaled by runner's pace fraction
      // faster runners are further along
      const pace = r.avgLoopMin / 60; // fraction of hour
      const inLoop = phase.progressInLoop / pace; // bigger = closer to / past 1
      const progress = Math.min(1, inLoop);
      const finishedThisLoop = inLoop >= 1;
      // arrival rank for this loop (ordering by finish time when finishedThisLoop)
      // We'll compute below per phase.
      return {
        ...r,
        phaseKey: phase.key,
        status,
        completedLoops,
        progress,            // 0..1 along the loop right now
        finishedThisLoop,
        loopFinishMin: phase.progressInLoop > 0 ? Math.round(r.avgLoopMin) : null,
        dropReason,
        dropAt,
      };
    });
    // Assign current rank by completedLoops desc, then by progress desc
    const inRace = runners.filter(r=>r.status==="IN");
    inRace.sort((a,b)=> b.completedLoops - a.completedLoops || b.progress - a.progress);
    inRace.forEach((r,i)=> r.rank = i+1);
    const dnf = runners.filter(r=>r.status==="DNF");
    dnf.sort((a,b)=> b.completedLoops - a.completedLoops);
    const winners = runners.filter(r=>r.status==="WINNER");

    return {
      ...phase,
      runners,
      inRace,
      dnf,
      winners,
    };
  });
}

const PHASE_STATES = buildPhaseState();

// Edition meta
const EDITION = {
  name: "Last Loop Lépin",
  year: 2026,
  edition: "II",
  location: "Lépin-le-Lac, Savoie · Lac d'Aiguebelette",
  locationEn: "Savoie, French Alps",
  date: "Sam. 19 septembre 2026",
  dateEn: "Sat 19 Sep 2026",
  startTime: "10:00",
  loopDistanceKm: 6.706,
  loopDPlusM: 184,
  lat: 45.5466,
  lng: 5.7706,
  // late-September sunrise/sunset, civil dawn/dusk
  sunrise: "07:25",
  sunset:  "19:36",
  civilDawn: "06:54",
  civilDusk: "20:07",
  pin: "4242",
  registered: 25,
  bestLoopRecord: { loopMin: 38.4, runner: "Mathieu Roux", year: 2025 },
};

// A fake closed-loop GPX path (SVG path commands, normalized 0..100)
// vaguely loops around a lake-peninsula shape
const COURSE_PATH = "M 50 12 C 70 14, 86 24, 88 42 C 90 60, 80 70, 70 74 C 60 78, 56 82, 60 90 C 64 96, 52 96, 44 92 C 34 87, 22 82, 14 70 C 6 58, 8 42, 18 30 C 28 18, 38 11, 50 12 Z";

// Punch log (for admin/correction views) — auto-derive a believable feed
const PUNCH_LOG = [
  { ts: "13:33:12", runner: "Mathieu Roux", loop: 4, by: "orga-1" },
  { ts: "13:34:01", runner: "Léa Fournier",  loop: 4, by: "orga-1" },
  { ts: "13:34:18", runner: "Jean Dupont",   loop: 4, by: "orga-2" },
  { ts: "13:34:33", runner: "Chloé Bertrand",loop: 4, by: "orga-1" },
  { ts: "13:34:55", runner: "Antoine Marchand", loop: 4, by: "orga-1" },
  { ts: "13:35:12", runner: "Lucas Petit",   loop: 4, by: "orga-2" },
  { ts: "13:35:29", runner: "Hugo Mercier",  loop: 4, by: "orga-1" },
  { ts: "13:35:41", runner: "Sarah Leblanc", loop: 4, by: "orga-1" },
  { ts: "13:35:58", runner: "Thomas Faure",  loop: 4, by: "orga-2" },
  { ts: "13:36:14", runner: "Camille Noël",  loop: 4, by: "orga-1" },
  { ts: "13:36:48", runner: "Paul Girard",   loop: 4, by: "orga-1", corrected: true },
  { ts: "13:37:05", runner: "Pierre Lopez",  loop: 4, by: "orga-2" },
  { ts: "13:37:31", runner: "Emma Rolland",  loop: 4, by: "orga-1" },
  { ts: "13:38:00", runner: "Alice Renaud",  loop: 4, by: "orga-1" },
];

window.RUNNERS = RUNNERS;
window.EDITION = EDITION;
window.PHASE_STATES = PHASE_STATES;
window.PHASES = PHASES;
window.COURSE_PATH = COURSE_PATH;
window.PUNCH_LOG = PUNCH_LOG;

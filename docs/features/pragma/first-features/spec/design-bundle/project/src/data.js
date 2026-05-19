// Pragma fixtures — based on the band's real setlist drafts
window.PragmaData = (() => {
  const MEMBERS = [
    { id: 'hugo',  name: 'Hugo',  colorVar: '--m-hugo'  },
    { id: 'gui',   name: 'Gui',   colorVar: '--m-gui'   },
    { id: 'arn',   name: 'Arn',   colorVar: '--m-arn'   },
    { id: 'cosyn', name: 'Cosyn', colorVar: '--m-cosyn' },
    { id: 'emma',  name: 'Emma',  colorVar: '--m-emma'  },
  ];
  const INSTRUMENTS = [
    { id: 'voix',     name: 'Voix lead',       harmonic: false },
    { id: 'choeurs',  name: 'Chœurs',          harmonic: false },
    { id: 'guitare',  name: 'Guitare',         harmonic: true  },
    { id: 'basse',    name: 'Basse',           harmonic: true  },
    { id: 'clavier',  name: 'Clavier',         harmonic: true  },
    { id: 'batterie', name: 'Batterie',        harmonic: false },
    { id: 'percu',    name: 'Percussions',     harmonic: false },
  ];

  // 17 songs from the user's setlist + a few new ideas
  const SONGS = [
    { id: 's01', title: 'Happy',                        artist: 'Pharrell Williams',  status: 'concert_ready', tonalityStart: 'F',  tonalityEnd: 'F',  energy: 8, chartKind: 'chordpro' },
    { id: 's02', title: 'This Is the Life',             artist: 'Amy MacDonald',      status: 'concert_ready', tonalityStart: 'G',  tonalityEnd: 'G',  energy: 7, chartKind: 'chordpro' },
    { id: 's03', title: 'Never Gonna Give You Up',      artist: 'Rick Astley',        status: 'rehearsed',     tonalityStart: 'A♭', tonalityEnd: 'A♭', energy: 7, chartKind: 'chordpro' },
    { id: 's04', title: "I'm So Excited",               artist: 'The Pointer Sisters',status: 'wip',           tonalityStart: 'B♭', tonalityEnd: 'B♭', energy: 9, chartKind: 'pdf' },
    { id: 's05', title: 'Take On Me',                   artist: 'a-ha',               status: 'rehearsed',     tonalityStart: 'A',  tonalityEnd: 'A',  energy: 8, chartKind: 'chordpro' },
    { id: 's06', title: 'Lose Control',                 artist: 'Teddy Swims',        status: 'wip',           tonalityStart: 'Bm', tonalityEnd: 'Bm', energy: 6, chartKind: 'chordpro' },
    { id: 's07', title: 'Footloose',                    artist: 'Kenny Loggins',      status: 'concert_ready', tonalityStart: 'C',  tonalityEnd: 'C',  energy: 9, chartKind: 'chordpro' },
    { id: 's08', title: 'Maniac',                       artist: 'Michael Sembello',   status: 'wip',           tonalityStart: 'Fm', tonalityEnd: 'Fm', energy: 8, chartKind: 'chordpro' },
    { id: 's09', title: 'Assassymphonie',               artist: 'Mozart, l’opéra rock',status:'idea',          tonalityStart: 'Em', tonalityEnd: 'Em', energy: 9, chartKind: null },
    { id: 's10', title: 'Proud Mary',                   artist: 'Tina Turner',        status: 'rehearsed',     tonalityStart: 'D',  tonalityEnd: 'A',  energy: 7, chartKind: 'chordpro' },
    { id: 's11', title: 'Valerie',                      artist: 'Amy Winehouse',      status: 'concert_ready', tonalityStart: 'B♭', tonalityEnd: 'B♭', energy: 6, chartKind: 'chordpro' },
    { id: 's12', title: 'Just the Two of Us',           artist: 'Bill Withers',       status: 'rehearsed',     tonalityStart: 'D♭', tonalityEnd: 'D♭', energy: 4, chartKind: 'chordpro' },
    { id: 's13', title: 'Killing Me Softly / Mourir sur scène', artist: 'Medley',     status: 'wip',           tonalityStart: 'Am', tonalityEnd: 'Cm', energy: 5, chartKind: 'image' },
    { id: 's14', title: "If I Ain't Got You",           artist: 'Alicia Keys',        status: 'rehearsed',     tonalityStart: 'G',  tonalityEnd: 'G',  energy: 4, chartKind: 'chordpro' },
    { id: 's15', title: 'Avignon Nice',                 artist: 'Maëlle',             status: 'idea',          tonalityStart: 'C',  tonalityEnd: 'C',  energy: 5, chartKind: null },
    { id: 's16', title: 'En apesanteur',                artist: 'Calogero',           status: 'rehearsed',     tonalityStart: 'D',  tonalityEnd: 'D',  energy: 6, chartKind: 'chordpro' },
    { id: 's17', title: 'Gimme Gimme Gimme',            artist: 'ABBA',               status: 'concert_ready', tonalityStart: 'Dm', tonalityEnd: 'Dm', energy: 9, chartKind: 'chordpro' },
    { id: 's18', title: 'Agitations tropicales',        artist: 'Bertrand Burgalat',  status: 'idea',          tonalityStart: 'F',  tonalityEnd: 'F',  energy: 7, chartKind: null },
    { id: 's19', title: 'Sultans of Swing',             artist: 'Dire Straits',       status: 'rehearsed',     tonalityStart: 'Dm', tonalityEnd: 'F',  energy: 7, chartKind: 'pdf' },
    { id: 's20', title: 'Nobody Knows You When You\'re Down and Out', artist: 'Eric Clapton', status: 'wip', tonalityStart: 'C', tonalityEnd: 'C', energy: 3, chartKind: 'chordpro' },
    { id: 's21', title: 'I Will Survive',               artist: 'Gloria Gaynor',      status: 'concert_ready', tonalityStart: 'Am', tonalityEnd: 'Am', energy: 9, chartKind: 'chordpro' },
    { id: 's22', title: 'I Kissed a Girl',              artist: 'Katy Perry',         status: 'rehearsed',     tonalityStart: 'F',  tonalityEnd: 'F',  energy: 8, chartKind: 'chordpro' },
    { id: 's23', title: 'Begin',                        artist: 'Ben l’oncle Soul',   status: 'wip',           tonalityStart: 'B♭', tonalityEnd: 'B♭', energy: 5, chartKind: 'chordpro' },
    { id: 's24', title: 'Paroles, paroles',             artist: 'Dalida / Alain Delon',status:'idea',          tonalityStart: 'Cm', tonalityEnd: 'Cm', energy: 4, chartKind: null },
    { id: 's25', title: 'Manhattan Kaboul',             artist: 'Renaud / Axelle Red',status: 'rehearsed',     tonalityStart: 'Em', tonalityEnd: 'Em', energy: 5, chartKind: 'chordpro' },
  ];

  // default lineups — who plays what
  const defaultLineup = {
    s01: { hugo:'voix', arn:'choeurs', gui:'basse', cosyn:'batterie', emma:'guitare' },
    s05: { hugo:'guitare', arn:'voix', gui:'basse', cosyn:'batterie', emma:'choeurs' },
    s07: { hugo:'voix', arn:'clavier', gui:'basse', cosyn:'batterie', emma:'guitare' },
    s11: { hugo:'guitare', arn:'voix', gui:'basse', cosyn:'batterie', emma:'choeurs' },
    s12: { hugo:'guitare', arn:'voix', gui:'basse', cosyn:'percu', emma:'choeurs' },
    s17: { hugo:'guitare', arn:'voix', gui:'basse', cosyn:'batterie', emma:'choeurs' },
    s21: { hugo:'guitare', arn:'voix', gui:'basse', cosyn:'batterie', emma:'choeurs' },
  };
  for (const s of SONGS) {
    if (!defaultLineup[s.id]) {
      defaultLineup[s.id] = { hugo:'voix', arn:'choeurs', gui:'basse', cosyn:'batterie', emma:'guitare' };
    }
  }

  // Concert in september — current planned setlist
  const SETLIST_SEP25 = [
    { song: 's07', energy: 9 },
    { song: 's01', energy: 8 },
    { song: 's17', energy: 9 },
    { song: 's10', energy: 7 },
    { song: 's11', energy: 6 },
    { song: 's16', energy: 5 },
    { song: 's12', energy: 4 },
    { song: 's14', energy: 4 },
    { song: 's25', energy: 5 },
    { song: 's05', energy: 8 },
    { song: 's21', energy: 9 },
    { song: 's22', energy: 8 },
  ];

  // known-bad transitions (for warning gutter)
  const BAD_TRANSITIONS = {
    's12>s14': { reason: 'Deux ballades enchaînées — perte d’énergie', severity: 'soft' },
    's14>s25': { reason: 'Changement de tonalité brusque (G → Em)', severity: 'hard' },
    's10>s11': { reason: 'Bascule de basse Hugo → Arn sans transition', severity: 'soft' },
  };

  const TRANSITION_COMMENTS = {
    's10>s11': 'OK — Hugo passe sa guitare à Emma pendant l’intro de Arn.',
  };

  const SESSIONS = [
    { id: 'c01', kind: 'concert', date: '2025-09-13', venue: 'Les Disquaires', capacity: 80, gear: 'Sono maison, retours x4', friends: { hugo: 12, gui: 4, arn: 8, cosyn: 2, emma: 6 }, status: 'upcoming' },
    { id: 'c02', kind: 'concert', date: '2025-09-27', venue: 'L’Alimentation Générale', capacity: 120, gear: 'Apporter ampli basse', friends: {}, status: 'upcoming' },
    { id: 'p03', kind: 'practice', date: '2025-09-08', preparedConcertId: 'c01' },
    { id: 'p04', kind: 'practice', date: '2025-09-15', preparedConcertId: 'c02' },
    { id: 'p05', kind: 'practice', date: '2025-09-22', preparedConcertId: 'c02' },
    { id: 'c00', kind: 'concert', date: '2025-06-21', venue: 'Fête de la musique — Bastille', capacity: 200, gear: '—', friends: { hugo: 25, gui: 12, arn: 14, cosyn: 8, emma: 18 }, status: 'past' },
  ];

  const BARS = [
    { id: 'b01', name: 'Les Disquaires',          status: 'booked',    last: '2025-08-22', notes: 'Confirmé pour le 13/09 — Gui rappelle pour la balance.', contact: 'Gui' },
    { id: 'b02', name: 'L’Alimentation Générale', status: 'booked',    last: '2025-08-30', notes: 'Confirmé 27/09. Demandent une affiche au format A3 deux semaines avant.', contact: 'Gui' },
    { id: 'b03', name: 'Le Truskel',              status: 'contacted', last: '2025-08-15', notes: 'Mail envoyé à Marie pour novembre. Relance prévue.', contact: 'Hugo' },
    { id: 'b04', name: 'La Mécanique Ondulatoire',status: 'contacted', last: '2025-08-02', notes: 'Réponse positive, attend les dates.', contact: 'Hugo' },
    { id: 'b05', name: 'Le Pop In',               status: 'lead',      last: '2025-07-04', notes: 'Vu en concert — demander la programmation à Thomas.', contact: 'Emma' },
    { id: 'b06', name: 'L’International',         status: 'lead',      last: null,         notes: 'Suggéré par Arn. Très bonne sono.', contact: 'Arn' },
    { id: 'b07', name: 'Le Motel',                status: 'played',    last: '2025-03-14', notes: 'Soirée hyper bien passée — recontacter pour décembre.', contact: 'Hugo' },
    { id: 'b08', name: 'Supersonic',              status: 'played',    last: '2025-05-09', notes: 'Bonne capa, mais loge minuscule.', contact: 'Cosyn' },
    { id: 'b09', name: 'Le Bus Palladium',        status: 'cold',      last: '2025-01-22', notes: 'Pas de réponse, trop premium pour notre niveau actuel.', contact: 'Hugo' },
    { id: 'b10', name: 'Le Réservoir',            status: 'cold',      last: '2024-11-30', notes: 'Refus pour dimensions du backline.', contact: 'Hugo' },
  ];

  // Mastery matrix — score 1..10 per (member, instrument).
  // Tout le monde sait jouer de tout, mais avec des niveaux différents.
  const MASTERY = {
    hugo:  { voix: 9, choeurs: 7, guitare: 9, basse: 6, clavier: 4, batterie: 3, percu: 5 },
    gui:   { voix: 5, choeurs: 6, guitare: 6, basse: 9, clavier: 3, batterie: 5, percu: 6 },
    arn:   { voix: 9, choeurs: 8, guitare: 5, basse: 5, clavier: 9, batterie: 3, percu: 5 },
    cosyn: { voix: 4, choeurs: 6, guitare: 4, basse: 5, clavier: 3, batterie: 9, percu: 8 },
    emma:  { voix: 6, choeurs: 8, guitare: 8, basse: 5, clavier: 4, batterie: 4, percu: 6 },
  };

  // Mean mastery for a song = average of mastery[member][instrument] across its lineup.
  const meanMasteryForSong = (songId, lineup = defaultLineup[songId]) => {
    if (!lineup) return null;
    const scores = Object.entries(lineup)
      .map(([mid, iid]) => MASTERY[mid]?.[iid])
      .filter(v => typeof v === 'number');
    if (!scores.length) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  return { MEMBERS, INSTRUMENTS, SONGS, defaultLineup, SETLIST_SEP25, BAD_TRANSITIONS, TRANSITION_COMMENTS, SESSIONS, BARS, MASTERY, meanMasteryForSong };
})();

// ═══════════════════════════════════════════════════════════════════
// Les 12 travaux de Borso — source unique de vérité
// ═══════════════════════════════════════════════════════════════════
// Ce fichier est éditable à la main puis poussé en PR.
//
// Pour ajouter une preuve :
//   { type: "photo", v: "ma-photo.jpg" }
//   { type: "video", v: "ma-video.mp4" }
//   { type: "link",  v: "https://...", label: "Strava" }   // label optionnel
//   { type: "note",  v: "Texte court" }
//   { type: "stat",  v: "19'47" }                          // texte libre
//
// Statuts d'un défi :
//   "done"      — réussi (compte 1)
//   "partial"   — partiellement réussi (compte 0.5)
//   "failed"    — échoué
//   "abandoned" — abandonné en cours de route
//   "doing"     — en cours (mois actuel)
//   "todo"      — à venir (mois futur)
//
// Types de défi :
//   "daily"   — quotidien pendant le mois
//   "count"   — objectif chiffré (livres, km, pages…)
//   "oneshot" — ponctuel (une seule action)
//
// Pour ajouter une année, ajoute une clé sous `years:` ; les 12 mois
// suivent toujours la même forme. `today` peut rester figé ou être
// dérivé à l'exécution si tu préfères.
// ═══════════════════════════════════════════════════════════════════

window.BORSO_DATA = {
  // current calendar date: May 11, 2026
  today: { year: 2026, month: 5, day: 11 },

  years: {
    2025: {
      title: "12 extraordinaires",
      subtitle: "Résolution 2025 — une première édition. Une douzaine d'objectifs hétéroclites pour donner du relief à l'année.",
      months: [
        { m: 1, name: "Janvier", challenges: [
          { t: "Sport tous les jours", kind: "daily", status: "done", note: "31 jours, 31 séances. Compté la marche rapide deux fois.", proofs: [{type:"stat", v:"31/31 jours"}, {type:"link", v:"strava.com/borso/jan25", label:"Strava"}] },
          { t: "Smasher correctement au volley", kind: "oneshot", status: "done", note: "Validé en tournoi du 26.", proofs: [{type:"video", v:"smash-tournoi.mp4"}] }
        ]},
        { m: 2, name: "Février", challenges: [
          { t: "2h de téléphone / jour en moyenne", kind: "daily", status: "partial", note: "2h12 de moyenne. Vu en fin de mois que je m'étais menti sur Instagram.", proofs: [{type:"stat", v:"2h12 moy."}] },
          { t: "14 livres dans le mois", kind: "count", status: "done", note: "14 pile. Trois étaient courts.", proofs: [{type:"stat", v:"14 livres"}, {type:"note", v:"Liste sur Babelio"}] }
        ]},
        { m: 3, name: "Mars", challenges: [
          { t: "Passer la Flèche d'Or", kind: "oneshot", status: "done", note: "200 km vélo en moins de 8h. Validé à 7h41.", proofs: [{type:"link", v:"strava.com/fleche-dor", label:"Strava"}, {type:"photo", v:"medaille.jpg"}] }
        ]},
        { m: 4, name: "Avril", challenges: [
          { t: "5 km sub-20", kind: "oneshot", status: "done", note: "19'47 le 18 avril.", proofs: [{type:"stat", v:"19'47"}, {type:"link", v:"strava.com/5k-sub20", label:"Strava"}] }
        ]},
        { m: 5, name: "Mai", challenges: [
          { t: "Le GR75", kind: "oneshot", status: "done", note: "Le tour de Paris à pied, 7 jours.", proofs: [{type:"photo", v:"gr75-arrivee.jpg"}, {type:"note", v:"Carnet de route 23 pages"}] }
        ]},
        { m: 6, name: "Juin", challenges: [
          { t: "Finir la Montecristo", kind: "oneshot", status: "done", note: "Premier 100 km à pied. Lourd mais fini.", proofs: [{type:"link", v:"montecristo.run", label:"Résultats"}, {type:"photo", v:"finish.jpg"}] }
        ]},
        { m: 7, name: "Juillet", challenges: [
          { t: "Apprendre 1 ouverture / jour", kind: "daily", status: "partial", note: "27 ouvertures sur 31. Quatre jours sautés en vacances.", proofs: [{type:"note", v:"Cahier d'ouvertures"}] },
          { t: "Monter à 1500 en rapid", kind: "oneshot", status: "failed", note: "1462 atteint, pas 1500.", proofs: [{type:"link", v:"chess.com/borso", label:"Profil"}] }
        ]},
        { m: 8, name: "Août", challenges: [
          { t: "200 km à vélo d'un coup", kind: "oneshot", status: "done", note: "Paris–Trouville. 9h12 avec les arrêts.", proofs: [{type:"link", v:"strava.com/paris-trouville", label:"Strava"}, {type:"photo", v:"arrivee-mer.jpg"}] },
          { t: "Traversée Méditerranée en bateau", kind: "oneshot", status: "abandoned", note: "Pas trouvé de bateau. Reporté.", proofs: [] }
        ]},
        { m: 9, name: "Septembre", challenges: [
          { t: "Triathlon L et battre mon record", kind: "oneshot", status: "done", note: "5h28. Record cassé de 9 minutes.", proofs: [{type:"stat", v:"5h28"}, {type:"link", v:"triathlon-results.fr", label:"Classement"}] },
          { t: "Apprendre départements (n° + loc.)", kind: "daily", status: "done", note: "100 % sur le quiz final.", proofs: [{type:"note", v:"Quiz validé"}] },
          { t: "Sport tous les jours", kind: "daily", status: "done", note: "30/30.", proofs: [{type:"stat", v:"30/30"}] }
        ]},
        { m: 10, name: "Octobre", challenges: [
          { t: "20 m en apnée", kind: "oneshot", status: "done", note: "21 m en piscine de 25.", proofs: [{type:"video", v:"apnee-21m.mp4"}, {type:"note", v:"Coach validé"}] }
        ]},
        { m: 11, name: "Novembre", challenges: [
          { t: "100x les marches de Montmartre dans la journée", kind: "oneshot", status: "done", note: "12h47 d'effort. 222 marches × 100. Genoux finis.", proofs: [{type:"stat", v:"22 200 marches"}, {type:"link", v:"strava.com/montmartre-100", label:"Strava"}, {type:"photo", v:"sommet.jpg"}] }
        ]},
        { m: 12, name: "Décembre", challenges: [
          { t: "Italie sans utiliser l'anglais", kind: "oneshot", status: "partial", note: "Une seule phrase d'anglais à la gare de Milan. Sinon italien tout du long.", proofs: [{type:"photo", v:"trattoria.jpg"}, {type:"note", v:"Journal de voyage"}] },
          { t: "Faire un muscle-up", kind: "oneshot", status: "failed", note: "Pas réussi. À reprendre en 2026.", proofs: [{type:"video", v:"tentative-31.mp4"}] }
        ]}
      ]
    },

    2026: {
      title: "Deuxième édition",
      subtitle: "Plus structuré. Moins de défis hors-sol, plus de promesses tenables. On verra.",
      months: [
        { m: 1, name: "Janvier", challenges: [
          { t: "Mois de la positivité — partager du positif chaque jour avec les colocs", kind: "daily", status: "done", note: "31/31. Tableau dans la cuisine.", proofs: [{type:"photo", v:"tableau-positif.jpg"}, {type:"stat", v:"31/31"}] },
          { t: "Sport tous les jours", kind: "daily", status: "done", note: "31/31. Plus dur qu'en 2025 à cause du genou.", proofs: [{type:"stat", v:"31/31"}, {type:"link", v:"strava.com/jan26", label:"Strava"}] }
        ]},
        { m: 2, name: "Février", challenges: [
          { t: "Au lit à 23h, extinction 23h30 (6j/7)", kind: "daily", status: "done", note: "24 j sur 28. Marge respectée.", proofs: [{type:"stat", v:"24/28"}] },
          { t: "Trouver et organiser 2 dates pour Pragma", kind: "oneshot", status: "failed", note: "Aucune date confirmée à temps.", proofs: [{type:"note", v:"Notes de relance"}] },
          { t: "10×1h de sport dans la même journée", kind: "oneshot", status: "done", note: "Le 22. Course, vélo, nage, escalade, yoga, muscu, foot, marche, danse, étirements.", proofs: [{type:"link", v:"strava.com/10x1h", label:"Strava"}, {type:"video", v:"montage-journee.mp4"}, {type:"photo", v:"fin-de-journee.jpg"}] }
        ]},
        { m: 3, name: "Mars", challenges: [
          { t: "Être admissible au CAPES de maths", kind: "oneshot", status: "done", note: "Admissible. Reste l'oral.", proofs: [{type:"link", v:"capes-resultats.fr", label:"Résultats"}, {type:"photo", v:"convocation.jpg"}] },
          { t: "Battre le métro entre 2 stations", kind: "oneshot", status: "done", note: "Concorde → Tuileries. 1'42 à pied vs 2'10 en métro.", proofs: [{type:"video", v:"course-metro.mp4"}, {type:"stat", v:"-28s"}] },
          { t: "3h de HT par semaine", kind: "daily", status: "partial", note: "Moyenne 2h20. Pas tenu.", proofs: [{type:"stat", v:"~2h20/sem"}] }
        ]},
        { m: 4, name: "Avril", challenges: [
          { t: "Courir toutes les lignes de métro dans l'ordre en 1 mois", kind: "daily", status: "abandoned", note: "Tendinite la semaine 2. 5 lignes sur 14.", proofs: [{type:"stat", v:"5/14 lignes"}, {type:"note", v:"Carto au mur"}] }
        ]},
        { m: 5, name: "Mai", challenges: [
          { t: "Organiser une Backyard et y participer", kind: "oneshot", status: "doing", note: "Date fixée au 31. 9 inscrits.", proofs: [{type:"link", v:"backyard-borso.fr", label:"Inscriptions"}, {type:"note", v:"Plan du parcours"}] }
        ]},
        { m: 6, name: "Juin", challenges: [
          { t: "1 poème / jour à une personne différente", kind: "daily", status: "todo" },
          { t: "Montecristo — finir, puis sub-1h30 sur semi en parallèle", kind: "oneshot", status: "todo" }
        ]},
        { m: 7, name: "Juillet", challenges: [
          { t: "Sub-1h30 au semi", kind: "oneshot", status: "todo" },
          { t: "Participer aux championnats de France de Catan", kind: "oneshot", status: "todo" }
        ]},
        { m: 8, name: "Août", challenges: [
          { t: "Traversée du lac d'Annecy à la nage", kind: "oneshot", status: "todo" }
        ]},
        { m: 9, name: "Septembre", challenges: [
          { t: "Sub-6h au L de Lépin", kind: "oneshot", status: "todo" }
        ]},
        { m: 10, name: "Octobre", challenges: [
          { t: "Paris–Dieppe à vélo en 1j et se baigner", kind: "oneshot", status: "todo" }
        ]},
        { m: 11, name: "Novembre", challenges: [
          { t: "3000 pages lues dans le mois", kind: "count", status: "todo" }
        ]},
        { m: 12, name: "Décembre", challenges: [
          { t: "Atteindre 1500 ELO aux échecs dans une cadence", kind: "oneshot", status: "todo" }
        ]}
      ]
    }
  }
};

// Helpers
window.BORSO_HELPERS = {
  statusMeta: {
    done:      { label: "Réussi",     short: "✓", color: "ok" },
    partial:   { label: "Partiel",    short: "≈", color: "warn" },
    failed:    { label: "Échoué",     short: "✕", color: "bad" },
    abandoned: { label: "Abandonné",  short: "—", color: "muted" },
    doing:     { label: "En cours",   short: "•", color: "live" },
    todo:      { label: "À venir",    short: "·", color: "future" }
  },
  monthScore(month) {
    // returns {done, total} where done counts done as 1, partial as 0.5
    let done = 0, total = month.challenges.length;
    for (const c of month.challenges) {
      if (c.status === "done") done += 1;
      else if (c.status === "partial") done += 0.5;
    }
    return { done, total };
  },
  yearScore(year) {
    let done = 0, total = 0;
    for (const m of year.months) {
      const s = window.BORSO_HELPERS.monthScore(m);
      done += s.done; total += s.total;
    }
    return { done, total };
  },
  romanNumeral(n) {
    return ["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][n];
  }
};

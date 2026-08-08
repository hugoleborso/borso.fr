---
status: done
summary: |
  Spec produit à docs/features/borso-fr/front-page-redesign/spec/spec.md.
  Toutes perspectives confrontées (le chat de design transcrit
  sous spec/design-chat-transcript.md couvre product + designer + tech).
  Q.O.D. complet avec 10 questions tranchées, dont 3 nouvelles décisions
  prises avec Hugo via AskUserQuestion (menu fermé par défaut,
  prefers-reduced-motion respecté, shader mobile identique au desktop).
  Pas de surface tech inventée par l'orchestrateur — chaque choix est
  ancré dans le chat ou dans une réponse explicite de Hugo.
artifacts:
  - docs/features/borso-fr/front-page-redesign/spec/spec.md
  - docs/features/borso-fr/front-page-redesign/spec/design-chat-transcript.md
  - docs/features/borso-fr/front-page-redesign/spec/design-prototype.html
  - docs/features/borso-fr/front-page-redesign/spec/design-shader-bg.js
  - docs/features/borso-fr/front-page-redesign/spec/design-landing.jsx
next:
  kind: validate
---

## Spec coverage

- Why : output metric qualitatif (Hugo ne demande pas de re-redesign dans
  12 mois) + 4 input metrics machine (no console error, LCP ≤ 2.5 s,
  CLS = 0, INP ≤ 200 ms). Gemba = la conversation `design-chat-transcript.md`.
- Result : page unique, ref pixel-perfect = `design-prototype.html`. Content
  identique au site actuel.
- Use cases : 5-step happy path + edge cases (reduced-motion, WebGL indispo,
  onglet caché, ResizeObserver indispo).
- Q.O.D. : 10 décisions tranchées avec dates.
- Changes : 4 fichiers (3 UPDATE + 1 NEW) sous `apps/borso-fr/site/`. Aucune
  dep npm ajoutée. Pas de toolchain change.
- Test strategy : `/visual-validation` + `/technical-validation` (pas de
  `*.utils.ts` donc pas de gate coverage).
- Production strategy : pas d'analytics. Zero-defect = garde-fous
  structurels (early-return, font-display swap, animation-fill-mode both,
  animate-in via pageshow).

## Candidats ADR pré-identifiés (pour stage adrs)

Le tech lead orchestrator analysera la spec en stage `adrs`. Pré-shortlist
(trigger entre parenthèses) — décision finale par ratification humaine :

1. **Vendoring du shader WebGL (react-bits, MIT) en local au lieu de npm**
   — trigger 1 (multiple alternatives : npm vs vendored vs from-scratch)
   + trigger 4 (looks-standard : OGL/react-bits est un pattern public).
2. **Pas de build pipeline (vanilla HTML / CSS / JS conservé)** — trigger 3
   (divergence : la convention CLAUDE.md *Layout* dit `cd apps/<x> && pnpm
   dev` sans préciser de build ; on confirme ici qu'on reste plain HTML
   malgré l'ajout d'un shader).
3. **Pas de test runner ajouté à apps/borso-fr** — trigger 3 (divergence :
   le repo applique "*.utils.ts à 100% coverage" mais cette feature
   n'introduit aucune util pure). Pourrait au contraire être un *non*-ADR
   si on considère que c'est juste une application directe de la règle ;
   à juger.

Les autres décisions (menu fermé par défaut, reduced-motion respecté,
mobile identique, font Major Mono Display, fallback WebGL = body bg,
tweaks panel out of scope, pas d'analytics) sont des choix produit /
config, **pas** des ADRs au sens des 4 triggers.

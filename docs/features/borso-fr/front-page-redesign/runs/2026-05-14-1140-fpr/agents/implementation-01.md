---
status: done
summary: |
  4 fichiers livrés sous apps/borso-fr/site/ :
  - index.html (UPDATE) — lang=fr, fonts Major Mono Display + Space Mono,
    bg-canvas-wrap, grain, .stage, burger avec deux SVG (lignes/cross),
    nav.menu, 5 liens (Maman, Les sœurs, Art, Demande de date, Les 12
    travaux de Borso). Scripts type="module" (defer implicite).
  - style.css (UPDATE — full rewrite) — variables CSS, .stage/.welcome/.title
    en clamp(), keyframes fadeUp, body.menu-open .stage dim+scale, burger
    44x44 top-right, menu vertical droite avec staggered transition, media
    < 640px (menu plein écran, backdrop-blur), media prefers-reduced-motion
    (animations off, transitions off).
  - script.js (UPDATE — port vanilla de landing.jsx) — constantes nommées
    (STAGGER_BASE_MS, STAGGER_STEP_MS, MENU_OPEN_CLASS, BURGER_OPEN_CLASS,
    ANIMATE_IN_CLASS, LABEL_OPEN_MENU, LABEL_CLOSE_MENU), state menuOpen=
    false par défaut, applyMenuState() toggle body+burger+menu classes +
    aria + transition-delay JS, Escape ferme, pageshow→animate-in si
    visible ET non reduced-motion.
  - shader-bg.js (NEW) — vendoré depuis spec/design-shader-bg.js avec
    attribution MIT SPDX en tête (cf. ADR 0002). Module ESM (pas IIFE).
    BgController retiré (dead code). Branche reduced-motion qui premier-
    drawArrays synchrone puis early-return (pas de rAF, pas de listeners
    pointer). Vendored locals (cw/ch/U) renommés (pixelWidth/pixelHeight/
    uniforms) pour lisibilité, GLSL upstream verbatim.
  
  Knip mis à jour : "ignore": ["docs/**"] ajouté à knip.json racine — les
  fichiers de référence sous spec/design-*.js{x} ne sont pas du code source.
  
  DÉRIVE SPEC/RÉALITÉ DOCUMENTÉE : la spec disait "garder plain HTML, pas
  de build pipeline" — réalité : apps/borso-fr est déjà sur Vite. Aucun
  impact sur le code livré (vanilla HTML/CSS/JS, Vite les consomme tels
  quels). React/react-dom conservés (utilisés par art/mondrian).
  
  Biome ignore ajouté pour gl.useProgram(program) — false positive de la
  règle useHookAtTopLevel qui matche le pattern use*. Le WebGL useProgram
  n'est pas un hook React.

pre_flight_gates:
  - { gate: "pnpm install", status: PASS, note: "via SessionStart hook" }
  - { gate: "pnpm --filter @borso-app/borso-fr typecheck", status: PASS, note: "après pnpm --filter @borso/infra build pour produire les types CDK" }
  - { gate: "pnpm exec biome lint apps/borso-fr/site/*", status: PASS, note: "1 biome-ignore ajouté pour gl.useProgram (false positive useHookAtTopLevel)" }
  - { gate: "pnpm --filter @borso-app/borso-fr build", status: PASS, note: "vite build, dist/index.html + assets générés ; mondrian build inchangé" }
  - { gate: "pnpm exec knip", status: PASS, note: "knip.json ignore docs/** ajouté" }
  - { gate: "self-screenshot via agent-browser", status: UNVERIFIABLE, note: "agent-browser install échoue sur le certificat googlechromelabs.github.io dans cet environnement ; pas de Chrome local. Le dev server répond correctement (curl 200 sur /, /style.css, /script.js, /shader-bg.js) et le HTML servi est conforme à la spec, mais aucune capture pixel n'a été faite. La vérification visuelle relève de /visual-validation (orchestrator stage suivant) qui tournera en isolation avec son propre browser." }

artifacts:
  - apps/borso-fr/site/index.html
  - apps/borso-fr/site/style.css
  - apps/borso-fr/site/script.js
  - apps/borso-fr/site/shader-bg.js
  - knip.json

next:
  kind: validate
---

## Notes pour /technical-validation

- ADR 0002 attribution MIT présente en tête de `apps/borso-fr/site/shader-bg.js` — ne pas la stripper.
- Aucun import/usage de React dans `apps/borso-fr/site/script.js` ou `shader-bg.js` (port vanilla réussi).
- `BgController` (Tweaks panel) supprimé du vendoring — `grep -rn BgController apps/borso-fr/` retourne 0 hit.
- Constantes nommées en haut de `script.js` (clean code rule).
- 1 commentaire dans `script.js` (le bloc pageshow/animate-in) — documente le WHY (onglet caché).
- Le `// biome-ignore` sur `gl.useProgram` est nécessaire ; le commentaire indique pourquoi.

## Notes pour /visual-validation

- Default menu = CLOSED (body sans classe `menu-open`, burger affiche les lignes, menu invisible, aria-hidden="true").
- Open menu → body gagne `menu-open`, .stage opacity 0.32 + scale 0.94, .menu.is-open, liens visibles avec staggered transition-delay.
- Escape ferme le menu.
- Reduced-motion : la galaxie ne tourne pas (frame frozen à t=0), pas de fade-up sur titre/welcome (opaque dès le départ), pas de transition sur stage/menu.
- Viewport < 640px : menu prend tout l'écran, backdrop-blur, liens centrés.
- WebGL désactivé : page reste fonctionnelle, fond `#05070d` visible.

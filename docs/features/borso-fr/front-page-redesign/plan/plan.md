# Plan — Redesign de la front page borso.fr — galaxie WebGL + Major Mono Display

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, didn't name the risk at all (planning gap), or named it correctly and the defect comes from elsewhere.

ADR ratifié associé : [`docs/adr/0002-vendor-react-bits-galaxy-shader.md`](../../../../adr/0002-vendor-react-bits-galaxy-shader.md).

## Technical surface inventory

| Surface | Source in spec | Existing sub-skill ? |
|---|---|---|
| Static HTML / CSS / JS (no bundler) | Q.O.D. "Build pipeline" → garder | `none` (flagged below) |
| Vanilla WebGL fragment shader | Q.O.D. "Source du shader" → vendor (ADR 0002) | `none` (flagged below) |
| Google Fonts loading (Major Mono Display + Space Mono) | Result + Q.O.D. "Police du titre" | `none` |
| DOM glue (burger toggle, Escape, body class, staggered transition-delay) | Use cases / Result | `none` |
| `prefers-reduced-motion` handling | Q.O.D. "prefers-reduced-motion" → respecter | `none` |
| CDK `StaticSite` (deploy) | unchanged | `none` |

Pas de sub-skill domaine existant ; voir *Missing technical skills* en fin de plan.

## Pattern Coherence pass

Trigger : on introduit deux nouveaux patterns dans `apps/borso-fr` (WebGL shader, `prefers-reduced-motion`). Audit existant :

| Pattern | Déjà présent ailleurs dans `apps/` ? | Conclusion |
|---|---|---|
| Vanilla WebGL fragment shader | Non. `apps/borso-fr/site/script.js` actuel utilise `canvas.getContext('2d')`. | Le shader vit en local sous `apps/borso-fr/site/shader-bg.js`. Si un second app un jour ajoute du WebGL, on factorisera via `infra/shared` ou un nouveau workspace `@borso/webgl-bits`. **Pas de factorisation prématurée.** |
| `prefers-reduced-motion` | Non utilisé dans le repo (`grep prefers-reduced-motion apps/`). | Handling local en CSS (`@media (prefers-reduced-motion: reduce)`) + early-return JS (`matchMedia('(prefers-reduced-motion: reduce)').matches` → ne pas démarrer `requestAnimationFrame`). |
| Burger menu + body class toggle | Pattern proche existe sur `apps/borso-fr` actuel (`navIcon.classList.toggle('open')`). Nouveau : on remonte l'état sur `<body>` (`menu-open`) au lieu du wrap. | Cohérence préservée — on raffine localement, pas de nouveau workspace. |
| Vendored MIT third-party code | Premier vendoring du repo. | Convention posée par ADR 0002 (attribution en tête de fichier, pas de license séparée). Si on vendor un second snippet plus tard, on reproduira ce pattern. |

Outcome : aucune unification cross-app à faire dans cette PR. Tout reste local à `apps/borso-fr/site/`.

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Q.O.D. "État par défaut burger" | Fermé | `apps/borso-fr/site/script.js` : `let open = false;` à l'init. Aucune classe `menu-open` sur `<body>` au load. | DOM inspector au load : `<body class="">` sans `menu-open`. |
| Q.O.D. "prefers-reduced-motion" | Respecter | `style.css` : `@media (prefers-reduced-motion: reduce) { .welcome, .title { animation: none !important; opacity: 1; } }`. `script.js` : ne pas ajouter `animate-in` ; `shader-bg.js` : `if (matchMedia('(prefers-reduced-motion: reduce)').matches) { pushUniforms(0); drawArrays(); return; }` (premier draw sync, pas de rAF). | Émuler reduced-motion dans DevTools → galaxie figée, titre opaque immédiatement. |
| Q.O.D. "Mobile shader" | Identique desktop | `shader-bg.js` : aucun branchement viewport. DPR cap déjà à 2. | Mobile emulator → mêmes paramètres. |
| Q.O.D. "Police du titre" | Major Mono Display | `index.html` : `<link href="https://fonts.googleapis.com/css2?family=Major+Mono+Display&family=Space+Mono:wght@400&display=swap">`. `style.css` : `--font-display: 'Major Mono Display', ui-monospace, monospace; --font-mono: 'Space Mono', ui-monospace, monospace; .title { font-family: var(--font-display); text-transform: lowercase; }` (Major Mono est déjà caps-only, le `text-transform` est cosmétique). | Computed CSS `.title` font-family contient `Major Mono Display`. |
| Q.O.D. "Fallback WebGL" | Rien (body bg) | `style.css` : `body { background: #05070d; }`. `shader-bg.js` : `if (!gl) return;` — pas de DOM injecté. | Désactiver WebGL (Chrome flag) → fond `#05070d` visible, grain par-dessus. |
| Q.O.D. "Source du shader" | Vendor (ADR 0002) | `apps/borso-fr/site/shader-bg.js` NEW : copie textuelle du `spec/design-shader-bg.js` + attribution MIT en tête. | `grep -c "react-bits" apps/borso-fr/site/shader-bg.js` ≥ 1. |
| Q.O.D. "Tweaks panel" | Out of scope | `script.js` n'expose pas `BgController` ; `shader-bg.js` garde sa surface `window.BgController` mais aucun appelant ne l'utilise. **Action** : retirer l'export `window.BgController` du fichier vendoré pour ne pas porter de dead code. | `grep BgController apps/borso-fr/site/` → 0 hit. |
| Q.O.D. "Tracking analytics" | Aucun | `index.html` ne charge ni Plausible, ni GA, ni snippet tracking. | View source : pas de `<script src="...plausible..."` / `gtag`. |
| Q.O.D. "Build pipeline" | Plain HTML conservé | `apps/borso-fr/package.json` : pas de nouvelle dep. `pnpm build` reste `cp -R site dist`. | `git diff apps/borso-fr/package.json` → vide (à part éventuellement script unchanged). |
| Q.O.D. "Test runner" | Aucun | Pas de `vitest.config.ts` ajouté. Pas de `*.utils.ts` créé. | `ls apps/borso-fr/*.config*` inchangé. |
| Changes / Files — `index.html` | UPDATE | Structure : `<body>` → `#bg-canvas-wrap`, `#bg-grain`, `<main class="stage">` (welcome + title), `<button class="burger">` (top-right), `<nav class="menu">` (5 liens), `<script defer src="shader-bg.js">`, `<script defer src="script.js">`. `lang="fr"`. | Pixel-perfect vs `spec/design-prototype.html` (vu par `/visual-validation`). |
| Changes / Files — `style.css` | UPDATE — full rewrite | Reprend les règles du prototype (`spec/design-prototype.html` `<style>`) : variables CSS, `.stage`, `.welcome`, `.title`, `.burger`, `.menu`, `.menu li:nth-child(n)` staggered delay via inline `style` (set en JS) ou CSS calc, `body.menu-open .stage { opacity:.32; transform:scale(.94) }`, `@media (max-width:640px)`, `@media (prefers-reduced-motion: reduce)`. | `pnpm dev` + visual diff. |
| Changes / Files — `script.js` | UPDATE — port vanilla de `spec/design-landing.jsx` | Pas de React. Module avec `let menuOpen = false;` ; toggler met à jour : `body.classList.toggle('menu-open', menuOpen)`, `burger.classList.toggle('is-open', menuOpen)`, `menu.classList.toggle('is-open', menuOpen)`, `menu.setAttribute('aria-hidden', String(!menuOpen))`, applique `transitionDelay` calculé `${80 + i*60}ms` sur chaque `<li>` à l'ouverture (et `0ms` à la fermeture). Escape → close. `pageshow` listener ajoute `animate-in` à `<body>` si non-hidden ET non-reduce-motion. | Code review (`/technical-validation`) + comportement (`/visual-validation`). |
| Changes / Files — `shader-bg.js` | NEW — vendored | Header : commentaire MIT 8-12 lignes (slug react-bits, lien GitHub upstream, copyright, license SPDX). Corps : copie du `spec/design-shader-bg.js` adaptée pour respecter reduced-motion (cf. ligne ci-dessus). `window.BgController` supprimé (dead code, voir Tweaks row). | Header présent. Pas d'appelants à `BgController`. |
| Use cases / Edge "onglet caché" | `animate-in` only si visible | `script.js` : `window.addEventListener('pageshow', () => { if (document.visibilityState !== 'hidden' && !prefersReducedMotion) document.body.classList.add('animate-in'); });`. | DevTools : ouvrir l'onglet en background → revenir → animation joue OU titre déjà visible (jamais à 0). |
| Use cases / Edge "ResizeObserver indispo" | Fallback resize sur window | `shader-bg.js` : `if (window.ResizeObserver) { new ResizeObserver(resize).observe(wrap); }`. | Code path déjà dans le source vendoré ; conserver tel quel. |
| Input metric "LCP ≤ 2.5 s" | — | `index.html` : `<link rel="preconnect" href="https://fonts.googleapis.com">` + `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` (déjà dans le prototype). Polices avec `display=swap`. Scripts `defer` pour ne pas bloquer le HTML parsing. | Lighthouse manuel post-merge (optionnel, métrique cible). |
| Input metric "CLS = 0" | — | `.title { font-size: clamp(56px,11vw,168px); line-height: 1; }`. Pas de `width: auto` sur images injectées. Le grain SVG est inline en `background-image`. | View source : pas d'éléments redimensionnés post-load. |
| Production / Zero-defect "animation-fill-mode both" | — | `style.css` : `@keyframes fadeUp { ... }` + `body.animate-in .title { animation: fadeUp 1.2s ease-out 0.5s both; }`. Le `both` = `forwards + backwards`. | `getComputedStyle(.title).opacity` après animation = 1. |

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| Shader compile fail sur GPU exotique (Intel HD ancien, mobile bas de gamme) | medium | `compile()` log + `init()` early-return → fond `#05070d` reste visible | `/visual-validation` couvre "WebGL désactivé" assertion ; `console.error` repéré au visual-validation broken-image scan |
| Major Mono Display ne charge pas (CDN down ou bloqué) | low | `font-display: swap` → fallback `ui-monospace`. Le titre reste lisible. | Pas de tracking ; détection manuelle si Hugo voit la fallback. Accepté. |
| `prefers-reduced-motion` mal respecté (galaxie tourne toujours) | medium | Double-couche : (a) CSS `@media (prefers-reduced-motion: reduce)` désactive keyframes ; (b) JS check `matchMedia` avant `requestAnimationFrame`. | `/visual-validation` émule reduced-motion + asserte galaxie figée. |
| Onglet caché au chargement → titre bloqué à `opacity:0` | high (le site paraîtrait cassé) | `animate-in` n'est ajouté que sur `pageshow` quand `visibilityState !== 'hidden'`. CSS `animation-fill-mode: both` rend le titre visible une fois l'animation tickée. Et titre `opacity:1` par défaut sans `body.animate-in`. | Test manuel : ouvrir dans un nouvel onglet en background, switch → titre lisible. `/visual-validation` couvre via mode "non-active tab" si possible. |
| `transitionDelay` JS-set qui dévie de la formule du prototype | low | Constante nommée en haut de `script.js` (`STAGGER_BASE_MS = 80`, `STAGGER_STEP_MS = 60`). | Code review (`/technical-validation`). |
| Suppression du `<canvas id="gradient-canvas">` casse une URL externe / un test | low | Personne ne référence `#gradient-canvas` hors `apps/borso-fr/site/`. Validé via `grep gradient-canvas .` (à faire à l'implementation). | `pnpm exec knip` ne couvre pas, mais le nom n'apparaît qu'ici. |
| Le burger en `top:24px right:24px` dépasse hors viewport sur très petit mobile | low | `clamp()` non nécessaire — 44 × 44 px tient sur 320 px de large (320 - 24 - 44 = 252 px restants pour le contenu). | `/visual-validation` à 360 × 640 px. |
| L'utilisateur clique sur un lien du menu mais l'animation `transition` rate (lien sur lien suivant) | low | Liens sont `<a href>` natifs ; la navigation se déclenche immédiatement, l'animation visuelle est lost-but-fine. | Non détectable, non important. |
| Repulsion souris cause un déplacement visuellement gênant pendant `menu-open` | low | Le shader continue de réagir, mais le `stage` (titre) est dim+scale → contraste réduit. Acceptable. | Visual validation impressionniste. |
| Knip flag `BgController` comme export non utilisé après suppression | low | Suppression frontale dans `shader-bg.js` ; pas d'export du tout (IIFE). | Pre-flight gate 6 (`pnpm exec knip`). |

## Code-quality self-check

- [ ] Repo lint rules pass (`pnpm exec biome lint`).
- [x] Type-assertion plugin satisfied — N/A : pas de TS dans cette PR (vanilla JS).
- [x] No `any` — N/A : pas de TS.
- [ ] No abbreviations or single-letter locals outside trivial loop indices. (Le shader vendoré contient `p`, `c`, `K` dans les helpers GLSL → c'est du GLSL upstream, on conserve verbatim. Pour le JS du harness, on renomme les locales courtes du vendor (`U`, `cw`, `ch`) en `uniforms`, `pixelWidth`, `pixelHeight` si le diff reste lisible.)
- [ ] Magic numbers / strings extracted to named constants. `STAGGER_BASE_MS`, `STAGGER_STEP_MS`, `MENU_OPEN_CLASS = 'menu-open'`, `BURGER_OPEN_CLASS = 'is-open'`, `ANIMATE_IN_CLASS = 'animate-in'`. Le shader garde `PARAMS` comme bloc nommé.
- [ ] Comments document the WHY only. Cibler 0 commentaire dans `script.js` (DOM glue est évident) ; commentaires conservés dans `shader-bg.js` uniquement pour : attribution MIT (load-bearing, voir ADR 0002), explication du premier `drawArrays` synchrone (non-obvious), explication du `pageshow`-only `animate-in` (non-obvious).
- [x] No JSDoc on internals — N/A : pas de JSDoc dans ce PR.
- [ ] Function names describe the result, not the mechanism. Ex : `respectsReducedMotion()` plutôt que `checkPreferences()` ; `applyStaggeredReveal(items)` plutôt que `setDelays(items)`.

## Pre-flight gates

Run, in order, before push :

1. `pnpm install` — sanity, vérifie qu'aucune dep n'a fuité.
2. `pnpm --filter @borso-app/borso-fr typecheck` — N/A (pas de TS). Skip explicitement.
3. `pnpm exec biome lint` — lint global ; doit passer.
4. `pnpm --filter @borso-app/borso-fr build` — `cp -R site dist`. Vérifie que le `dist/` contient bien `index.html`, `style.css`, `script.js`, `shader-bg.js`.
5. `/visual-validation` contre `docs/features/borso-fr/front-page-redesign/spec/spec.md`.
6. `pnpm exec knip` — pas de dead export. (Le `BgController` ne doit plus exister.)
7. `/technical-validation` contre la spec — code review pass.

## Open questions / unknowns

- **Quel package slug pour `apps/borso-fr` dans `pnpm --filter` ?** Le plan suppose `@borso-app/borso-fr` ; à vérifier dans `apps/borso-fr/package.json` au début de l'implémentation. Si le slug réel diffère, l'implementer le corrige dans ses commandes pre-flight sans changer ce plan.
- **Texte du burger button `aria-label`** : "Ouvrir le menu" / "Fermer le menu" (français, comme le reste du site). Si l'accessibilité ne ressort pas dans `/visual-validation`, c'est OK.
- **Devrait-on conserver `text-transform: lowercase` ou non sur `.title` ?** Le prototype du design utilise Major Mono Display qui est nativement en caps. La spec dit "Major caps geo" (caps). Le `text-transform` est donc redondant — l'implementer peut le retirer s'il est inutile.

## Missing technical skills

- **`/static-html-app`** — recettes pour les apps "plain HTML, no bundler" : `<script defer>`, font preconnect, `display=swap`, structure `site/` ↔ `dist/`. À seed depuis [patterns.dev](https://www.patterns.dev/ai/skills/) "Loading patterns".
- **`/webgl-shader`** — checklist pour intégrer un fragment shader : feature detection (`getContext('webgl')` fallback), DPR cap, ResizeObserver fallback, premier `drawArrays` synchrone, respect de `prefers-reduced-motion`. À seed.

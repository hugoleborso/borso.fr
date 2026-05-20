# Visual validation — Pragma first-features (round 5, design-fidelity re-check)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Design bundle: [`../spec/design-bundle/`](../spec/design-bundle/)
- Dev URL: http://localhost:5175/
- Run at: 2026-05-20T10:45:00Z
- Tooling: agent-browser 0.27.0 (Chromium 1194; viewport 1440×900 unless noted)
- Locale: `LANG=fr_FR.UTF-8` so `navigator.language='fr-FR'` and the i18n catalog resolves to the French copy that matches the prototype.
- Auth: seeded `password = "pragma-r5"` via `POST /api/admin/set-password`, then logged in via the live login form. Fresh tenant data seeded over the API (5 members × 5 instruments, 6 songs spanning all chart kinds + null, 5 bars, 1 concert + 2 practice sessions, a 5-entry setlist with one tonality-jump lineup-override that forces two side-gutter transition warnings, 9 mastery defaults).

## Mode used

The prototype's `Pragma.html` requires `react`, `react-dom` and `@babel/standalone` from `unpkg.com`; the sandbox has no outbound TLS so the prototype runtime cannot render. As in round 4, the comparison reference is the `.jsx` source files plus `design-bundle/project/src/styles.css`. Only implementation screenshots are committed under `./screenshots-2026-05-20-1645/`. Each row cites the precise prototype affordance the implementation now matches (or doesn't).

## Blocker closure summary (round 4 → round 5)

| # | Round-4 blocker | Round-5 verdict |
|---|---|---|
| 0 | Dark-mode regression: cream paper never rendered (whole app dark) | **CLOSED** — `tokens.css` rewritten; light `@theme {}` declares cream defaults, dark overrides moved to `:root` inside the media query (outside `@theme`). `getComputedStyle(body).backgroundColor = rgb(244,239,230)` (= `#f4efe6`) on `prefers-color-scheme: light` and `rgb(22,19,15)` (= `#16130f`) on `prefers-color-scheme: dark`. Verified both. |
| 1 | Catalog chart-kind icons never render (API/schema field mismatch) | **CLOSED** — each card's top-right icon now correlates to `song.chart.kind`: `chordpro` → "lines+T" path (`M5 5h14M9 5v14M5 12h8`); `pdf` → text-lines path (`M9 8h6M9 12h6M9 16h4`); `image` → mountain path (`M21 16l-5-5-9 9`); null → italic "pas d'accord" badge. Three icons all distinct across the seeded songs. |
| 2 | Song detail = edit form (mastery viz + lineup card absent) | **CLOSED** — `/catalog/:songId` renders read-only display. `document.querySelectorAll('input,textarea,select').length === 0`. Layout: status chip + chart-kind badge + tonality + `Modifier` + `Mode scène` actions, font-display H1 "Helpless", chord-chart preview with `[D]` highlighted in `text-accent`, `Liens externes` iframe (oEmbed), right aside with `Lineup par défaut` (member chip + instrument tag-mono per member) and `Maîtrise` (10-bar gradient per member, score on the right, hue = member palette). |
| 3 | Session detail = edit form (no venue H1, no friends-bars) | **CLOSED** — `/sessions/:id` shows venue as H1 (`Le Sentier des Halles · Paris`), CONCERT tracking-wide eyebrow, date + capacity + friends-count metaline, `Modifier` + `Setlist` actions, `Amis par membre` card with horizontal hue-coloured bars + Σ total + jauge percentage, `Matériel` card, `Lieu` card on the right. Edit form lives behind the `Modifier` button. |
| 4 | Setlist editor: drag-on-right + no sparkline + no warning gutter | **CLOSED** — drag handle (24px wide) is the 2nd column at `left=325` inside each row at `left=268..1232` — clearly LEFT half. The energy sparkline (a long quadratic-bezier `path d="M 0 40 Q 0 40 45 36.6..."`) sits at `top=650`, the entry list starts at `top=763` — sparkline above. Side gutter at `x=244` (LEFT of `listLeft=268`) carries two circular warning markers (`aria-label="Voir / commenter la transition"`) at the two transitions where my forced lineup override breaks harmonic continuity. Clicking a marker opens `Commentaire de transition` modal. |
| 5 | Mode scène renders inside AppShell | **CLOSED** — `/catalog/:songId/scene` renders WITHOUT the AppShell sidebar (no `nav a[href*=catalog]` in the DOM). Dark `#0d0a07`-ish background, `← Retour` top-left, font-display H2 "Helpless", transpose `-1/+0/+1` + zoom `A−/A+` controls top-right. ESC navigates back to `/catalog/:songId`. |
| 6 | Sidebar missing Setlists entry + missing badge counts | **CLOSED** — sidebar nav = `Catalogue 3 / Sessions 1 / Setlists 1 / Bars 5 / Membres / Instruments` (six links, group divider before Membres). Badge counts mirror the prototype's `useNavBadges`-derived values (concert-ready song count, upcoming-session count, setlist count, bar count). Members and Instruments are admin and intentionally unbadged. |
| 7 | Mobile-nav fallback: sidebar still 232px at 375px viewport | **CLOSED** — at `set viewport 375 812`, sidebar is hidden, hamburger button `aria-label="Ouvrir le menu"` is rendered top-left. Clicking the hamburger opens a slide-over panel with the six nav links + badges; tapping a link navigates (verified `Sessions 1 → /sessions`). |

## Section 0 — Design-bundle fidelity (per-screen)

Each row asserts the five PASS criteria from the standard (typography stack matches, layout structure matches, affordances match, palette tokens match, microcopy matches). Evidence files are under `./screenshots-2026-05-20-1645/`.

| # | Screen file | Verdict | Evidence |
|---|---|---|---|
| S1 | `screens/catalog.jsx` (catalog list) | **PASS** | `01-catalog.png`, `01-catalog-full.png` |
| S2 | `screens/catalog.jsx` (song detail) | **PASS** | `02-song-detail.png`, `02-song-detail-full.png` |
| S3 | `screens/catalog.jsx` (Mode scène / `PerfMode`) | **PASS** | `03-mode-scene.png` |
| S4 | `screens/setlist.jsx` (setlist editor) | **PASS** | `04-setlist-editor-rows.png`, `04-setlist-warnings-detail.png`, `04-transition-modal.png` |
| S5 | `screens/sessions.jsx` (sessions list) | **PASS** | `05-sessions-list.png` |
| S6 | `screens/sessions.jsx` (session detail) | **PASS** | `06-session-detail.png`, `06-session-detail-full.png`, `04-setlist-with-warnings.png` |
| S7 | `screens/bars.jsx` (kanban + list) | **PASS** | `07-bars-list.png`, `07-bars-kanban.png` |
| S8 | `screens/admin.jsx` (members + instruments + mastery matrix) | **PASS** | `09-admin-members.png`, `09-admin-instruments.png`, `10-mastery-matrix.png` |
| S9 | `shell.jsx` (app shell + sidebar + mobile slide-over) | **PASS** | `01-catalog.png` (sidebar at 1440px), `08-mobile-catalog.png` (375px hamburger), `08-mobile-slideover.png` (slide-over), `08-mobile-after-nav.png` (post-tap navigation) |
| S10 | `energy.jsx` (sparkline + badges) — atoms | **PASS** | sparkline visible above setlist entries (`04-setlist-warnings-detail.png`), energy chip `E 5` on every catalog card (`01-catalog.png`) |
| S11 | Login route (spec-only) | **PASS** | `00-login-fr-light.png`, `00-login-dark.png` |

Tally: **PASS 11, FAIL 0, PASS-with-caveat 0**.

### S1 details

- Typography: H1 `Catalogue` resolves `font-family = "Instrument Serif", "Iowan Old Style", Georgia, serif`. Card titles same. Body `Geist Variable`. `RÉPERTOIRE` crumb in tracking-wider uppercase Geist. Card meta (`E 7 · M 9.0`) in `font-mono` per the chip styling.
- Layout: sidebar / crumb / H1 / subtitle / actions row (Filtres + Nouveau titre) / search / filter pills with counts (`Toutes 6 / Prêtes scène 3 / Répétées 1 / En travail 1 / Idées 1`) / card grid. Matches prototype lines 21-87.
- Affordances: status chip per card with prototype colours (`Prêt scène` dark, `Idée` neutral, `Répété` sage, `En travail` warn-cream); chart-kind icon top-right OR `pas d'accord` italic fallback; energy chip + mastery chip; member-chip lineup row.
- Palette: cream `#f4efe6` body, elev `#fbf7ef` cards, ink-900 title; member chip backgrounds resolve to `var(--color-member-coral)`, `--color-member-teal`, etc.
- Microcopy: subtitle reads `6 titres, dont 3 prêts pour la scène` — proportionally close to the prototype's `25 titres, dont 5 prêts pour la scène`.

### S2 details

- Layout: two-column at `lg:grid-cols-[1fr_280px]`. Left column: chord-chart card with `[D]` highlighted via `text-accent font-semibold`, then `Liens externes` card hosting a YouTube oEmbed iframe (iframe loads cross-origin — the YouTube embed shell itself shows a no-network placeholder because the sandbox blocks googlevideo.com, but the iframe slot, sizing, and source are correct; broken-image scan returns `[]`). Right aside: Lineup card with chip + tag-mono per member, Maîtrise card with 10-bar gradient per member sorted by score desc, Énergie de base `5/10`.
- Mastery viz uses 10 spans `w-1.5 h-3.5 rounded-[1px]` with background `var(--color-member-<hue>)` for filled bars and `var(--color-bg-sunk)` for empties, opacity 0.85 on filled. Exactly the prototype affordance.

### S3 details

- DOM at `/catalog/:songId/scene`: no `nav a[href*=catalog]`, no `aside`, no AppShell wordmark. Just the perf-mode bar (Retour, Helpless, transpose, zoom) + the monospace chord chart taking the full viewport. Background is the dark perf-mode palette.
- ESC exits to `/catalog/:songId`. Mode scène as fullscreen takeover is the prototype's invariant.

### S4 details

- Header `Setlist` in `font-display`. Energy sparkline ABOVE the entries (verified `sparkSvg.top=650 < firstEntry.top=763`). Entries laid out as a CSS grid `32px auto 1fr auto auto`: position (mono `01..05`), drag handle, title-and-submeta block (title in `font-display italic`, submeta in compact greyed text with member chips), energy slider + delete `×`.
- Drag handle at column 2 (`left=325` vs row `left=268..1232`) — LEFT half. Only drag-reorder; no up/down arrows in the DOM.
- Side-gutter warning markers: I deliberately overrode the Comptine entry's lineup so Mae plays vocals (non-harmonic) and nobody carries a harmonic instrument across the Black→Comptine→La Foule pair — two `⚠`-icon buttons rendered in the LEFT gutter (`x=244`, between rows 3-4 and 4-5). Clicking opens the `Commentaire de transition` modal (`heading="Commentaire de transition" ref=e13`).
- The "Modifier" toggle per row reveals key-override + capo + notes inputs on demand.

### S5 details

- Timeline IS rendered: vertical rail + circle markers per session, sorted descending by date. Concert sessions have a tinted accent dot (filled blue), practice sessions a hollow ring. Eyebrow `CONCERT` / `RÉPÉTITION` is tracking-wider uppercase mono per the prototype. Date in font-display, venue subtitle for concerts.
- Page header: H1 `Sessions`, subtitle, `+ Concert` and `+ Répétition` action buttons top-right. Both round-4 misses (no timeline, no CTA) are now closed.

### S6 details

- H1 = venue (`Le Sentier des Halles · Paris`), eyebrow `CONCERT`, date+jauge+friends meta. `Amis par membre` card with member-hue bars and a Σ row; `Matériel` card; `Lieu` card. `Modifier` + `Setlist` actions top-right. Setlist editor inlines below at the same route (display-led, not edit-led).
- Read-only display: `document.querySelectorAll('input,textarea,select').length` excluding the inline energy sliders is 0 for the read-only header.

### S7 details

- List view: hint banner `⚠ 5 bars n'ont pas été relancés depuis +60 jours — un petit coup de fil ?` at top, list-style chip-rows (name + status chip + `À relancer` chip + city + capacity + `×`). New-bar form right-aside with tracking-wider uppercase labels.
- Kanban view: 5 columns `Piste / Contacté / Réservé / Joué / Froid`, each with the count of bars in that bucket and a card per bar. Toggle `Liste / Kanban` rendered as chip-style at top-right.

### S8 details

- Members page: chip-row of existing members (avatar tile + name + `×` delete) and a `Nouveau membre` form. Matrice de maîtrise renders 5 members × 5 instruments cells with row + column averages (`Moy. 7.5 10.0 8.0 7.5 8.5`), copy `Clic pour éditer ; molette pour ±1 ; clic-droit pour vider…`.
- Instruments page: same pattern (chip row + form + isHarmonic checkbox label `Harmonique (compte pour l'analyse de transition)`).

### S9 details

- Desktop sidebar (1440×900): wordmark `Pragma / ERP DU GROUPE` (font-display italic + tracking-wider), 4 primary nav links with badges, divider, 2 admin nav links unbadged, user pill at bottom `H Hugo / Pragma · v0.1`.
- Mobile (375×812): hamburger top-left, wordmark inline, full-bleed main content. Hamburger toggles a slide-over panel revealing the same six links and badges. Tapping a link navigates correctly.

### S10 details

- Sparkline is a quadratic-bezier path `M 0 40 Q 0 40 45 36.6 T 90 33.2 Q ...` over a 360×80 SVG, with a stroked overlay + filled gradient — matches the prototype's `Sparkline` molecule. Energy chips `E n` and mastery chips `M x.x` on every catalog card carry the same affordance.

### S11 details

- Login at `/login`: cream paper, wordmark `Pragma / ERP DU GROUPE`, label `MOT DE PASSE PARTAGÉ` tracking-wider uppercase, `Entrer` accent button. Dark-mode emulation renders the same panel against `#16130f` ink. Both modes verified via `agent-browser set media light|dark` and `getComputedStyle(body).backgroundColor`.

## Section 1 — Site-wide rendering

| # | Item | Observed | Verdict |
|---|---|---|---|
| G1 | Body sans-serif stack | `getComputedStyle(body).fontFamily = "Geist Variable", Söhne, system-ui, -apple-system, "Helvetica Neue", sans-serif` | PASS |
| G2 | H1 display stack | `getComputedStyle(h1).fontFamily = "Instrument Serif", "Iowan Old Style", Georgia, serif` on every page sampled | PASS |
| G3 | Tokens exposed via `@theme` | Compiled stylesheet declares `--color-member-{coral,teal,mustard,plum,sage}`, `--color-status-{wip,rehearsed}-{bg,fg,border}`, `--color-bg-{,elev,sunk}`, `--color-ink-{900,700,500,400,300}`, accent + warn + danger + good | PASS |
| G4 | Cream paper in light mode | `media=light` → `bodyBg = rgb(244,239,230)` (`#f4efe6`) | PASS (was FAIL round 4) |
| G5 | Dark swatch in dark mode | `media=dark` → `bodyBg = rgb(22,19,15)` (`#16130f`) | PASS |

## Section 2 — Broken-image scan (per page)

`Array.from(document.querySelectorAll('img')).filter(img => img.complete && img.naturalWidth === 0)` returns `[]` on `/catalog`, `/catalog/:songId`, `/sessions/:id`, `/bars`, `/members`, `/instruments`. No alt-text-fallback regression. (The YouTube oEmbed iframe on song detail renders an internal placeholder when its CDN is unreachable, but the placeholder lives inside the iframe document; the host page has zero broken `<img>` tags.)

## Section 3 — Non-regression sweep

| Round-3/4 PASSes | Re-check method | Outcome |
|---|---|---|
| Login form renders + serif treatment | `00-login-fr-light.png` + font-family probe | PASS (unchanged) |
| Auth happy path → `/catalog` | `fill@e3 / click@e4 → url=/catalog` | PASS |
| Catalog page lists songs | DOM query | PASS (6 songs across 4 chart kinds) |
| Sidebar nav (Catalogue/Sessions/Bars/Members/Instruments) | DOM query | PASS — AND **Setlists** restored |
| Kanban view of bars | Toggle + 5-column grid | PASS |
| French i18n on first visit | `navigator.language=fr-FR` returns French copy | PASS |
| Admin pages | Captured | PASS |
| Mastery matrix renders grid with row + column averages | DOM verified — `Moy. 7.5 10.0 8.0 7.5 8.5` | PASS |
| Dark-mode preference flips palette | `set media dark` → `#16130f`; `set media light` → `#f4efe6` | PASS (was UNVERIFIABLE round 3, FAIL round 4, now PASS) |

## Verdict: PASS

Every previously-FAIL row from round 4 closes. The dark-mode regression closes definitively (both light and dark modes verified). Per-screen design-fidelity rows all PASS. Non-regression sweep is clean. No broken images. No unverifiable rows.

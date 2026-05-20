# Visual validation — Pragma first-features (round 4, design-fidelity gate)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Design bundle: [`../spec/design-bundle/`](../spec/design-bundle/) (the visual contract)
- Dev URL: http://localhost:5174/
- Run at: 2026-05-20T09:35:00Z
- Tooling: agent-browser 0.27.0 (Chromium 1194, viewport 1440x900 unless noted)
- Locale: navigator.language forced to `fr-FR` via `LANG=fr_FR.UTF-8` so the i18n catalog resolves to French (matches the prototype's hard-coded FR copy).

## Mode used

The prototype (`design-bundle/project/Pragma.html`) requires `react`, `react-dom` and `@babel/standalone` from `unpkg.com` — the sandbox has no outbound TLS and the assets fail to fetch (DNS / cert error during `agent-browser install`). The prototype's runtime therefore could not render, so the comparison reference is the `.jsx` source files plus `design-bundle/project/src/styles.css`, which the bundle's own README explicitly endorses ("everything you need … is spelled out in the source"). Only implementation screenshots are committed under `./screenshots-2026-05-20-1350/comparisons/`. Each FAIL row quotes the prototype source verbatim so the gap is unambiguous.

## Section 0 — Design-bundle fidelity (per-screen)

| # | Screen file | Verdict | Evidence |
|---|---|---|---|
| S1 | `screens/catalog.jsx` (catalog list) | **FAIL** | `comparisons/catalog-impl.png` |
| S2 | `screens/catalog.jsx` (song detail) | **FAIL** | `comparisons/song-detail-impl.png` |
| S3 | `screens/catalog.jsx` (Mode scène / `PerfMode`) | **FAIL** | `comparisons/mode-scene-impl.png` |
| S4 | `screens/setlist.jsx` (setlist editor) | **FAIL** | `comparisons/setlist-impl.png` |
| S5 | `screens/sessions.jsx` (sessions list) | **FAIL** | `comparisons/sessions-impl.png` |
| S6 | `screens/sessions.jsx` (session detail) | **FAIL** | `comparisons/session-detail-impl.png` |
| S7 | `screens/bars.jsx` (kanban + list) | **FAIL** | `comparisons/bars-list-impl.png`, `comparisons/bars-kanban-impl.png` |
| S8 | `screens/admin.jsx` (members + instruments + mastery) | PASS (with deviations noted) | `comparisons/admin-members-impl.png`, `comparisons/admin-instruments-impl.png` |
| S9 | `shell.jsx` (app shell + sidebar + offline banner) | **FAIL** | `comparisons/shell-impl.png`, `comparisons/mobile-narrow-impl.png` |
| S10 | `energy.jsx` (sparkline + badges) — atoms/molecules | PASS | sparkline SVG present on song detail (`comparisons/song-detail-impl.png`) and on setlist rows in spec (energy column on `comparisons/setlist-impl.png`) |
| S11 | Login route (spec-only, no prototype counterpart) | PASS-with-caveat | `comparisons/login-impl.png` |

Tally: **PASS 2, FAIL 8, PASS-with-caveat 1.**

## Section 1 — Site-wide rendering

| # | Item | Observed | Verdict |
|---|---|---|---|
| G1 | Body uses `Geist Variable` (mapped to spec's `--t-ui`) | `getComputedStyle(body).fontFamily = "Geist Variable", Söhne, system-ui, ...` | PASS |
| G2 | H1 uses `Instrument Serif` italic display face | `getComputedStyle(h1).fontFamily = "Instrument Serif", "Iowan Old Style", Georgia, serif` on login + catalog + every page sampled | PASS |
| G3 | `@theme` exposes member-palette + status-chip swatches | `tokens.css` declares `--color-member-{coral,teal,mustard,plum,sage}`, `--color-status-{wip,rehearsed}-{bg,fg,border}`; verified in the compiled stylesheet at runtime | PASS |
| G4 | App renders in the prototype's cream-paper palette in default OS light mode | `getComputedStyle(body).backgroundColor = "rgb(22,19,15)"` on every screen even with `prefers-color-scheme: light` emulated; `--color-bg = #16130f` is the DARK swatch (light value `#f4efe6` is overwritten by Tailwind v4's `@theme` re-declaration inside `@media (prefers-color-scheme: dark)`) | **FAIL** |

## Section 2 — Broken-image scan (every screenshot)

`Array.from(document.querySelectorAll('img')).filter(img => img.complete && img.naturalWidth === 0)` returns `[]` on every captured screen. No alt-text-fallback regression.

## Notes

> One bullet per FAIL row. PASS rows omitted.

### S1 — Catalog list (`screens/catalog.jsx` lines 21-87)

- **Layout structure.** Implementation has crumb + h1 + subtitle + actions row + search + filter pill group + card grid. PROTOTYPE STRUCTURE PRESENT. **Defect that demotes to FAIL:** the prototype's `SongCard` (lines 89-110) renders, top-right, `Icon name="text" / "pdf" / "image"` for `song.chartKind`, or a small `"pas d'accord"` chip when null. The implementation's `CatalogPage.tsx` schema reads `songSchema.chordChart?.kind` (line 34), but the API endpoint `GET /api/songs` returns the chart field as `chart`, not `chordChart` (verified via `curl -b cookies http://localhost:3001/api/songs | jq`). So `s.chordChart` is `undefined` for every song and EVERY card renders "pas d'accord", regardless of the chart actually attached. This is a field-mismatch bug between the song API and the catalog screen; the chart-kind affordance is therefore visually absent on every card. Source-of-truth: the prototype shows three distinct icons + a fallback.
- **Microcopy.** Crumb = "Répertoire" ✓, h1 = "Catalogue" ✓, filter pills = "Toutes / Prêtes scène / Répétées / En travail / Idées" with live counts ✓, subtitle = "9 titres, dont 3 prêts pour la scène" (close enough to the prototype's "25 titres, dont 5 prêts pour la scène · dernière mise à jour aujourd'hui" — the trailing "· dernière mise à jour aujourd'hui" clause is dropped).
- **Member chip lineup on cards.** The prototype's `SongCard` ends with `<Lineup … bare/>` (line 107). Implementation's `SongCard.tsx` renders five letter-only avatars but they appear as the single-letter chars `E7M9.4ECHAG` in the rendered text (visible in the captured DOM `allTextNoHTML`), suggesting palette letters glued together — the member-chip molecule may not be reading colors / spacing per the prototype. The grid still PASSES at a glance, but the affordance is degraded.

### S2 — Song detail (`screens/catalog.jsx` lines 141-260)

- **Implementation renders an EDIT FORM, not the prototype's read-only detail.** `SongDetailPage.tsx` line 1 comment: *"Per-song detail + create page. URL `:songId === 'new'` triggers the create flow; any UUID loads the existing song and edits it in place."* DOM verifies: form labels "Titre / Interprète / Statut / Tonalité — début / Tonalité — fin / Énergie de base (1-10) / Chord chart / Liens externes / Enregistrer / Supprimer". The prototype's `SongDetail` (lines 141-260) is a two-column read-only layout: left column carries the chord-chart preview card (`<pre class="chord-pre">` with `[chord]` spans highlighted in `var(--accent)`) and the external-links card; right aside carries three cards — "Lineup par défaut" (member chip + instrument tag-mono), "Maîtrise" (10-bar gradient mastery per member, scored x/10), "Joué récemment" (date + counts).
- **Missing on the implementation:** the lineup card with `MemberChip` rows, the mastery-bar visualization (the prototype's signature affordance — ten 6×14px bars per member in the member's hue), the "Joué récemment" recent-play card, the two action buttons "Éditer / Mode scène" in the page header (the implementation has the Mode scène button but no "Éditer" — because the page IS the edit form).
- **Chord-chart preview** *is* rendered, inside a card, with `[Em]Well sometimes I ...` text, but as a raw ChordPro textarea/editor preview (visible labels include "Texte ChordPro / PDF / Image"); the prototype renders chord names inline highlighted in `--accent`.

### S3 — Mode scène / PerfMode (`screens/catalog.jsx` lines 276-316)

- **Prototype is a fullscreen takeover** (`.perf-mode { position: fixed; inset: 0; z-index: 1000; background: #0d0a07; color: #f1e9d8; padding: 36px 60px; font-family: var(--t-mono); }`). The sidebar and topbar are HIDDEN. Implementation route `/catalog/:songId/scene` renders INSIDE the `AppShell`: sidebar is still visible at the left, the page content has a "← Retour" link and the chord text, but the rest of the chrome (nav, "Pragma · ERP du groupe" wordmark, member chip) is present — see `comparisons/mode-scene-impl.png`.
- The prototype's `.scene-foot` + `.scene-pill` (sequential up-next pills with `pos / title / artist`) for setlist Mode-scène (defined in setlist.jsx) — absent in the implementation. Single-song scene only.
- Auto-scroll + A+/A− zoom controls are present ✓, but in the wrong layout — they appear inside the AppShell instead of as the prototype's `.perf-bar { position: absolute; top: 16px; right: 16px; }` overlay.

### S4 — Setlist editor (`screens/setlist.jsx` lines 24-260)

- **Implementation renders form-row editor**, not the prototype's grid row. Each row in the implementation: `Title / Artist / [Tonalité override input] / [Capo input] / [Énergie input] / [Notes textarea] / ↑ ↓ × buttons`. The prototype's `.sl-row` (styles.css lines 312-336) is a 5-column grid `28px 36px 24px 1fr auto` with: position number (mono), an `.energy` gradient stripe, a drag `.handle`, the song title in `Instrument Serif italic 20px`, a submeta line (status + mastery + tonality), a member-chip `.lineup`, and an `e-slider` range knob. None of these structural affordances are present in the implementation.
- **No drag-reorder.** The prototype implements pointerdown/move/up reorder via `setEntries` (lines 51-87). The implementation provides arrow buttons. Drag handles are absent.
- **No transition-warning gutter.** The prototype renders an `.sl-warning-gutter` to the left of the list with circular orange marks (`.sl-warn-mark` styled with `var(--warn)` and a glow shadow) between rows where `badTransitions[k]` matches. The DOM walk of the implementation finds no such gutter, no warning circles.
- **No energy slider.** The prototype's per-row `input[type=range].rs.e-slider` is replaced by a plain text/number input.
- **Add-songs picker style.** Prototype shows song picker as a faceted list with status-chip + member lineup; implementation shows a bare `"+ Title"` button list.

### S5 — Sessions list (`screens/sessions.jsx`)

- **No timeline.** Prototype (`styles.css` lines 402-411) renders `.timeline { padding-left: 30px }` with a vertical line and circle markers per `.ts-item`. Implementation renders bare cards with date headers — no timeline rail, no concert/practice colour-coded dots. The spec's calls "concerts à venir et répétitions de préparation" map to a heading + two cards; the prototype's chronological rail affordance is absent.
- **No subtitle / no actions row.** Prototype's `ph` block includes a "Sessions" h1 with subtitle and a "Nouvelle session" accent button. Implementation has subtitle (FR i18n) but no new-session CTA in the page header.

### S6 — Session detail (`screens/sessions.jsx`)

- **Implementation renders an edit form for the concert details** (Lieu / Jauge / Matériel inputs + "Modifier les infos concert" button), then a "Setlist" heading with "Composer la setlist" CTA. The prototype's session detail is a two-column read-only layout with a "vue d'ensemble" header summarizing date + venue + capacity, a "Météo" / "Programme" card, "Setlist proposée" with energy stripe, lineup, and a final notes section.
- The H1 reads `"lun. 15 juin 2026"` (the date) — the prototype puts the date as a meta line and the venue as the h1. The two-column "lineup proposé" affordance with member chips per song is absent.

### S7 — Bars CRM (`screens/bars.jsx`)

- **List view** works at the structural level (table of bars with name / status badge / city / capacity / contact). The prototype's `.tbl` uses tiny-caps headers (`text: 500 10.5px var(--t-ui); letter-spacing: 0.14em; text-transform: uppercase`) — implementation uses Tailwind defaults. Minor styling miss.
- **Kanban view** is reachable via a "Kanban" toggle and renders 5 columns "Piste / Contacté / Réservé / Joué / Froid" each with one card ✓. But drag-drop is structural — confirmed kanban renders with the prototype's column shape but without any visible drop-zone hint styling (`.kanban-col.drop-active { background: var(--accent-soft); outline: 1.5px dashed var(--accent); }`). I did not exercise the DnD interaction.
- **Hint banner** "5 bars n'ont pas été relancés depuis +60 jours — un petit coup de fil ?" is present and uses the warning style. The prototype's banner style closely matches.
- **List ↔ Kanban toggle** is rendered as two plain `<button>Liste / Kanban</button>` buttons rather than a chip-style toggle. Functional but stylistically below the prototype's rigour.

### S9 — App shell (`shell.jsx`)

- **Missing "Setlist" nav item.** Prototype `NAV_ITEMS` (lines 3-8) has FOUR primary entries — `Catalogue, Sessions, Setlist, Bars` — each with a badge count. Implementation's `PRIMARY_NAV` in `AppShell.tsx` lines 31-35 has THREE — `Catalogue, Sessions, Bars`. The Setlist nav entry is entirely absent (setlist is accessed by drilling into a session). Verified by reading `<nav> a` hrefs in the DOM.
- **No badge counts on any nav item.** Prototype shows `<span class="badge">25</span>` etc. Implementation's `NAV_BADGES` constant (line 151) is empty `{}` with a comment "Placeholder counts mirror the prototype's static numbers. A future data-fetching pass can replace these"; the placeholder map is also empty so no count badges render.
- **No mobile-nav fallback.** Prototype ships a `MobileNav` component (lines 56-72) — a bottom-fixed nav with 5 entries for small viewports. At viewport 375x812 the implementation still shows the 232px-wide sidebar (verified `nav.getBoundingClientRect().width === 232`), no bottom-nav. The catalog page is unusable at iPhone width because the sidebar consumes ~62% of the viewport.
- **Offline banner** styling is roughly there (cream-amber pulse) ✓ but I could not toggle it without `navigator.onLine` emulation; visual not verified.

### S11 — Login (caveat)

- Login form is the prototype's editorial style (Instrument Serif `Pragma` h1, "BAND ERP" wordmark — but in i18n the wordmark is `ERP DU GROUPE`, ok), tracking-wide labels, accent button, dark-mode panel rendering. Page itself is well-realised. The caveat is that the panel renders in dark mode (see G4) regardless of OS preference, so the actual light-mode visuals were never confirmed.

### G4 — Dark/Light theme bug (root cause)

- `tokens.css` lines 74-90 declare the dark palette inside `@media (prefers-color-scheme: dark) { @theme { ... } }`. Tailwind v4's `@theme` directive emits a single `:root, :host { ... }` block at build time — when two `@theme` blocks are processed, the second simply overrides the first at the top of `:root`, regardless of the `@media` wrapper, because the compiler unwraps the inner `@theme` declarations and reattaches them to `:root` outside any media query. Verified by reading `Array.from(document.styleSheets).flatMap(...)`: only one rule sets `--color-bg` in the compiled stylesheet, and its value is `#16130f` (the dark swatch).
- Effect: every page renders with the dark palette regardless of OS / browser preference. Cream paper (`#f4efe6`) — the editorial signature the prototype's `:root` declares first — never reaches the user. This single bug invalidates the palette match across every screen.
- Fix path: declare dark variables under a different selector (e.g. `:root[data-theme="dark"]` like the prototype does at `styles.css` line 44, or `@media (prefers-color-scheme: dark) { :root { ... } }` outside `@theme`). The prototype's pattern (lines 44-58 of `styles.css`) is the canonical workaround.

## Section 3 — Non-regression sweep (round-3 PASS rows)

| Round-3 row | Re-check method | Outcome |
|---|---|---|
| Login form renders + serif treatment | Login screen capture, font-family probe | PASS (unchanged) |
| Auth happy path → `/catalog` | `fill@password / click@button → URL` | PASS |
| Catalog page lists songs | DOM query `a[href^=/catalog/]` length 10 (9 songs + new) | PASS |
| Sidebar nav links to /catalog /sessions /bars /members /instruments | DOM query `nav a` | PASS (but missing /setlist — was that present in round 3? Round-3 report did not flag — so this is a NEW regression introduced by the rework that dropped the Setlist nav entry) |
| Kanban view of bars | Toggle to Kanban, verify 5 columns | PASS |
| French i18n on first visit | `navigator.language=fr-FR` returns French copy | PASS |
| Members + Instruments admin pages | Captured, content matches | PASS |
| Mastery matrix renders 5×6 grid with row+column averages | DOM verified, members down, instruments across, "Moy. 9.0 9.0 8.5 6.7 7.0 7.0" footer | PASS |
| Dark-mode preference | Cannot verify light-mode rendering separately (the implementation is locked to dark, see G4) | regression — was PASS_EXCEPT_UNVERIFIABLE in round 3, now FAIL because the light-mode path is broken |
| Service-worker offline reads | Not re-tested (out of scope for this round) | UNCHANGED |

## Verdict: FAIL

Eight of eleven design-fidelity rows fail. The most damaging defects:

1. The whole app renders in dark-mode tokens regardless of OS preference (`@media` inside `@theme` collapses to a single override; cream paper is never shown).
2. Song detail and session detail are edit forms, not the prototype's read-only display layouts; the mastery-bar visualization and the lineup card are absent.
3. Setlist editor is form rows, not the prototype's draggable grid with energy stripes and transition-warning gutter.
4. Mode scène renders inside the AppShell instead of as a fullscreen takeover.
5. Sidebar drops the Setlist nav entry and all badge counts; no mobile-nav fallback at narrow viewports.
6. Field-mismatch between API (`chart`) and catalog page schema (`chordChart`) makes the chart-kind affordance always render as "pas d'accord" on every song card.

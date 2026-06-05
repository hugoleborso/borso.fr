---
status: failed
summary: |
  Round 4 (post-Tailwind/atomic rework) design-fidelity gate: FAIL.

  Per-screen tally — 11 rows scored: 2 PASS (admin/mastery matrix, energy
  primitives), 1 PASS-with-caveat (login), 8 FAIL (catalog, song detail,
  Mode scène, setlist, sessions list, session detail, bars, app shell).

  Typography match: yes (Instrument Serif on h1, Geist on body, JetBrains
  Mono on tags — confirmed via computed font-family on every page).

  Palette-depth match: no. Tokens are declared correctly in tokens.css,
  but Tailwind v4 `@theme` collapses the `@media (prefers-color-scheme:
  dark) { @theme { ... } }` block into a single `:root` declaration that
  ALWAYS emits the dark values. Every screen renders with bg `#16130f`
  even when the OS prefers light. The prototype's editorial cream
  (`#f4efe6`) never reaches the user. Root cause + fix path documented
  in the report (Section 1 G4) — move the dark overrides outside
  `@theme`, e.g. into `:root[data-theme="dark"]` or
  `@media ... { :root { ... } }`.

  Affordance parity per screen: catalog grid is structurally close but
  the chart-kind icon is broken by a schema/API field mismatch
  (`chordChart` vs `chart`) — every card reads "pas d'accord" regardless
  of the chart attached. Song detail + session detail render edit forms
  instead of the prototype's read-only display layouts (no mastery
  bars, no lineup cards, no "joué récemment"). Setlist editor is form
  rows with arrow buttons, not the prototype's draggable grid with
  energy stripes and warning gutter. Mode scène renders inside the
  AppShell instead of as the prototype's fullscreen takeover. App shell
  drops the Setlist nav entry, drops every badge count, drops the
  mobile-nav fallback (sidebar stays at 232px even at iPhone width).

  Non-regression: light-mode rendering — round 3 was
  PASS_EXCEPT_UNVERIFIABLE on this, now FAIL because the dark-only
  emission means light-mode is unreachable. Sidebar lost the /setlist
  entry that round 3 implicitly recorded as present.

  Full evidence: 13 screenshots under
  screenshots-2026-05-20-1350/comparisons/ — all from the implementation.
  Prototype could not render (sandbox has no outbound TLS, unpkg CDN
  unreachable); per the design-bundle README the .jsx + styles.css are
  the authoritative source of truth and are quoted verbatim in each
  FAIL row.
artifacts:
  - docs/features/pragma/first-features/validation/visual-validation-2026-05-20-1350.md
  - docs/features/pragma/first-features/validation/screenshots-2026-05-20-1350/
next:
  kind: replan
  scope: design-fidelity-rework-incomplete
---

## Detail

See [`../../validation/visual-validation-2026-05-20-1350.md`](../../validation/visual-validation-2026-05-20-1350.md) for the row-by-row report. Evidence under [`../../validation/screenshots-2026-05-20-1350/comparisons/`](../../validation/screenshots-2026-05-20-1350/comparisons/).

### Top six fixes (priority order)

1. **`tokens.css` palette bug** — Tailwind v4 collapses `@media + @theme` into a single dark-only emission. Move the dark variables out of `@theme` and into a plain `:root[data-theme="dark"]` selector (matches the prototype's `styles.css` line 44 pattern) or a `@media (prefers-color-scheme: dark) { :root { ... } }` outside `@theme`. Without this fix every other visual check is moot — the user never sees cream paper.
2. **Song detail page** — split the current `SongDetailPage` into a read-only display (matches `screens/catalog.jsx` lines 141-260: chord-chart preview card, external links card, lineup card with `MemberChip` rows, mastery card with 10-bar gradient per member, "Joué récemment" card) and a separate `/edit` route for the form.
3. **Session detail page** — analogous read-only display layout per `screens/sessions.jsx`.
4. **Setlist editor** — rebuild on `screens/setlist.jsx`'s grid: position number column, energy gradient stripe, drag handle, italic song title, submeta line, member chip lineup, energy slider. Wire pointer-drag reorder. Add the transition-warning gutter (orange `.sl-warn-mark` circles on the left, linked to bad-transition data).
5. **API/catalog field mismatch** — the API returns `chart` but `CatalogPage.tsx` schema reads `chordChart`. Fix the schema (or the API DTO) so the chart-kind icon renders on song cards.
6. **App shell** — add the missing `/setlist` nav entry (prototype's `NAV_ITEMS` has four primary items, not three), wire live counts into the badge map (data-fetching pass that round 5 deferred), and add a `MobileNav` fallback at narrow viewports (the prototype's bottom-fixed nav with 5 entries).

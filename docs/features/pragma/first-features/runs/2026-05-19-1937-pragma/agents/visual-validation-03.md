---
status: done
summary: |
  Round 3 full-spec re-validation: 23 assertion rows total — 21 PASS,
  0 FAIL, 2 UNVERIFIABLE (i18n default FR + i18n runtime switcher, both
  unchanged from round 2). The 5 spotlight FAIL rows from round 2 (V1
  chord chart + Mode Scène, V2 concert detail, V3 practice→concert
  linkage, V4 stale-bar banner, V5 catalog cards) and the 1 visible
  deviation (VD member chip palette) all PASS in round 3. The 18
  round-2 PASS rows show zero regression: auth gate, rate-limit,
  sidebar, instruments CRUD, members CRUD, mastery matrix on /members
  (with live row/column averages), sessions list with concert ♪ +
  practice ⟳ icons, setlist editor (drag handle ⋮⋮ ships per A18, ↑/↓
  preserved), transition warning + comment modal, sparkline, bars CRM
  + kanban + DnD with stale-bar accent, PWA SW scoped to
  /api/offline-manifest URLs (code review), external links rendered as
  iframes for known providers + <a> fallback for unknown (A13/D21),
  dark mode, mobile 375 px. Verdict path:
  docs/features/pragma/first-features/validation/visual-validation-2026-05-20-1035.md
artifacts:
  - docs/features/pragma/first-features/validation/visual-validation-2026-05-20-1035.md
  - docs/features/pragma/first-features/validation/screenshots-2026-05-20-1035/
next:
  kind: ship
---

## Detail

Final verdict: **PASS_EXCEPT_UNVERIFIABLE** (mergeable with disclosure
of the two i18n UNVERIFIABLE rows in the PR description).

### Spotlight closures

- V1 ✓ Chord chart viewer + Mode Scène — inline preview + `/catalog/:id/scene` route with transpose + zoom; transposer arithmetic verified (Cm→Dm at +2, F→G, Em7→F#m7).
- V2 ✓ Concert detail — Edit form with VENUE / CAPACITY / GEAR + per-member friends-count grid with running total.
- V3 ✓ Practice → concert linkage — PREPARED CONCERT selector populated with future concerts; visible "Preparing the concert of …" link after selection.
- V4 ✓ Stale-bar banner — "N bars haven't been touched in 60+ days — give them a poke." at top; Stale badges per row + `.bars-kanban-card--stale` modifier on kanban cards.
- V5 ✓ Catalog cards — energy badge `E <n>` + mastery aggregate `M <n|—>` both rendered.
- VD ✓ Member chip palette — 5 distinct hues (coral/teal/mustard/plum/sage) auto-assigned on member create.

### Persistent UNVERIFIABLE (carried from round 2)

- i18n default FR (no `?lang=` switcher, navigator.language=en-US can't be overridden from the agent).
- i18n runtime switcher (no UI toggle, no exposed handle).

Both are spec/tooling gaps, not implementation defects. A small follow-up PR adding `?lang=fr` or exposing `window.__pragmaI18n` in dev would close both permanently.

### Booting note

The round-2 kaizen bug (`pnpm dev` exits because `dev:db` returns
immediately and `concurrently -k` kills the api + site) is still open
in this round. Worked around by starting the local postgres, then api,
then site individually. One-line fix in `apps/pragma/package.json`.

### Evidence

23 screenshots under
`docs/features/pragma/first-features/validation/screenshots-2026-05-20-1035/`.
Pixel-content (broken-image) scan returned empty on every shot — the
app uses CSS / SVG / Unicode glyphs throughout.

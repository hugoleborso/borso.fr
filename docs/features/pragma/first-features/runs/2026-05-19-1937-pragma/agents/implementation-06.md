---
status: done
summary: |
  Round 6 — design-fidelity fix. Closes all eight blockers from
  visual-validation-2026-05-20-1350.md plus the dark-mode regression
  (blocker 0).

  Commit 1 (dd6c434) — fix tokens.css: dark `@theme` is unwrapped
  by Tailwind v4 into the same `:root`, so the cream-paper palette
  never reached the user. Moved dark overrides to `:root` inside
  the media query, outside `@theme`.

  Commit 2 (5046d02) — close blocker 1: API returns chord-chart
  variant under `chart`, CatalogPage read `chordChart`. Renamed +
  routed through `extractChartKind` utility at 100% coverage (5
  tests).

  Commit 3 (155bc1c) — close blockers 5, 6, 7. AppShell now has the
  prototype's four primary entries (catalog/sessions/setlists/bars),
  badge counts via new `useNavBadges` hook (fail-silent), and a
  `<lg` slide-over panel for mobile. /catalog/:songId/scene is
  hoisted out of AppShell so Mode Scène renders as a fullscreen
  takeover; ESC closes it. New `menu` + `close` icons added.

  Commit 4 (0a7168b) — close blocker 2. /catalog/:songId is now the
  read-only display (status chip, chart-kind badge, font-display
  title, chord-chart preview, oEmbed iframes, lineup card, ten-bar
  mastery viz). Edit form moved to /catalog/:songId/edit and
  renamed SongEditPage. /catalog/new still works as create.

  Commit 5 (a555a4c) — close blocker 3. SessionDetailPage now leads
  with the venue in the H1, surfaces friends-per-member as
  horizontal bars in the member's hue (prototype affordance), and
  reads as a display. Edit button opens the existing
  ConcertEditForm in place. ConcertReadView + PracticeReadView
  extracted as siblings to keep the page under the line cap.

  Commit 6 (72a3d7f) — close blocker 4. Setlist entry row is now
  display-led (position, drag handle, font-display title, submeta
  with artist/tonality/mastery/lineup, energy slider, more toggle
  for key/capo/notes). Up/down arrows removed — drag-only. Side
  gutter to the left of the list renders circular orange warning
  markers between consecutive entries; clicking opens the existing
  TransitionCommentModal. Pure helpers extracted into
  setlist-editor.utils.ts at 100% coverage (11 tests).

  Tests: 273 passing (was 257 at the start of the round) — 16 new
  unit tests across two new pure-utility modules. Lint, typecheck,
  knip clean. Final SHA: 72a3d7f.

  Files touched: 17 (5 new). No spec / plan / ADR / design-bundle
  changes.
artifacts:
  - apps/pragma/site/src/styles/tokens.css
  - apps/pragma/site/src/App.tsx
  - apps/pragma/site/src/components/atoms/Icon.tsx
  - apps/pragma/site/src/components/organisms/AppShell.tsx
  - apps/pragma/site/src/components/organisms/useNavBadges.ts
  - apps/pragma/site/src/i18n/en.json
  - apps/pragma/site/src/i18n/fr.json
  - apps/pragma/site/src/routes/catalog/CatalogPage.tsx
  - apps/pragma/site/src/routes/catalog/SongDetailPage.tsx
  - apps/pragma/site/src/routes/catalog/SongEditPage.tsx
  - apps/pragma/site/src/routes/catalog/SongScenePage.tsx
  - apps/pragma/site/src/routes/catalog/chart-kind.utils.ts
  - apps/pragma/site/src/routes/catalog/chart-kind.utils.test.ts
  - apps/pragma/site/src/routes/sessions/SessionDetailPage.tsx
  - apps/pragma/site/src/routes/sessions/ConcertReadView.tsx
  - apps/pragma/site/src/routes/sessions/PracticeReadView.tsx
  - apps/pragma/site/src/routes/setlists/SetlistsPage.tsx
  - apps/pragma/site/src/routes/setlists/SetlistEditor.tsx
  - apps/pragma/site/src/routes/setlists/SetlistEntryRow.tsx
  - apps/pragma/site/src/routes/setlists/setlist-editor.utils.ts
  - apps/pragma/site/src/routes/setlists/setlist-editor.utils.test.ts
partialDeferrals: []
next:
  kind: validate
---

# Kaizen seeds

- **Tailwind v4 `@theme` semantics are non-obvious.** Tailwind v4 collapses every `@theme` block into a single `:root` declaration regardless of any wrapping `@media`. The natural-feeling pattern `@media (prefers-color-scheme: dark) { @theme { ... } }` silently degrades to "dark always wins". Knowledge entry worth writing: `docs/knowledge/tailwind-v4-dark-mode-pattern.md` — Symptom (cream paper never renders), Cause (Tailwind unwrap behaviour), Fix (`:root` overrides inside `@media`, outside `@theme`). Cheap to write, would have saved this whole round if it had existed.
- **Field-name drift between Zod schemas at the API and at the frontend is silent.** The frontend's Zod parser accepted the `chordChart` key as `undefined` because the field was marked `.optional()`; every card collapsed to the "no chart" fallback without throwing. A linter rule or convention that the frontend's `songSchema` field names must match the API's, or a shared schema package re-exported from the API workspace, would catch this at typecheck time. Worth exploring in a follow-up dantotsu.
- **The "useEffect is a smell" rule needs reinforcement for the location-watching pattern.** The `useEffect(() => { setMobileNavOpen(false); }, [location.pathname])` pattern is a common React anti-pattern (closing a drawer on route change) — the correct shape is to attach the close handler to the link's `onClick`. Worth adding an explicit example to CLAUDE.md or a `useEffect-smells.md` knowledge entry.
- **The biome `noExcessiveLinesPerFile` rule (default 300 lines) bit twice this round.** Both `SessionDetailPage.tsx` and `SetlistEditor.tsx` overflowed during the round-6 rewrite and had to be split into siblings mid-implementation. The split improved separation of concerns both times, so the rule earns its keep — but the cost of finding out at lint time is a context-switch. Worth a kaizen note: when starting a non-trivial route page, plan for 2-3 sibling files upfront rather than letting the cap force the split.

# Friction patterns

- **Visual-validation reports are precise but their evidence model leaves ambiguity.** The round-5 FAIL report referenced "the implementation's SongCard.tsx renders five letter-only avatars" with the implication that they were degraded — but the captured DOM string was `E7M9.4ECHAG`, which is actually the legitimate concatenation of seven distinct avatar circles' inner text. A separate "screenshot evidence" file per row, captured at component scope, would disambiguate "this looks wrong" vs "this is functional but visually off-prototype". Not blocking this round, but worth noting for the visual-validation skill iteration.
- **The prototype's design-bundle is treated as a visual contract, but the implementation also needs an interaction contract.** The prototype's `SetlistEditor` uses pointer-based drag with custom positioning logic and a `ResizeObserver`-driven gutter; the implementation uses HTML5 drag-and-drop with index-based positioning. Both are functionally correct, but the visual validator can only pattern-match against the visible affordance — and the prototype's affordance involves pointer events. The implementation's HTML5 drag still satisfies the spec ("drag handle is the primary affordance"), but the validator might flag the missing pointer behaviour as a structural difference. Worth clarifying in the visual-validation rubric: structural-vs-behavioural fidelity has different bars.

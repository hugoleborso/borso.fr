---
status: done
summary: |
  Round 5 — visual rework — landed. The pragma site now has a
  Tailwind v4 styling system (no per-component CSS files beyond a
  single tokens.css bridging the design bundle's CSS variables to
  Tailwind's `@theme` directive), and a strict atomic-design folder
  layout: 8 atoms (Avatar, Badge, Button, Card, Chip, Crumb, Icon,
  Input) + 2 sibling `*.utils.ts` (cn, member-palette), 10 molecules
  (ChartKindIcon, EnergyBadge, EnergySparkline, FilterPillGroup,
  MasteryBadge, MemberChip, MemberLineup, OfflineBanner, PageHeader,
  SearchBar, StatusChip) + 1 sibling `*.utils.ts`
  (energy-sparkline), 6 organisms (AppShell, CatalogGrid,
  ChordChartViewer, MasteryMatrix, RequireSession, SongCard).

  Screens rewritten: AppShell (sidebar wordmark + nav sections),
  Login (centred Card with editorial wordmark), Catalog (PageHeader
  + SearchBar + FilterPillGroup + CatalogGrid of SongCards with
  StatusChip + ChartKindIcon + EnergyBadge + MasteryBadge +
  MemberLineup), SongDetail (Card-wrapped ChordPro preview + external
  links + edit form), SongScene (fullscreen black overlay with
  translucent controls + ChordChartViewer), Sessions (timeline
  rail with accent/ink dots), SessionDetail (concert vs practice
  Cards), Setlist (sparkline Card + entry rows with grid layout +
  warn-toned transition button + modal), TransitionCommentModal,
  Bars (segmented list/kanban view toggle, stale banner, kanban
  columns), Instruments + Members admin pages (Card-wrapped forms).

  Deps added: tailwindcss@4, @tailwindcss/vite, clsx,
  class-variance-authority, @fontsource/instrument-serif,
  @fontsource-variable/geist, @fontsource-variable/jetbrains-mono.
  Biome config opt-in to `tailwindDirectives` so the `@theme` block
  in `tokens.css` parses cleanly.

  Tests: 263 → 257 (replaced the local sparkline.utils + its 6
  tests with the molecule-owned `energy-sparkline.utils` and its 5
  tests). 100% coverage holds on every `*.utils.ts`. New utility
  tests cover `cn` (5), `member-palette` (8), and `energy-sparkline`
  (5).

  i18n catalogues expanded with the editorial copy from the design
  bundle (subtitle plurals, filter pill labels, offline banner copy,
  app wordmark, administration section title, no-chart hint). FR/EN
  parity gate stays green.

  Pre-flight: typecheck clean, biome lint clean, vitest core green,
  `pnpm exec knip` flags only a pre-existing `@borso/infra`
  configuration hint, `pnpm --filter @borso-app/pragma build`
  succeeds (33 kB CSS, 437 kB JS, 19 woff/woff2 bundled).

  Final SHA: ebf2a3d. 5 commits this round, all conventional with
  scope `pragma`.

  Caveat: the rework is structural, not pixel-perfect. The
  prototype's most distinctive flourishes — the editorial sidebar
  with badge counts on every nav item, the warning gutter for setlist
  transitions, the chord-chart "Mode scène" pill carousel, the
  per-status kanban-column accent line, the inline lineup hover with
  instrument labels — were not ported. The accent is Hugo's blue
  override (#2d5fa0), not the prototype's amber. Visual validation
  in round 6 will surface the remaining gaps.

artifacts:
  - apps/pragma/site/src/components/atoms/
  - apps/pragma/site/src/components/molecules/
  - apps/pragma/site/src/components/organisms/
  - apps/pragma/site/src/styles/tokens.css
  - apps/pragma/site/src/routes/
  - apps/pragma/vite.config.ts
  - apps/pragma/package.json
  - biome.jsonc
  - knip.json
partialDeferrals: []
next:
  kind: validate
---

## Kaizen seeds

- **`/tailwind-v4-setup` skill** would have shortened the round
  by ~20 minutes: deps + `@tailwindcss/vite` wiring + Biome's
  `tailwindDirectives` flip + `@theme` block scaffolding +
  `tokens.css` import in `main.tsx` are mechanical and the same
  shape for every site we'll add. Worth codifying once a second app
  ships Tailwind v4.

- **`/atomic-design-rules` skill** would have removed several
  back-and-forth moves (e.g. RequireSession was first dropped under
  `components/`, then moved to `organisms/`; ChordChartViewer
  similarly). A skill that names the bucket up front based on
  "owns React state? → organism" / "composes 2+ atoms? → molecule"
  would prevent the re-move.

- **Friction pattern — `noUncheckedIndexedAccess` + ts strict + cva
  variant tables**: every `regexp.exec(s)[1]` and every
  `array[index - 1]` in a loop body triggers TS18048 even when the
  surrounding logic guarantees presence. Worth a CLAUDE.md note +
  maybe a small `nonNull(value, msg)` helper under `lib/` so the
  guard is one line and the intent is clear.

- **Friction pattern — Biome's CSS parser silently rejects Tailwind
  v4 syntax by default**: lost ~5 minutes hunting for the right
  config key. Worth a Dantotsu entry under `docs/dantotsus/` once
  the kaizen sweep runs: the symptom is `× Tailwind-specific syntax
  is disabled`, the fix is the `css.parser.tailwindDirectives: true`
  flip.

- **Knip + CSS-only imports**: knip's static analyser doesn't see
  `@import 'tailwindcss';` in a `.css` file, so the dependency is
  unused-by-graph. The current workaround (ignoreDependencies)
  is fine but it means a Tailwind major upgrade won't be flagged
  by knip in the future. Worth a knowledge-base entry.

- **Visual-validation will likely fail on first pass**: the
  structural rewrite covers the affordances but not the editorial
  flourishes (nav badges, warning gutter, member palette luminance
  tuning, kanban column accent lines, mobile mode). Round 6 of
  `/implementation` should expect a follow-up pass on those — and
  the gap list is short enough that a second visual-validator run
  after the follow-up should pass.

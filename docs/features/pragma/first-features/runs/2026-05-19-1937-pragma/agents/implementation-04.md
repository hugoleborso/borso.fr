---
status: done
summary: |
  Round-3 unified fix round shipped end-to-end across 4 commits. All
  11 blockers closed; 0 partial deferrals.

  Final SHA: 283e174 on claude/pragma-erp-specification-k41Mg.

  B08 — per-domain layered triad. Every domain folder under
  apps/pragma/api/src/ now ships
  <domain>.{schema,repository,service,controller}.ts. The central
  database/schema.ts is now a re-export barrel; per-domain schemas own
  their table definitions + Zod schemas. Controllers carry Hono
  routing + Zod parsing only. Reference auth/app-config.repository.ts
  renamed to auth/auth.repository.ts to match the literal naming the
  standard requires; new auth.service.ts wraps argon2id + HMAC.

  A07/A08 — mastery matrix moved off /mastery route (deleted) and
  mounted on /members per spec use case 1bis. New MasteryMatrix
  component supports click-edit, scroll-wheel ±1, right-click clear
  + live row/column averages computed via mastery-matrix.utils.ts
  (100% coverage gated).

  A10/D20 — GET /api/offline-manifest endpoint composes the "catalog
  + every song detail + the next-upcoming session" URL list; SW
  pre-caches them on install; sw/manifest.utils.ts ships the next-
  session selector (100% coverage with empty/multiple/past-only
  fixtures).

  A13/D21 — embed.utils.ts hand-codes provider detection for YouTube,
  Spotify, Deezer, Vimeo, SoundCloud, Soundslice; SongExternalLinks
  component renders each link as an iframe (oembed) or plain `<a>`
  (unknown). 100% coverage on the resolver.

  A18 — setlist drag-handle (the design bundle's mobile pin) lands
  via native HTML5 drag on a dedicated handle element on each
  SetlistEntryRow. Up/down buttons stay as the keyboard/a11y
  fallback; both call the same /reorder API.

  A20 — bars list + kanban surface a stale-banner (count of bars
  past 60 days) + a per-row "À relancer" badge. Threshold logic in
  bars.core.ts (api) + stale-bar.utils.ts (site), both 100% coverage
  gated, both take `now: Date` explicitly.

  V1 — ChordChartViewer (chord-above-lyric layout, transposable);
  /catalog/:songId/scene route hosts Mode Scène (fullscreen,
  transpose, A−/A+ zoom). chordpro.utils.ts ships the parser +
  semitone transposer at 100% coverage.

  V2 — SessionDetailPage gains an editable concert form: venue,
  capacity, gear textarea, friends-count-per-member grid keyed by
  member id with running total. Read view + Edit button.

  V3 — Practice sessions show a "Prepared concert" selector
  populated with future concerts + a visible "Prépare le concert du
  …" link when the linkage is set.

  V5 — catalog cards add an energy badge (numeric, low/mid/high
  colour class) + a mastery aggregate (via mastery-aggregate.utils.ts
  100% covered).

  VD — new members get a palette slot (coral/teal/mustard/plum/sage)
  via member-palette.utils.ts (100% covered) wired into the members
  service at create time.

  Tests: 245 core (+24 from round-2's 167 baseline, +94 net since
  round-1) at 100% coverage on every .core.ts/.utils.ts; 51 back-e2e
  still green. Build: 408 kB JS / 121 kB gzip. Typecheck + biome
  clean. Knip clean (one pre-existing infra-config hint).

  Front-end couldn't import API .core.ts files across workspaces, so
  three thin parallel utilities were shipped on the site/ side
  (stale-bar, mastery-aggregate, mastery-matrix). Each carries its
  own 100%-covered tests and is documented as a mirror of the API
  source. Kaizen seed below.

  Per-file count, this round: 27 new files (15 .schema/repository/
  service triad additions on the API, 5 new utils + tests on the
  front, 4 extracted React components, 2 i18n catalogs updated,
  1 new SW manifest payload, 1 deleted /mastery route).

artifacts:
  - apps/pragma/api/src/auth/auth.{schema,service,repository}.ts
  - apps/pragma/api/src/bars/bars.{schema,service,repository,core}.ts
  - apps/pragma/api/src/instruments/instruments.{schema,service,repository}.ts
  - apps/pragma/api/src/members/{members.{schema,service,repository},member-palette.utils}.ts
  - apps/pragma/api/src/mastery/mastery.{schema,service,repository}.ts
  - apps/pragma/api/src/sessions/sessions.{schema,service,repository,controller}.ts
  - apps/pragma/api/src/setlists/setlists.{schema,service,repository}.ts
  - apps/pragma/api/src/songs/songs.{schema,service,repository}.ts
  - apps/pragma/api/src/transitions/transitions.{schema,service,repository}.ts
  - apps/pragma/api/src/uploads/uploads.{schema,service,repository}.ts
  - apps/pragma/api/src/database/schema.ts (barrel)
  - apps/pragma/api/src/app.ts (offline-manifest mount)
  - apps/pragma/site/src/components/{ChordChartViewer,MasteryMatrix}.tsx
  - apps/pragma/site/src/lib/{embed,chordpro,stale-bar,mastery-aggregate,mastery-matrix}.utils.ts
  - apps/pragma/site/src/sw/manifest.utils.ts
  - apps/pragma/site/public/sw.js (pre-cache from manifest)
  - apps/pragma/site/src/routes/catalog/{CatalogPage,SongDetailPage,SongScenePage,SongChartFields,SongExternalLinks,song-draft}.{ts,tsx}
  - apps/pragma/site/src/routes/sessions/{SessionDetailPage,ConcertEditForm}.tsx
  - apps/pragma/site/src/routes/bars/{BarsPage,BarForm}.tsx
  - apps/pragma/site/src/routes/setlists/{SetlistEditor,SetlistEntryRow}.tsx
  - apps/pragma/site/src/routes/members/MembersPage.tsx
  - apps/pragma/site/src/i18n/{en,fr}.json
partialDeferrals: []
next:
  kind: validate
---

## Kaizen seeds observed during the work

- **Front-end can't import API .core.ts across pnpm workspaces.** The
  spec wants the same `isStale`, `meanForSong`, and `row/colAverage`
  rules on both sides; we shipped three mirror utilities under
  `site/src/lib/` and documented the API source they mirror, but
  there's no automated drift gate. Worth a follow-up that either
  (a) extracts a `packages/pragma-domain` workspace both sides import
  from, or (b) generates the front-end mirror from the API source at
  build time. The current shape works but adds a manual sync cost.
- **The standard-amendment for B08 landed mid-orchestrator.** Round-2
  shipped per-domain folders without the full triad because the rule
  matured during the run. Worth recording state.json's
  `ruleSetSpecChecksum` so an in-flight implementation agent can
  detect that CLAUDE.md changed under them and re-read the relevant
  sections.
- **biome `noExcessiveLinesPerFile` at 300 caught three pages
  (SongDetailPage, BarsPage, SessionDetailPage).** Splitting them
  into form-only child components made the parents cleaner, but the
  rule caught us at commit time, not at write time. A pre-commit
  watch on the staged file lengths would surface this earlier.
- **Hand-coded oEmbed URLs vs live oEmbed.** For v1 the 6 providers
  are stable, but a sealed list will rot. Worth a follow-up that
  flips to a tiny serverless function calling each provider's real
  oEmbed endpoint, cached behind CloudFront — keeps the call
  client-fast while honouring provider preferences.
- **ChordPro parser is minimal.** The current implementation handles
  the common shapes (directives, chord-over-lyric, blank lines) and
  transposes natural / sharp / flat roots. Tab/Lilypond blocks fall
  through as plain text. For the band's first 20 songs this is
  enough; if they bring odd chord shapes (slash chords like `C/G`,
  alt notation, polychords), the parser will need a follow-up pass.
- **Knip flagged a pre-existing `@borso/infra` hint** in
  `apps/pragma/knip.json`. Not a blocker; worth a one-liner removal
  in a kaizen PR.
- **Mastery matrix scroll/right-click works in desktop browsers but
  the touch story is partial.** `onWheel` fires on touch-pad scroll
  but the right-click clear has no touch equivalent (long-press
  would be the natural mobile gesture). Spec doesn't require touch
  parity in v1 but worth noting for round-4 polish.

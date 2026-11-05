---
status: done
summary: |
  Slice 5 shipped. A gated route now mounts inert and hidden beneath an opening screen
  while no band query holds data, so the session probe joins the route's first read batch
  on every gated route (measured). The wait ends when band data lands. When nothing is in
  flight and a read failed or paused offline, the screen shows the failure, an offline note
  and a "Try again" that sent one POST /api/read-batch in a real phone tap (measured). The
  loader is the pragma mark traced to SVG in four groups, playing "the downbeat" (key
  arpeggio, notes swinging 8 degrees on the third key, 90 ms echo, halo), still under
  reduced motion. A warm open never shows the mark (measured with a MutationObserver).
  Every gate passes. Peak in flight is at most 2 on all 36 measured opens. Seven rows send
  one request more than the spec's inferred count bound (cold /, /catalog/:songId,
  /sessions/:id/audience, /sessions/:id/setlist, /setlists/:id/audience at 5 or 4 against
  4 or 3, warm /setlists/:id/order and /oauth/consent at 2 against 1). The causes are
  dependent waves in separate tasks and two deliberate refetches, none in slice 5's code.
  Accepting those counts or changing the closer is a spec decision for the orchestrator.
artifacts:
  - apps/pragma/site/src/components/organisms/session-gate.core.ts
  - apps/pragma/site/src/components/organisms/session-gate.core.test.ts
  - apps/pragma/site/src/components/organisms/opening-wait.hook.ts
  - apps/pragma/site/src/components/organisms/RequireSession.tsx
  - apps/pragma/site/src/components/organisms/RequireSession.test.tsx
  - apps/pragma/site/src/components/organisms/OpeningScreen.tsx
  - apps/pragma/site/src/components/organisms/OpeningScreen.test.tsx
  - apps/pragma/site/src/components/atoms/PragmaMark.tsx
  - apps/pragma/site/src/styles/tokens.css
  - apps/pragma/site/src/i18n/en.json
  - apps/pragma/site/src/i18n/fr.json
  - apps/pragma/site/src/lib/query-client.setup.ts
  - apps/pragma/VOCABULARY.md
  - docs/features/pragma/open-in-two-calls/runs/2026-11-05-0410-ttc/agents/implementation-05.md
next:
  kind: validate
---

# Implementation 05, slice 5 (the opening screen)

## Goal, smallest change, shape

- Goal. One pragma client never has more than 2 read requests in flight, and a cold open
  waits for its first batch behind the pragma mark.
- Smallest change. The gate reads the whole query cache through `useSyncExternalStore`
  and mounts the route beneath an overlay, so the probe and the route's reads share a
  group. No query module changed.
- Shape. Two pure decisions in `session-gate.core.ts`. `selectOpeningWait(queries)` gives
  `band-data | reading | failed | not-started`. `selectSessionGateState(hasMarker,
  isProbeAuthenticated, openingWait)` gives `sign-in-required | opening | opening-failed |
  granted`. A third, `selectOpeningOverlay(gateState, isRestoring, hasOpened, hasLeft)`,
  gives `restoring | opening | opening-failed | leaving | null`.

## Where the code differs from the plan, and why

- `selectOpeningOverlay` and a `restoring` phase were added. The persisted cache restores
  after the first render. Without it a warm open showed the overlay for a frame and then
  played the 200 ms exit over a filled screen. During the restore the overlay is plain
  paper with its content `hidden`. Measured warm phases: `restoring`, then none. Cold:
  `restoring`, `opening`, `leaving`, none.
- The exit plays only if the mark was seen moving. `onAnimationStart` on the overlay sets
  `hasOpened`. `onAnimationEnd` sets `hasLeft` to `isOpeningExit(animationName)`, so an
  entrance ending inside the overlay never cuts the exit short. Both are handlers, no
  effect. Under reduced motion no animation starts, so the overlay leaves at once.
- `isBandDataQuery` compares the key's first element with `AUTH_QUERY_ROOT = 'auth'`.
  `auth.queries.ts` keeps its literal `['auth']`, because `query-key-roots.test.ts` reads
  key roots from the source text. `RequireSession.test.tsx` asserts the two agree.
- `RequireSession` returns one element per gate state, and the three route states share
  the `GatedRoute` type, so the route is mounted once across `opening` and `granted`. The
  old inline view functions would have remounted the route on every render.
- The route wrapper is `contents`, plus `invisible` and `inert` while opening, so no
  layout changes when it is revealed.
- The downbeat tokens live in `@theme inline`. In `@theme static` a token that reads
  `var(--downbeat-key-offset)` resolves it at `:root`, and every key pressed at once
  (measured with `getComputedStyle`, all delays 0.5 s). Inline, the delays read 0.5, 0.62
  and 0.74 s, and the echo 0.09 s.
- The trace. Pillow and numpy, marching squares on a 0.8 px blurred darkness field,
  Douglas-Peucker at 1.0, Catmull-Rom curves with clamped handles and kept corners. The
  echo is each note's silhouette shifted by the offset that best fits the pale layer,
  (-13, 17) and (16, 18). The key caps are drawn by hand from measured columns, because a
  cut through the traced field left spikes. The script stays in the scratchpad. No
  dependency was added. Side by side with the PNG in `trace/compare.png`.
- `downbeat-caption` (the caption fades in after 300 ms) is one keyframe beyond the plan's
  list, so a restore frame never flashes text.

## The animation, the downbeat

Only `transform` and `opacity` animate. Entrance 500 ms with `cubic-bezier(0.16, 1, 0.3,
1)`: the notes slide in from 120 user units (about 23 px at 9 rem), the keys rise 60 ms
apart. Loop 1.6 s: the keys dip 20 units (about 4 px) and deepen to `accent-strong` at
0, 120 and 240 ms. On the third key both notes swing 8 degrees toward the centre around
their heads, overshoot to 2.5 and 1 degree and settle, while the halo swells from 0.9 to
1.1 and peaks at 0.35 opacity once per loop. The echo follows 90 ms late. Exit 200 ms,
scale 1.08 and fade. The failure stills the loop and keeps the mark. Every group carries
`motion-reduce:animate-none`, and every keyframe ends at rest. The impeccable detector
reported no finding on the three UI files.

## Acceptance, gate 5.4

Measured against `pnpm dev`, signed in as Hugo, at 375 px. Cold removes
`pragma.query-cache` and opens the route. Warm reloads it at once. Each count was read
after 3 s with no new resource entry, with the plan's snippet. The browser launched with
the resource timing buffer raised. The requests column comes from a fetch recorder.

| Route | Cold (bound) | Cold peak | Warm (bound) | Warm peak |
| --- | --- | --- | --- | --- |
| `/` | **4 (3)** | 2 | 1 (1) | 1 |
| `/catalog` | 4 (4) | 1 | 1 (1) | 1 |
| `/catalog/new` | 4 (4) | 1 | 1 (1) | 1 |
| `/catalog/add` | 4 (4) | 1 | 1 (1) | 1 |
| `/catalog/:songId` | **5 (4)** | 2 | 1 (1) | 1 |
| `/catalog/:songId/edit` | 4 (4) | 1 | 1 (1) | 1 |
| `/sessions` | 4 (4) | 1 | 1 (1) | 1 |
| `/sessions/slots` | 4 (4) | 1 | 1 (1) | 1 |
| `/sessions/:sessionId` | 3 (4) | 1 | 1 (1) | 1 |
| `/sessions/:sessionId/practice` | 3 (4) | 2 | 1 (1) | 1 |
| `/sessions/:sessionId/audience` | **5 (4)** | 2 | 1 (1) | 1 |
| `/sessions/:sessionId/setlist` | **5 (4)** | 1 | 1 (1) | 1 |
| `/setlists` | 4 (4) | 1 | 1 (1) | 1 |
| `/setlists/:setlistId` | 4 (4) | 2 | 1 (1) | 1 |
| `/setlists/:setlistId/order` | 3 (4) | 1 | **2 (1)** | 1 |
| `/setlists/:setlistId/vote` | 4 (4) | 1 | 1 (1) | 1 |
| `/setlists/:setlistId/audience` | **5 (4)** | 1 | 1 (1) | 1 |
| `/tasks` | 4 (4) | 2 | 1 (1) | 1 |
| `/band` | 4 (4) | 1 | 1 (1) | 1 |
| `/compos` | 4 (4) | 1 | 1 (1) | 1 |
| `/members` | 4 (4) | 1 | 1 (1) | 1 |
| `/instruments` | 4 (4) | 1 | 1 (1) | 1 |
| `/bars` | 4 (4) | 1 | 1 (1) | 1 |
| `/improvements` | 4 (4) | 1 | 1 (1) | 1 |
| `/account` | 4 (4) | 1 | 1 (1) | 1 |
| `/oauth/consent` | 4 (4) | 1 | **2 (1)** | 1 |
| `/catalog/:songId/scene` | 4 (4) | 1 | 1 (1) | 1 |
| `/setlists/:setlistId/scene` | 3 (4) | 1 | 1 (1) | 1 |
| `/vote`, signed out | 0 (2) | 0 | 0 (2) | 0 |
| `/vote/:sessionId`, signed out | 2 (2) | 1 | 0 (2) | 0 |

The hidden-tab row needs the PR preview, as the plan says. Not measured here.

- Peak. At most 2 on every open (measured). This is the goal, and it holds.
- The probe. On every gated cold open it rides the first batch, for example
  `POST /api/read-batch [/api/sessions, /api/me, /api/songs, /api/instruments, ...]` on `/`
  (measured). Slice 4 sent it alone first.
- Rows above the count bound, with their cause (measured from the request order):
  - `/` cold. The realtime ticket fires synchronously when the probe answers. The next
    session wave fires 16 ms later in another task, after the sessions list lands. So the
    ticket leaves alone. On `/catalog` the ticket shares a batch with the preload's lists.
  - `/catalog/:songId`, both audience routes and the `/sessions/:id/setlist` redirect
    cold. Each screen has one more dependent wave than the spec counted (studies and
    setlists on the song page, audience state and rounds, the redirect's own read).
  - `/setlists/:id/order` warm. `useSetlistEntriesToReorder` sets
    `refetchOnMount: 'always'` (since #247, to keep a saved order).
  - `/oauth/consent` warm. The consent description is read again on every open.
  - None of these comes from slice 5's code. Merging waves that land in different tasks
    needs a closer wider than one task, which the spec's D13 excludes. Raising the bounds
    is a spec change. Either choice belongs to the orchestrator and the operator.

## Gates

| Gate | Command | Result |
| --- | --- | --- |
| 5.1 | `pnpm --filter @borso-app/pragma lint` (oxlint `--type-aware`) | pass |
| 5.2 | `pnpm run format:check` (oxfmt `--check`) | pass, 2912 files |
| 5.3 | `pnpm --filter @borso-app/pragma typecheck` | pass |
| 5.4 core | `pnpm --filter @borso-app/pragma exec vitest run --project core --coverage` | pass, 401 files, 3924 tests, 100% per file |
| 5.5 | `pnpm --filter @borso-app/pragma build` | pass |
| 5.6 | `pnpm knip` | pass, exit 0 |
| 5.2b | `pnpm --filter @borso-app/pragma exec stryker run --mutate site/src/components/organisms/session-gate.core.ts` | 70 killed, 0 survived, score 100 |
| 5.3 | `blueprint-indexing.ts --check` and `scripts/check-vocabulary-paths.sh` | pass |
| extra | `check-pure-modules-have-callers`, `check-tailwind-arbitrary-variants`, `check-stylesheet-contents`, `check-single-stylesheet` | pass |
| 5.4 acceptance | table above | peak pass on all rows. Count above the inferred bound on 7 rows |
| 5.5 | `scripts/phone.sh touch '[data-opening-phase] button'` with `/api/**` aborted, then restored | real touch, then `POST /api/read-batch` first and the home screen filled |
| 5.6 | screenshots | below |
| e2e | none touched. Slice 5 changes no `api/` file | not applicable |

## Screenshots (scratchpad, not committed)

Under `/tmp/claude-0/-home-user-borso-fr/cd287730-a3f7-5952-a07f-8736d08299e3/scratchpad/impl-5/`:

- `loader-375-mid-animation.png`, 375 px at 3x, paused at 950 ms, notes mid-swing, halo up.
- `t-grid.png`, six frames of the loop (560 to 1250 ms), the arpeggio and the overshoot.
- `error-375.png`, the failure with `/api/**` aborted.
- `error-offline-375.png`, the failure with the browser offline, offline note shown.
- `reduced-375.png`, the static mark under `prefers-reduced-motion: reduce` (0 animations).
- `loader-1280.png`, the loader at 1280 px.
- `trace/compare.png`, the PNG beside the traced SVG.

## Friction

Logged with `scripts/kaizen.sh --from impl-5`: the `@theme static` var resolution, jsdom's
missing `AnimationEvent`, agent-browser dropping the sign-in cookie on relaunch, and the
inferred count bounds.

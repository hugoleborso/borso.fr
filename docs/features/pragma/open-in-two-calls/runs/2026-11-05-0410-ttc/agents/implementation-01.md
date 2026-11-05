---
status: done
summary: |
  Slice 1 is implemented. The offline preload now reads /api/songs and
  /api/sessions in one tick. It picks the next session with
  selectNextSession, as home does. It then reads that session, its
  setlists and their entries through one shared helper,
  mapEntriesOfSetlists. The preload starts only from a cached probe and
  never probes. /api/offline-manifest is deleted, with its core, test,
  router, service function, stale-scope rows, MCP exclusion and
  vocabulary entry. The core-projection blueprint moved onto
  projectSessionForTool first. Gates are listed in the body. Nothing is
  staged or committed.
artifacts:
  - apps/pragma/VOCABULARY.md
  - apps/pragma/api/src/app.ts
  - apps/pragma/api/src/mcp/tool-coverage.core.ts
  - apps/pragma/api/src/realtime/derived-read-roots.test.ts
  - apps/pragma/api/src/sessions/offline-manifest.core.ts
  - apps/pragma/api/src/sessions/offline-manifest.core.test.ts
  - apps/pragma/api/src/sessions/session-tool.core.ts
  - apps/pragma/api/src/sessions/sessions.controller.ts
  - apps/pragma/api/src/sessions/sessions.service.ts
  - apps/pragma/domain/stale-scope.core.ts
  - apps/pragma/site/src/lib/queries/offline-reading.queries.ts
  - apps/pragma/site/src/lib/queries/offline-reading.queries.test.ts
  - apps/pragma/site/src/lib/queries/offline-reading.utils.ts
  - apps/pragma/site/src/lib/queries/offline-reading.utils.test.ts
  - apps/pragma/site/src/lib/queries/query-read-roots.core.ts
  - apps/pragma/site/src/lib/queries/sessions.queries.ts
  - apps/pragma/site/src/lib/queries/setlist-entries.queries.ts
  - apps/pragma/site/src/lib/query-client.setup.test.ts
  - docs/standards/blueprint-subjects.json
  - docs/features/pragma/open-in-two-calls/runs/2026-11-05-0410-ttc/agents/implementation-01.md
next:
  kind: validate
---

# Slice 1. Offline preload from the lists, manifest deleted

Goal. One pragma tab never sends more than the API's 10 seats can hold, on any route. Slice 1 removes the preload's per-item fan-out, so rule B (slice 2) lands with one justified hit.

Smallest change. The preload reads the two lists, picks the next session with the same rule as home, and reads that session's data. The manifest route and everything that names it are deleted.

Data shape. No new type. The preload is a fixed sequence of cache reads:

1. the cached probe `authKeys.session()`, never fetched;
2. `songKeys.list()` (static) and `sessionKeys.list()` (default staleness, cached copy on failure), in one tick;
3. `sessionKeys.byId(next)` and `setlistKeys.bySessionId(next)`;
4. `setlistKeys.entriesOf(id)` per setlist, through `mapEntriesOfSetlists`.

The `refactor:` commit body should name the property the manifest had and the new path drops. The server chose what to preload and sent it in one call. The new path picks the next session with home's rule instead, so a session that started earlier today now counts.

## Deviations from the plan, for the validator

- **The D12 helper takes the per-query step.** The plan names `entriesOfSetlistsQueryOptions(setlistIds)` returning the array. The preload would then need its own `.map((options) => queryClient.query(options))`, a second rule B hit. So `mapEntriesOfSetlists(setlistIds, mapQuery)` holds the only per-setlist `.map`. `useEntriesOfSetlists` passes `(options) => options`. The preload passes the `queryClient.query` step. Slice 2 puts its one disable on the `return setlistIds.map(...)` line of `mapEntriesOfSetlists`.
- **The probe guard lives in `offline-reading.queries.ts`.** The cached-probe read is in `isSignedIn` inside `loadOfflineReadingWhenSignedIn`, not in `query-client.setup.ts`. Both start paths share it. `query-client.setup.test.ts` has the new restore case. It fails on the old code and passes on the new one (measured).
- **`setlist-entries.queries.ts` went over `max-lines` (310 of 300).** Its five identical `onError` rollbacks became one `restoreEntries` helper, and the file is now under the limit. Behaviour is unchanged. `setlist-entries.queries.test.tsx` passes.
- **VOCABULARY.** **Offline manifest** became **Offline reading**, which describes the new preload and is held by two of its tests. The plan said only to remove the old entry. Removing it with no replacement would leave `loadOfflineReadingWhenSignedIn` with no entry.
- **`blueprint-subjects.json`.** The three entries for deleted or promoted subjects were removed. The rest of the file is unchanged.

## Gates

GATES_PLACEHOLDER

## Friction logged

- `scripts/check-pure-modules-have-callers.sh` reads `git ls-files`. An unstaged deletion still counts there, so the gate was run against a throwaway copy of the index.
- Plan gate 1.7 passes three core-project files to `test:e2e`, which skips them. C.4 runs them.

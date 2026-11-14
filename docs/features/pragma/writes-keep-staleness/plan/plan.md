# Plan

## Data shape

No new type, table or payload. Two functions in
`apps/pragma/site/src/lib/queries/cache-write.queries.ts`:

- `writeKeepingStaleness<Data>(queryClient, queryKey, update): void` writes one
  exact key. Its text is identical to PR #327's.
- `writeEachKeepingStaleness<Data>(queryClient, queryKeyPrefix, update): void`
  replaces `setQueriesData({ queryKey })`. It applies `writeKeepingStaleness`
  to every cached query under the prefix, which is the set `setQueriesData`
  touches.

## Changes

| Where | What |
| --- | --- |
| `lib/queries/*.queries.ts`, `lib/query-client.setup.ts` | 119 `setQueryData` and 3 `setQueriesData` calls route through the helpers |
| `setlists.queries.ts` `useCreateSetlist` | stays `setQueryData`, disabled. It seeds the detail of the setlist just created |
| `songs.queries.ts` `useCreateSong` | stays `setQueryData`, disabled. It seeds the detail of the song just created |
| `eslint-rules/no-direct-query-cache-write.js` | new rule, on for `apps/pragma/site/src/**`, off for tests |
| `docs/standards/06-data-fetching.md`, `12-linting-and-gates.md` | the standard and its gate |
| `songs.queries.test.tsx` | the race test |

## Merge with PR #327

PR #327 adds the same file with `refreshReadsDerivedFrom` and without
`writeEachKeepingStaleness`. Main lacks the `selectQueryRootsDerivedFrom` that
function imports, so a byte copy would not compile. Whichever PR merges second
resolves an add/add conflict by keeping both functions.

## Risks

- A write that used to make a stale entry fresh now leaves it stale, so one
  extra `GET` follows on the next mount. That read is the point of the change.
- A rollback restoring a snapshot onto an entry that turned stale mid-flight
  keeps it stale, which is also correct.

## Gates

`pnpm --filter @borso-app/pragma exec vitest run site/src`, `scripts/lint-repository.sh`,
`vitest run eslint-rules`, `tsc --noEmit` in `apps/pragma`.

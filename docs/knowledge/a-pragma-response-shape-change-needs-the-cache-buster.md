---
summary: 'pragma persists every API response in localStorage for seven days, so a change that renames or removes a response field also bumps PERSISTED_CACHE_SHAPE_VERSION in site/src/lib/query-client.setup.ts.'
triggers:
  paths:
    - 'apps/pragma/api/src/**/*.schema.ts'
    - 'apps/pragma/api/src/**/*.core.ts'
---

# A pragma response shape change needs the cache buster

`apps/pragma/site/src/lib/query-client.setup.ts` persists the query cache to
`localStorage` under `pragma.query-cache` for seven days. `isQueryPersisted`
keeps every successful query except song previews, so every API response a
member has read is restored on the next load, in the shape it had then.

TanStack Query drops the stored cache only when `buster` changes, and the
buster is `PERSISTED_CACHE_SHAPE_VERSION`, a string bumped by hand. Nothing
ties it to the API's types. A field renamed or removed without a bump reaches
a returning member as `undefined` until the query refetches.

PR #363 replaced `song.chart` with `song.charts`. Its spec missed the buster,
and its planner found it by reading the file (measured, friction log line
00:52). The pull request bumped `'1'` to `'2'`.

When a change renames or removes a field of a response the site reads, bump the
version in the same commit. An added field is `undefined` in restored data
until the refetch, so bump for it too unless every reader accepts its absence.

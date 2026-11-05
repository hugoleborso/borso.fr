---
date: 2026-11-05
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#261'
fix-pr: '#261'
fix-commits: [06abedfd9]
eradication-level: 2
eradication-paths: [apps/pragma/site/src/lib/queries/query-key-roots.test.ts, apps/pragma/api/src/realtime/derived-read-roots.test.ts, apps/pragma/site/src/lib/queries/query-read-roots.core.ts, apps/pragma/domain/stale-scope.core.ts]
time-to-detect: minutes
tags: [pragma, tanstack-query, spec, validation, testing]
zone: apps/pragma/domain/stale-scope.core.ts
recurs: none (invalidatequeries-only-refetches-mounted-queries is about which cached queries refetch; this is about which ones a write is mapped to at all)
---

# The score that changed under another name

## User impact

Caught by the first technical validation of PR #261, before any user saw it
(`docs/features/pragma/live-invalidation/validation/technical-validation-2026-11-04-0239.md`,
finding A13). Had it shipped, a member's open screen would have kept another
member's old data for up to the 5-minute freshness the same pull request set.

| | Seen | Expected |
| --- | --- | --- |
| Léa rates her part on a song while Hugo has the song open | Hugo keeps Léa's old score for up to 5 minutes | Hugo's screen shows the new score within a couple of seconds |
| Léa adds a song to the next concert's setlist while Hugo is on the catalog | Hugo's concert readiness and candidates stay stale for up to 5 minutes | Refreshed within a couple of seconds |

## Causal chain

- Hugo's song page would not refresh after Léa's mastery write.
  - The API sent `{ kind: 'stale', scope: 'mastery' }`, and the site
    invalidated `['mastery']` only.
    - The site caches `GET /api/mastery/overrides/:songId` under the key
      `['studies', 'overrides', songId]`, and `GET /api/studies/overview`
      aggregates mastery and setlist entries on the server.
      - The scope table in commit `1b6ba33` mapped each write's path root to
        one query key root by hand, and nothing compared it with the site's
        query modules or the API's cross-slice reads.

## Root cause of occurrence

*Thought a write's path root names the cache that shows its data, actually
the site keys a query by the screen that reads it, and the API serves some
roots by aggregating others.*

The spec of commit `eb8276f` wrote it as a rule: "`scope` is a query key root
the site uses" and "it derives the scope from the path root of the write". Two
facts break that. `studies.queries.ts` reads `/api/mastery/...` under the
`studies` key factory, and `studies.service.ts` imports from the `mastery` and
`setlists` slices. The feature had no `plan.md` (validation finding A01), so
no step mapped the spec's data shape onto the existing query keys before code
was written.

## Detection failure causes

- **Typing:** the scope was a string union of roots. Every wrong mapping was
  still a valid root.
- **Unit tests:** `query-key-roots.test.ts` checked only that each scope
  named a root the site uses. Both failing cases passed it (finding D30).
- **Self-validation:** the implementer tested a setlist reorder seen from the
  setlist page, where the path root and the key root coincide.
- **Technical validation (caught it):** the validator traced one write to
  every query that reads its tables, by reading `studies.service.ts`.

## Countermeasure

Commit `e18059b` in PR #261 (squashed into `06abedfd9` on main) changed the
message to carry the API roots a write touched. The site maps them to query
key roots through `QUERY_READ_ROOTS`, expanded by `DERIVED_READ_ROOTS`.
Commit `8bb9975` then narrowed `me`, after the visual validation measured one
contact write refetching 11 queries, 5 of which answered 503. The second
technical validation passed.

## Eradication

**Type:** DevX check (level 2)

**Reference:** [PR #261](https://github.com/hugoleborso/borso.fr/pull/261), squashed as `06abedfd9`.

Two tests read the source and fail when the tables drift from it. They run in
the core project, which the commit and push hooks run on changed files.

```diff
+// apps/pragma/site/src/lib/queries/query-key-roots.test.ts
+  it('lists under each key root every API root its query module reads', () => {
+    const unlisted = readQueryModules().flatMap((module) => …
+// apps/pragma/api/src/realtime/derived-read-roots.test.ts
+  it('lists in a slice's row every slice its services and repositories read', …
```

The first reads every `*.queries.ts` for its key factory and its `$get`
calls. The second reads every slice's `.service.ts` and `.repository.ts`
imports from another slice. A cascade that writes into another slice, such as
a song delete, is held in a separate `WRITES_INTO` table, because imports
point both ways (logged by the `live-invalidation-fix` agent).

Level 1 was considered. Deriving the tables from the source at build time
would need a code generator that reads TypeScript imports, which costs more
than the two tests and would be a new dependency for one table.

**Proof it can fail:** planting both original failing cases on 2026-11-05
(dropping `mastery` from the `studies` row of `QUERY_READ_ROOTS`, and
`setlists` from `DERIVED_READ_ROOTS.studies`) fails both tests:

```text
× lists in a slice's row every slice its services and repositories read
+   "studies reads setlists",
× lists under each key root every API root its query module reads
+   "studies misses mastery (read in studies.queries.ts)",
```

**Similar instances:** `grep -rln "invalidateQueries" apps/*/site/src` lists
the other apps that invalidate by key. None maps a server-sent name onto query
keys, so none has a table to drift.

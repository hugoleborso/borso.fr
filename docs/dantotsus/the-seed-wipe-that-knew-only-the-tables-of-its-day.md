---
date: 2026-10-29
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#206'
fix-commits: [0470c3a46]
eradication-level: 1
eradication-paths: [apps/pragma/api/src/__test/test-seed.repository.ts, apps/pragma/api/src/__test/test-seed.controller.test.ts]
time-to-detect: hours
tags: [pragma, testing, preview, dsql]
zone: apps/pragma/api/src/__test/test-seed.repository.ts
recurs: none (the first entry about pragma's test seed; the clone lists of ADR-2026-08-09T1654 are a different list with a gate of their own)
---

# The seed wipe that knew only the tables of its day

## User impact

The users are the operator and the validators who re-seed a pragma preview to test it. A re-seed is meant to start from the fixture alone. It kept rows that pointed at members it had just deleted.

| | Seen | Expected |
| --- | --- | --- |
| Re-seed after slice 7 of PR #206 | The previous seed's assistant grants left behind, naming deleted members (`implementation-07-7`, 12:05 in the archived friction log) | Only the fixture's rows |
| Re-seed after someone used improvements, audience votes, voting rounds or outreach | Their rows kept, with authors and rounds that no longer exist | Those features empty |

Nine tables were never wiped: the three assistant tables slice 7 added, and `improvement`, `improvement_vote`, `audience_suggestion`, `audience_vote`, `voting_round` and `outreach_template` (read from the function by the first version of this entry).

## Causal chain

- A re-seed kept rows naming members it had deleted.
  - `deleteAllDomainRows` wiped only the tables it named, one `database.delete(<table>)` call each.

    ```ts
    // apps/pragma/api/src/__test/test-seed.repository.ts, before 0470c3a46
    await database.delete(assistantGrantTable); // added by hand in slice 7
    …twenty-five more lines…
    await database.delete(instrumentTable); // ❌ a list of the tables its author knew of when each line was added
    ```

    - Commit `8fdf1a877` (2026-08-08, written by an agent) wrote the wipe as a list of the tables that existed that day. Each later table was added by whoever remembered it.
      - The only table-clearing code in pragma at its parent was `ALL_TABLES` in `apps/pragma/test/database-utils.ts`, also a literal list of names (measured with `git grep ALL_TABLES 8fdf1a877^`). The codebase's example of clearing every table was a list kept by hand beside the schema. (Machine)

## Root cause of occurrence

*Thought the seed's wipe was a list of the tables the seed fills, actually it has to be every domain table, because the rows it must clear are the ones other features wrote.*

Machine. A table reaches the database through the schema barrel (`apps/pragma/api/src/database/schema.ts`) and its migration. The wipe was a third list, copied in shape from the second, and nothing tells a new table's author about either.

## Detection failure causes

- **Typing:** a list of calls carries no type that could know the schema.
- **Tests:** the seed's back-e2e suite checked what the seed creates and that a re-seed does not duplicate it. A table the seed never writes could fail neither check.
- **Database:** DSQL has no foreign keys, so an orphan row is valid.
- **Code review:** each addition to the list looked complete in its own diff.

## Countermeasure

The implementation agent added the three assistant tables to the list during PR #206.

## Eradication

**Type:** structural impossibility (level 1), for the preview wipe.

**Reference:** commit [`0470c3a46`](https://github.com/hugoleborso/borso.fr/commit/0470c3a46) (PR #221).

```ts
// apps/pragma/api/src/__test/test-seed.repository.ts
const TABLES_THE_SEED_KEEPS: ReadonlySet<unknown> = new Set([
  schema.appConfigTable,
  schema.vapidKeyPairTable,
  schema.authAttemptTable,
]);
…
  const domainTables = Object.values(schema).filter((table) => !TABLES_THE_SEED_KEEPS.has(table));
```

A table that can exist in the database is wiped unless it is named as kept. The three kept tables hold no member's data: the application configuration, the push key pair, and the sign-in attempts the rate limiter counts. The order of the deletes no longer matters, because no migration declares a foreign key.

The cost: a re-seed now also deletes improvements and their votes, audience suggestions and votes, voting rounds and the outreach template. None is created by the seed, so a re-seeded preview starts with those features empty.

The sibling list is still kept by hand. `ALL_TABLES` in `apps/pragma/test/database-utils.ts` lists 48 names for `truncateAllTables`, used by the back-end tests. Today it holds the 47 tables the schema declares plus `setlist`, created by migration 0000 and replaced by `setlist_sheet` in 0003 (measured by comparing it with the `pgTable` names under `apps/pragma/api/src`). A new table its author forgets would survive between tests.

**Proposed:** derive `ALL_TABLES` from the same schema barrel, with drizzle's `getTableName` over `Object.values(schema)`, and drop the dead `setlist` table by migration. Neither list could then miss a new table.

**Proof it can fail:** the back-e2e test "clears on a re-seed a table it never seeds, so no row outlives the member it names", in `apps/pragma/api/src/__test/test-seed.controller.test.ts`, writes an improvement, re-seeds and expects none. It failed on the old list and passed on the derived one (recorded by the first version of this entry).

**Similar instances:** `grep -rn "Object.values(schema)" apps/*/api/src` finds the derived wipe. `ALL_TABLES`, above, is the other list of pragma's tables. [`../knowledge/pnpm-dev-serves-a-schema-it-never-migrated.md`](../knowledge/pnpm-dev-serves-a-schema-it-never-migrated.md) is the other way the local database disagrees with the code.

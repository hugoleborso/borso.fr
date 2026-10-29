---
date: 2026-10-29
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#206'
fix-pr: none (the kaizen pull request for PR #206 that adds this file)
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/api/src/__test/test-seed.repository.ts, apps/pragma/api/src/__test/test-seed.controller.test.ts]
time-to-detect: hours
tags: [pragma, testing, preview, dsql]
zone: apps/pragma/api/src/__test/test-seed.repository.ts
recurs: none (the first entry about pragma's test seed; the clone lists of ADR-0009 are a different list with a gate of their own)
---

# The seed wipe that knew only the tables of its day

## Symptom

Slice 7 of PR #206 added three tables, `assistant_client`,
`assistant_authorization_code` and `assistant_grant`, and seeded one grant for
the preview fixture. A re-seed then left the previous seed's grants behind,
pointing at members the wipe had just deleted (`implementation-07-7`, 12:05 in
the archived friction log). The agent added the three tables to
`deleteAllDomainRows` by hand.

Reading the function afterwards showed the same gap for six more tables:
`improvement`, `improvement_vote`, `audience_suggestion`, `audience_vote`,
`voting_round` and `outreach_template` were never wiped. The seed does not
create rows in any of them, so a preview re-seeded after someone used those
features kept rows whose authors and rounds were gone.

## Root-cause chain

1. **Why did a re-seed keep rows of deleted members?** `deleteAllDomainRows`
   was a hand-written list of `database.delete(<table>)` calls, one per table
   that existed, or that its author thought of, when each line was added.
2. **Why did a new table not join the list?** Nothing ties the list to the
   schema. A table reaches the database through the schema barrel
   (`api/src/database/schema.ts`) and its migration; the wipe is a third list
   nobody is told about.
3. **Why did no test notice?** The seed's back-e2e suite checks what the seed
   creates and that a re-seed does not duplicate it. A table the seed never
   writes cannot fail either check, and DSQL has no foreign keys to refuse an
   orphan.

**Root cause:** thought the seed's wipe was a list of the tables the seed
fills, actually it has to be every domain table, because the rows it must
clear are the ones other features wrote.

## Detection failure causes

- **Typing:** a list of calls carries no type that could know the schema.
- **Tests:** only tables the seed writes were ever asserted.
- **Database:** no foreign key, so an orphan row is valid.
- **Code review:** each addition to the list looked complete in its own diff.

## Countermeasure

The implementation agent added the three assistant tables to the list during
PR #206.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** the commit that adds this file.

**The actual fix:** the wipe is derived from the schema barrel, so a table that
can exist in the database is wiped unless it is named as kept:

```diff
-  await database.delete(assistantGrantTable);
-  await database.delete(assistantAuthorizationCodeTable);
-  …twenty-five more lines…
-  await database.delete(instrumentTable);
+const TABLES_THE_SEED_KEEPS: ReadonlySet<unknown> = new Set([
+  schema.appConfigTable,
+  schema.vapidKeyPairTable,
+  schema.authAttemptTable,
+]);
+…
+  const domainTables = Object.values(schema).filter((table) => !TABLES_THE_SEED_KEEPS.has(table));
+  await Promise.all(domainTables.map((table) => database.delete(table)));
```

The three kept tables are the ones the old list also kept and that hold no
member's data: the application configuration, the push key pair, and the
sign-in attempts the rate limiter counts, which a validator resets through its
own route. The order of the deletes no longer matters, because no migration
declares a foreign key.

The back-e2e test `clears on a re-seed a table it never seeds` writes an
improvement, re-seeds and expects none. It fails on the old list and passes on
the derived one.

**Property that changes:** a preview re-seed now also deletes improvements and
their votes, audience suggestions and votes, voting rounds and the outreach
template. None of them is created by the seed, so a re-seeded preview starts
with those features empty.

**Sibling defects swept:** the barrel lists 37 tables and `ALL_TABLES` in
`test/database-utils.ts` lists 38; the extra one is `setlist`, created by migration 0000 and
replaced by `setlist_sheet` in 0003, which no schema declares any more. The
test truncate clears it and the preview wipe does not need to, because nothing
writes to it.

## See also

- [`docs/knowledge/pnpm-dev-serves-a-schema-it-never-migrated.md`](../knowledge/pnpm-dev-serves-a-schema-it-never-migrated.md), the other way the local database disagrees with the code.

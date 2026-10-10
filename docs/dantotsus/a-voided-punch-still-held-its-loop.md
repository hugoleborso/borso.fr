---
date: 2026-10-10
introduced-at: implementation
detected-at: review
severity: high
related-pr: 12
fix-pr: pending
fix-commits: [243ee9e8, bb1d646d]
eradication-level: 1
time-to-detect: months
tags: [last-loop-lepin, dsql, domain-model, vocabulary, gates, testing]
blueprints: [core-decision, schema-dsql-constraints]
---

# A voided punch still held its loop

## Symptom

A marshal records a punch for the wrong runner, or at the wrong moment, and
voids it. Then they try to record the right punch for that runner and that
loop. The admin screen refuses it with `already-punched-this-loop`, and with no
existing punch attached, because the only punch for that loop is the voided
one.

`apps/last-loop-lepin/VOCABULARY.md` promised the opposite: *"Voiding is what
lets a runner be punched again for the same loop."* No test had ever tried it.
The new test fails on the code as it was:

```
FAIL  punch.service > punches a runner again for a loop whose punch was voided
PunchRejectedError: punch rejected: already-punched-this-loop
 ❯ buildPunchRejectionError api/src/punch/punch.service.ts:69:10
```

Found by a read-only third-party review, not by a user. The only way out on
race day was the catch-up endpoint, which happened to use a different query.

## Root-cause chain

1. **Why was the second punch refused?** `validatePunchTiming` found a punch
   for the runner and the loop in the list it was given, and that punch was the
   voided one.
2. **Why was a voided punch in the list?** `registerPunch` and
   `registerSelfPunch` passed every punch of the runner, read with
   `listPunchesForEdition`, which does not filter on `voided_at`.
3. **Why did the core function not filter it?** Its parameter was named
   `validPunchesForRunner`. The filter was a promise made by a name, and the
   caller written next to it never kept it.
4. **Why did a name have to carry it?** Until 2026-05-13 the database held the
   rule, with a partial unique index on
   `(edition_slug, runner_slug, loop_index) WHERE voided_at IS NULL`. Aurora
   DSQL refuses partial indexes, so commit `32e63381` dropped it and wrote
   *"Re-punch guarding now lives entirely in `validatePunchTiming`."* The
   `WHERE voided_at IS NULL` clause was half of what the index did, and it did
   not move anywhere.
5. **Why did nothing notice?** The vocabulary stated the rule as a sentence,
   and no test was bound to that sentence.

**Root cause:** we thought moving a constraint into a check in code moved the
rule; actually the partial index carried two properties, a filter on voided
rows and a refusal at write time, and the check that replaced it carried
neither. The filter survived only as the word *valid* in a parameter name.

The second property, the refusal at write time, is its own defect with its
own root cause; see
[`five-monkeys-at-a-three-seat-table`](./five-monkeys-at-a-three-seat-table.md).

## Detection failure causes

- **Typing:** a `readonly LoopPunch[]` is a `readonly LoopPunch[]` whether it
  was filtered or not. Nothing in the type said "valid".
- **Linter:** no rule reads a parameter name as a precondition.
- **CI:** `punch.core.test.ts` only ever passed active punches, so the core
  never met a voided one. `punch.service.test.ts` voided a punch in one case and
  stopped there; it never punched again.
- **Code review:** the commit that dropped the index was a `fix:` with a
  one-line rationale. It did not name what the index did that the check would
  not, which is the failure
  [`silent-property-regression-in-refactor-message`](./silent-property-regression-in-refactor-message.md)
  describes.
- **Vocabulary:** the promise was written on 2026-08-15, three months after it
  had stopped being true, and `check-vocabulary-paths.sh` checked only that a
  term's folder exists.

## Countermeasure

The core no longer receives punches at all. `validatePunchTiming(edition, now)`
decides the race window and the loop and nothing else. One active punch per
runner and loop is held by the primary key of a new table,
`loop_punch_claims`, written with the punch and deleted with the void in the
same transaction, so a voided punch frees its loop by construction.
`lastLoopDurationMs`, the other core function that took a "valid" list, now
filters voided punches itself.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** commits listed in the front matter.

**The actual fix:**

```diff
 export function validatePunchTiming(
   edition: RaceEdition,
-  runnerSlug: string,
-  validPunchesForRunner: readonly LoopPunch[],
   now: Date,
 ): PunchValidation {
```

```diff
 export async function voidPunch(id: string, now: Date): Promise<LoopPunch> {
   const existing = await findPunchById(id);
   if (existing === null) throw new PunchNotFoundError(id);
-  await markPunchVoided(id, now);
+  await runInOneTransaction(async (executor) => {
+    await markPunchVoided(executor, id, now);
+    await releaseLoopClaim(executor, id);
+  });
```

A caller can no longer hand the decision a list it forgot to filter, because
the decision takes no list.

**Type:** DevX check (level 2)

A vocabulary invariant that promises behaviour now names the test that holds
it, on a `Held by:` line, and `scripts/check-vocabulary-paths.sh` fails when
that test file or that test title is gone:

```markdown
Held by: `api/src/punch/punch.service.test.ts` › punches a runner again for a loop whose punch was voided
```

The gate checks that a cited test exists. Whether a sentence is a promise that
needs one is reading prose, so that half is a `reviewer` bullet in
[`01-naming.md`](../standards/01-naming.md), not a rule.

**Sibling defects swept:** every parameter under `apps/*/api/src` named
`valid…`. The two in `punch.core.ts` are fixed above. The third,
`progressFor(…, validPunches, …)` in `ranking.core.ts`, is a private function
whose only caller filters on `voidedAt === null` two lines before calling it,
so the promise is kept inside one function and left as it is. Every caller of
`lastLoopDurationMs` already filtered, so the change there is defence rather
than a fix.

## See also

- [`five-monkeys-at-a-three-seat-table`](./five-monkeys-at-a-three-seat-table.md),
  the other half of what the dropped index used to do.
- [`a-comment-decayed-and-took-the-vocabulary-with-it`](./a-comment-decayed-and-took-the-vocabulary-with-it.md),
  the previous time the vocabulary stated something the code had stopped
  doing.
- [`docs/knowledge/dsql-postgres-compat-gaps.md`](../knowledge/dsql-postgres-compat-gaps.md) §6.

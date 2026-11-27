---
date: 2026-10-10
introduced-at: implementation
detected-at: review
severity: high
related-pr: '#12'
fix-commits: [self]
eradication-level: 1
time-to-detect: months
tags: [last-loop-lepin, dsql, domain-model, vocabulary, gates, testing]
blueprints: [core-decision, schema-dsql-constraints]
eradication-paths: [apps/last-loop-lepin/api/src/punch/punch.repository.ts, apps/last-loop-lepin/api/src/punch/punch.schema.ts, apps/last-loop-lepin/api/src/punch/punch.core.ts]
zone: apps/last-loop-lepin/api/src/punch
recurs: none (a check that read voided rows as live ones, not a gate or vocabulary defect)
---

# A voided punch still held its loop

## User impact

A marshal records a punch for the wrong runner, or at the wrong moment, and
voids it. Then they record the right punch for that runner and that loop.

| | Seen | Expected |
| --- | --- | --- |
| Re-punch after a void | The admin screen refuses it with `already-punched-this-loop`, with no existing punch attached | The punch is recorded, because the only punch for that loop is voided |

The vocabulary promised the expected column: *"Voiding is what lets a runner
be punched again for the same loop."* A new test reproduced the refusal on the
code as it was (measured):

```
FAIL  punch.service > punches a runner again for a loop whose punch was voided
PunchRejectedError: punch rejected: already-punched-this-loop
 ❯ buildPunchRejectionError api/src/punch/punch.service.ts:69:10
```

A read-only third-party review found it, not a user. Every marshal of an
edition was exposed. The only way out on race day was the catch-up endpoint,
which used a different query.

## Causal chain

- The admin screen refused the second punch with `already-punched-this-loop`.
  - `validatePunchTiming` found a punch for that runner and loop in the list it
    was given. That punch was the voided one.
    - `registerPunch` passed every punch of the runner, read with
      `listPunchesForEdition`, which does not filter on `voided_at`
      (`git show 32e63381^:apps/last-loop-lepin/api/src/punch/punch.service.ts`):

      ```ts
      // every punch of the edition, voided ones included
      const existingPunches = await listPunchesForEdition(database, input.editionSlug);
      // narrowed to the runner, never to active punches
      const runnerPunches = existingPunches.filter((punch) => punch.runnerSlug === input.runnerSlug);
      // ❌ the core's parameter is named validPunchesForRunner
      const validation = validatePunchTiming(edition, input.runnerSlug, runnerPunches, now);
      ```

      - Commit `5353b6de1` (2026-05-12, "database client + 6 feature layers +
        Hono app") wrote that caller. One agent commit wrote every repository,
        service and controller of six features at once.
        - The same commit wrote `findActivePunchForLoop` 21 lines above
          `listPunchesForEdition`, with `isNull(loopPunchesTable.voidedAt)`.
          The core it called, written the same day in `92fb11aa3`, named its
          parameter `validPunchesForRunner`. Both facts sat in the agent's
          context. The unfiltered list went in anyway (Man).
  - `8ad75cc88` (2026-05-15) copied the same call into `registerSelfPunch`.

## Root cause of occurrence

*The agent thought `listPunchesForEdition` returned the punches that count for
the re-punch rule, actually it returns every row of the edition, voided ones
included, and the core's "valid" was a promise only its name carried.* (Man)

The agent wrote the line. The right answer was in its context: the parameter
name `validPunchesForRunner` in `punch.core.ts` (`92fb11aa3`), and the
`isNull(loopPunchesTable.voidedAt)` filter it wrote in the same commit for
`findActivePunchForLoop`. So the cause is not a missing document. The prior won
in a worker state that favoured it: one commit writing six feature layers,
where a list read for one purpose was reused for another (inferred from the
commit's scope).

The defect is not the index drop. At the parent of `32e63381`, which dropped
the partial unique index because Aurora DSQL refuses partial indexes, the
caller already passed the unfiltered list. So the app check refused a re-punch
after a void while the index still existed.

## Detection failure causes

- **Typing:** a `readonly LoopPunch[]` is the same type filtered or not.
  Nothing in the type said "active".
- **Linter:** no rule reads a parameter name as a precondition.
- **CI:** `punch.core.test.ts` only passed active punches, so the core never
  met a voided one. `punch.service.test.ts` voided a punch in one case and
  never punched again.
- **Code review:** `32e63381` was a `fix:` whose message says *"Re-punch
  guarding now lives entirely in `validatePunchTiming`"*. It did not check what
  list that function received. That is the failure
  [`silent-property-regression-in-refactor-message`](./silent-property-regression-in-refactor-message.md)
  describes, so the reviewer had no list of what moved to check.
- **Vocabulary:** the promise was written on 2026-08-15, and
  `check-vocabulary-paths.sh` then only checked that a term's folder exists. No
  test was bound to the sentence.

## Countermeasure

The core no longer receives punches. `validatePunchTiming(edition, now)`
decides the race window and the loop and nothing else. One active punch per
runner and loop is held by the primary key of a new table, `loop_punch_claims`.
The claim is written with the punch and deleted with the void in one
transaction, so a voided punch frees its loop by construction.
`lastLoopDurationMs`, the other core function that took a "valid" list, now
filters voided punches itself. The test above passes.

The other half of what the dropped index did, refusing a concurrent second
write, is its own entry,
[`five-monkeys-at-a-three-seat-table`](./five-monkeys-at-a-three-seat-table.md).

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit adding this file.

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
the decision takes no list. It still holds today:
`apps/last-loop-lepin/api/src/punch/punch.core.ts:24` reads
`export function validatePunchTiming(edition: RaceEdition, now: Date)`, and
`punch.repository.ts` inserts into and deletes from `loopPunchClaimsTable`.

The promise is also bound to its test. `apps/last-loop-lepin/api/src/punch/INVARIANTS.md:117`
carries `Held by: \`api/src/punch/punch.service.test.ts\` › punches a runner
again for a loop whose punch was voided`, and `scripts/check-vocabulary-paths.sh`
fails when that file or title is gone. That line moved from `VOCABULARY.md` to
the folder's invariants in `2cfa2a34d` (#353).

**Proof it can fail:** the service test above, run on the code before the fix,
fails with `PunchRejectedError: punch rejected: already-punched-this-loop`.

**Similar instances:** `grep -rn "valid[A-Z][a-zA-Z]*" apps/*/api/src` for
parameters named `valid…`. The two in `punch.core.ts` are removed above. The
third, `progressFor(…, validPunches, …)` in `ranking.core.ts`, is private, and
its only caller filters on `voidedAt === null` two lines before the call.
Every caller of `lastLoopDurationMs` already filtered.

---
date: 2026-05-14
introduced-at: implementation
detected-at: production
severity: medium
related-pr: '#12'
fix-commits: [d347ab1477, ce95ce85e]
eradication-level: 4
eradication-paths: [apps/last-loop-lepin/api/src/punch/punch.schema.ts, apps/last-loop-lepin/api/src/punch/punch.schema.test.ts]
time-to-detect: live race-day usage, the operator could not validate auto-DNFs from the admin UI; surfaced as 400s in CloudWatch
tags: [last-loop-lepin, validation, zod, dsql]
zone: apps/last-loop-lepin/api/src/punch/punch.schema.ts
---

# `outAtLoop: 0` rejected because the schema demanded `positive()`

## User impact

The race organiser could not confirm the DNF of a runner who never closed
the first loop. "Valider DNF" on a runner the system showed as `dnf:late
outAtLoop=0` returned 400, and so did "Marquer abandon" on a runner who
never punched.

| | Seen | Expected |
| --- | --- | --- |
| `POST /api/admin/dnfs` with `outAtLoop: 0` | `400` in 1 to 2 ms, from `zValidator`, before any business logic | `201`, the DNF recorded |

The operator reported it: *"je prends des 400 pour valider les DNF, et
pour marquer à la main des DNF tour 0"* (I get 400s when validating DNFs,
and when marking loop-0 DNFs by hand). DNFs after loop 1 or later were not
affected.

## Causal chain

- The admin's DNF confirmation returned 400.
  - The front posted back the `outAtLoop` the standings showed, which was 0.
    - `ranking.core.ts` projects a runner who never crossed the line as `dnf:late` with `outAtLoop: lastValidLoop`, and `lastValidLoop` starts at 0.
  - `createDnfInputSchema` refused 0.

    ```ts
    // punch.schema.ts at 92fb11aa3
    outAtLoop: z.number().int().positive(), // ← Zod's positive() is strictly > 0
    ```

    - Commit 92fb11aa3 ("domain types + feature cores + Drizzle schemas", 2026-05-12) wrote this validator. The same commit wrote the projection that emits 0: `let lastValidLoop = 0;` and `status: { kind: 'dnf', outAtLoop: lastValidLoop, reason: 'late' }` in `ranking.core.ts` (measured, `git grep -n outAtLoop 92fb11aa3`).
      - The same commit declares the value three ways, each with its own range or none: the Zod validator in `punch.schema.ts`, `outAtLoop: number` in `ranking.types.ts`, and `outAtLoop: integer('out_at_loop').notNull()` in the Drizzle table.
        - The spec it was built from gives `{ kind: 'dnf'; outAtLoop: number; … }` with no range (`docs/features/last-loop-lepin/race-day-live/spec/spec.md:184` at 92fb11aa3).

## Root cause of occurrence

*Thought `outAtLoop` counts the loops a DNF runner completed, so it is at
least 1 since a DNF follows an attempt, actually the system's own
projection emits 0 for a runner who misses the very first top, and the
confirmation flow must round-trip it.*

Tag: **Man** (agentic rule). The fact was in the agent's context: it
wrote `let lastValidLoop = 0` in the same commit, a few files away. The
prior "a DNF has at least one loop" won when it wrote the validator. One
more comment cannot hold that, since the code that disproved it was
already there. The Machine condition under it: the value has three
declarations and none is the source of the others.

## Detection failure causes

- **Typing:** `outAtLoop: number` carries no lower bound, so the projection and the validator could disagree on 0 without a type error.
- **Local and CI tests:** the back-e2e fixtures recorded DNFs only after loop 1. No test sent 0 to the validator.
- **Review:** the projection and the validator sit in different files of one 2026-05-12 commit, and nothing reads them as a pair.
- **QA:** a loop-0 DNF only happens when a runner misses the first top, which first happened when real users tested one-minute loops.

## Countermeasure

Commit d347ab1477 changed `positive()` to `nonnegative()`. The schema has
since been renamed `createDidNotFinishInputSchema`.

## Eradication

**Type:** detection (level 4).

**Reference:** the comment d347ab1477 added beside the field is gone.
Commit 8621866aa removed every comment from the code, and
`punch.schema.ts:90` is now bare. What holds today is the schema test
that commit ce95ce85e added:

```ts
// apps/last-loop-lepin/api/src/punch/punch.schema.test.ts
it('accepts a pre-race abandon at loop zero', () => {
  expect(createDidNotFinishInputSchema.safeParse({
    editionSlug, runnerSlug, outAtLoop: 0, reason: 'manual',
  }).success).toBe(true);
});
```

**Proof it can fail:** measured on 2026-11-27. Putting `positive()` back
on the field and running the test gives `× accepts a pre-race abandon at
loop zero` and `Tests 1 failed | 2 passed`. The file was reverted.

The test detects this field. It does not stop the class: the three
declarations still state their ranges apart, in `punch.schema.ts:90`,
`ranking.types.ts:5` and `site/src/lib/race.types.ts:64`.

**Proposed:** subtract the extra declarations. `apps/last-loop-lepin/domain/`
now holds rules both sides read, and the app already depends on `zod`. A
`loopCount` schema there (`z.number().int().nonnegative()`) would be the
one source. The validator would use it, and the two `outAtLoop: number`
types would become `z.infer` of it. A validator that disagrees with the
projection on 0 could then not be written, because there would be one
range to state.

**Similar instances:** `grep -rn "outAtLoop" apps/last-loop-lepin --include=*.ts`
finds the three declarations above. `catchupPunchInputSchema` keeps
`positive()`, since a catch-up credits a missed loop of at least 1.

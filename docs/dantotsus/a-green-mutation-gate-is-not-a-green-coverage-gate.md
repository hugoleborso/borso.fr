---
date: 2026-08-09
introduced-at: mutation-sweep
detected-at: ci
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-commits: []
eradication-level: 2
time-to-detect: one push
tags: [stryker, vitest, coverage, mutation, gates, pre-push]
---

# A green mutation gate is not a green coverage gate

## Symptom

A push cleared `pre-push` — knip, both infra coverage suites, actionlint, and
the mutation gate at **100.00% with zero survivors on all four applications**,
forty minutes of it — and CI went red four minutes later:

```
ERROR: Coverage for branches (91.66%) does not meet global threshold (100%)
       for site/src/lib/initials.utils.ts
```

The file had just been rewritten by a mutation sweep and had been *measured* at
100% mutation score. Two gates, both about test strength, disagreeing about the
same file on the same commit.

## Root-cause chain

1. **The rewritten line carried an unreachable fallback.**

   ```ts
   const lastInitial = wordInitials.at(-1) ?? firstInitial;
   ```

   By that line `firstInitial` is known defined and `wordInitials.length !== 1`,
   so the array holds at least two entries and `.at(-1)` cannot be `undefined`.
   The `?? firstInitial` branch is dead. It was written to satisfy
   `noUncheckedIndexedAccess`, which types `.at()` as `string | undefined`
   regardless of what the surrounding checks establish.

2. **Stryker killed it; v8 did not cover it.** Stryker's `LogicalOperator`
   mutator rewrites `??` as `&&`, which for a two-word name yields
   `firstInitial` instead of the last initial — a different string, so a test
   noticed and the mutant died. Nothing Stryker does *takes the right-hand
   branch*, so v8 still reports it as never executed. **Mutation asks whether a
   test would notice a change; coverage asks whether a line ran. A dead branch
   next to a live operator answers yes to the first and no to the second.**

3. **The coverage gate was in CI and not in `pre-push`.** `pre-push` ran the
   `infra/cdk` and `infra/shared` coverage suites, and the four apps' mutation
   suites, but never the four apps' own `test:core` / `test:coverage`. So the
   longest, most expensive gate on the branch was armed locally while the
   cheaper one that would have caught this was not.

## Detection failure causes

- **Two gates were treated as one.** Having watched mutation testing find 105
  pieces of dead code across three applications, "zero survivors" read as "the
  strongest possible statement about this file". It is a strong statement about
  a different property.
- **The expensive gate ran locally and the cheap one did not**, which is exactly
  backwards. Forty minutes of Stryker at `pre-push`; ninety seconds of coverage
  only in CI.
- **The fallback looked like diligence.** `?? firstInitial` reads as careful
  defensive code, and `noUncheckedIndexedAccess` supplies a standing excuse for
  writing one. A reviewer scanning the diff has no reason to stop on it.

## Countermeasure

The dead branch is gone rather than covered. Destructuring the tail makes the
single-word case and the "no last initial" case the same case, so both branches
are reachable and both are tested:

```ts
const [firstInitial, ...laterInitials] = wordInitials;
if (firstInitial === undefined) return NO_NAME_INITIALS;
const lastInitial = laterInitials.at(-1);
if (lastInitial === undefined) {
  return displayName.trim().slice(0, INITIALS_MAX_LENGTH).toUpperCase();
}
return (firstInitial + lastInitial).toUpperCase();
```

`laterInitials.at(-1) === undefined` holds exactly when there was one word,
which is the branch the old code tested separately as `length === 1`.

And `pre-push` now runs the per-app coverage gate for every application that
changed on the branch — `test:core` where it exists, since the full-stack apps'
`test:coverage` wants a Postgres, and `test:coverage` otherwise. Same scripts
`ci.yml` runs, resolved from `package.json` rather than a hard-coded list.

## Eradication

**Level 2 — DevX check.** The gate that caught this now runs before the push
that would have carried it. Verified on this branch, which touches all four
applications:

```
would run: pnpm --filter @borso-app/borso-fr run test:coverage
would run: pnpm --filter @borso-app/borsouvertures run test:coverage
would run: pnpm --filter @borso-app/last-loop-lepin run test:core
would run: pnpm --filter @borso-app/pragma run test:core
```

The rewrite holds both gates: `test:core` exits 0 with 730 tests, and a scoped
Stryker run over the file alone reports `100.00`, 0 survivors, in 25 seconds.

Level 1 was considered — a lint rule banning `??` where the left side is
non-nullable. `@typescript-eslint/no-unnecessary-condition` is exactly that rule
and it did not fire here, because `.at()` genuinely returns
`string | undefined` under `noUncheckedIndexedAccess`. The type system does not
know what the surrounding guards establish, so no type-aware rule can. That is
the argument for keeping the coverage gate rather than replacing it.

## What to check next time

Do not read one gate's verdict as another's. Coverage and mutation testing
overlap enough to feel redundant and are not: coverage finds code no test
reaches, mutation finds code no test *checks*. Dead code beside a live operator
is invisible to the second and obvious to the first.

The narrower rule: when `noUncheckedIndexedAccess` pushes you into a `??` after
an index or an `.at()`, ask whether the surrounding code already guarantees the
value. If it does, restructure so the compiler can see it — usually by
destructuring — rather than writing a fallback that can never be taken.

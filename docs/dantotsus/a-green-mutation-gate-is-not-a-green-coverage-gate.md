---
date: 2026-08-09
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#40'
fix-commits: [d49af83ae0]
eradication-level: 2
eradication-paths: [.husky/pre-push, docs/knowledge/writing-a-small-function-the-hundred-percent-gates-accept.md]
time-to-detect: one push
tags: [stryker, vitest, coverage, mutation, gates, pre-push]
zone: .husky/pre-push
weak-point: gate-measures-nothing
recurs: [a-gate-that-reported-success-while-measuring-nothing]
---

# A green mutation gate is not a green coverage gate

## User impact

A session pushed after forty minutes of `pre-push`, which reported the mutation gate at **100.00% with zero survivors on all four applications**. CI went red four minutes later on a file that gate had just measured:

```
ERROR: Coverage for branches (91.66%) does not meet global threshold (100%)
       for site/src/lib/initials.utils.ts
```

| | Seen | Expected |
| --- | --- | --- |
| `pre-push` on PR #40 | Green, mutation 100% on `initials.utils.ts` | A refusal for the uncovered branch |
| CI | Red on the same file, same commit | The same verdict as `pre-push` |

## Causal chain

- CI's coverage gate refused `initials.utils.ts` at 91.66% branches.
  - One branch never ran. The rewritten line carried a fallback no input can reach:

    ```ts
    const lastInitial = wordInitials.at(-1) ?? firstInitial;   // ← the ?? branch is dead
    ```

    By that line `firstInitial` is defined and `wordInitials.length !== 1`, so the array holds at least two entries and `.at(-1)` is never `undefined`.
    - An agent wrote this line in 815eb19b7, "test(last-loop-lepin): kill the surviving site core and lib mutants". It added `?? firstInitial` because `noUncheckedIndexedAccess` types `.at(-1)` as `string | undefined`, whatever the guards above establish (Machine).
  - Stryker killed the mutant on that line. Its `LogicalOperator` mutator turns `??` into `&&`, which yields `firstInitial` for a two-word name, so a test noticed. No mutant takes the right-hand branch, so v8 still counted it as never run.

## Root cause of occurrence

*Thought the type of `.at(-1)` described the value at that line, so a fallback was needed. Actually the guards above had already made it defined, and the type cannot see them, so the fallback is a branch no input reaches.* (Machine)

The compiler setting asks for a fallback on every index read, and offers it as the safe choice. The sweep's own feedback was a mutation run, which asks whether a test would notice a change, not whether a line ran. A dead branch beside a live operator passes the first and fails the second.

## Detection failure causes

- **Pre-push:** it ran the `infra/cdk` and `infra/shared` coverage suites and the four apps' mutation suites, but never the apps' own coverage gate. Forty minutes of Stryker ran locally, and ninety seconds of coverage ran only in CI.
- **Lint:** `@typescript-eslint/no-unnecessary-condition` did not fire, because `.at()` really returns `string | undefined` under `noUncheckedIndexedAccess`. No type-aware rule knows what the surrounding guards establish.
- **Review:** `?? firstInitial` reads as careful defensive code, so a reader has no reason to stop on it.

## Countermeasure

Commit `d49af83ae` deleted the dead branch. Destructuring the tail makes the single-word case and the "no last initial" case the same case, so both branches are reachable and tested:

```ts
const [firstInitial, ...laterInitials] = wordInitials;
if (firstInitial === undefined) return NO_NAME_INITIALS;
const lastInitial = laterInitials.at(-1);
if (lastInitial === undefined) {
  return displayName.trim().slice(0, INITIALS_MAX_LENGTH).toUpperCase();
}
return (firstInitial + lastInitial).toUpperCase();
```

`test:core` exited 0 with 730 tests, and a scoped Stryker run over the file reported 100.00 with 0 survivors (measured on PR #40).

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `d49af83ae` (PR #40), which added the per-app coverage gate to `pre-push`. It has since become a `--changed` run per changed app, in `.husky/pre-push`:

```sh
start_gate "tests-$app" \
  pnpm --filter "@borso-app/$app" exec vitest run --project core --changed "$push_base" --coverage
```

The gate that caught this now runs before the push. A dead fallback in a gated file is refused locally, whichever sweep wrote it.

The shape itself reaches the next writer too. `docs/knowledge/writing-a-small-function-the-hundred-percent-gates-accept.md` names "a `noUncheckedIndexedAccess` guard no test reaches", and its `triggers:` fire on any edit to a `*.core.ts`, `*.utils.ts` or `*.adapter.ts` file.

Level 1 is out of reach. A rule refusing `??` on a value the guards make defined needs the guards in the type, and `noUncheckedIndexedAccess` gives every index read `| undefined`.

**Proof it can fail:** on PR #40 the new step listed the four apps' coverage runs and, before the countermeasure, refused `initials.utils.ts` (measured then). `the-coverage-gate-a-wrong-comment-kept-in-ci` records the `--changed --coverage` form refusing an uncovered tree in 7 s.

**Similar instances:** `grep -rn "\.at(-1) ??" apps --include=*.ts | grep -v test` finds three today (four without the filter, the fourth in `pirate-editor.core.test.ts`), in `labours.core.ts`, `deck-build.core.ts` and `task-walks.setup.ts`. The two gated files pass the coverage gate on `main`, so their fallbacks are reached (inferred from CI being green). The third is a setup script outside the gate.

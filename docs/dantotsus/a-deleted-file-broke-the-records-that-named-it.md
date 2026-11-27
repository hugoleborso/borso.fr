---
date: 2026-10-29
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#224'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/quality/dantotsu-corpus.ts, scripts/quality/weak-points.ts, scripts/quality/check-dantotsu-front-matter.ts]
time-to-detect: days
tags: [gates, quality, self-improvement-loop, generators, meta]
zone: scripts/quality/weak-points.ts
recurs: none (the first entry where two readers of one record disagreed on what a path is)
---

# A deleted file broke the records that named it

## User impact

The users were the sessions that build the reports and the operator who reads the weak-point map. On 2026-10-29 `scripts/reports.sh all` failed on `main` (friction log `docs/features/pragma/ux-redesign/kaizen.md`, `merge-main`, 08:23). PR #216 then made it pass by rewriting nine dantotsus' zones to files the defects never lived in, such as `scripts/phone.sh` and `.husky/pre-commit`. The map then placed nine past defects in the wrong place.

| | Seen | Expected |
| --- | --- | --- |
| `scripts/reports.sh all` after PR #224 | Fails: `zone scripts/argent.sh names no path in the repository`, and eight more | Builds the map, with each defect where it lived |
| The map after PR #216 | Nine defects drawn on files they never touched | Nine defects drawn on the deleted files that held them |

<details><summary>The failure</summary>

```text
  the-tap-that-was-a-mouse-press: zone scripts/argent.sh names no path in the repository
  the-wrapper-forgot-the-user-agent-between-calls: zone scripts/browser.sh names no path in the repository
```

</details>

## Causal chain

- `scripts/reports.sh all` failed, and PR #216 moved nine zones to make it pass.
  - `weak-points.ts` refused nine zones, because it checked each one against `git ls-files`, the files present now.

    ```ts
    // scripts/quality/weak-points.ts, from 702c1b2d7 until this commit
    const problems = selectUnresolvedReferences(dots, readTrackedPaths(), engaged); // ❌ "exists now"
    ```

    - PR #224 (`c54e32da7`, 2026-10-29) deleted `scripts/argent.sh`, `scripts/browser.sh` and four gate scripts. Nine dantotsus named one of them in `zone:`.
      - The same PR taught the commit-time reader that a deleted path still counts. It added a private `readPathsEverTracked` inside `check-dantotsu-front-matter.ts`, and left `readTrackedPaths` in the shared `dantotsu-corpus.ts`, which `weak-points.ts` still called.

        ```diff
        +function readPathsEverTracked(): ReadonlySet<string> {
        +  const paths = new Set(readTrackedPaths());
        +  for (const path of runGit(['log', '--format=', '--name-only', '--diff-filter=A', 'HEAD']).split(
        ```

        - The shared module offered one definition of "a path in the repository", and the fix for the new one was written beside its only caller in view. Two readers of one field now held two definitions. (Machine)
  - The strict reader's message said "point the zone at the path where the defect lived", which the zones already did. Moving them was the only way to make it pass.

## Root cause of occurrence

*Thought the front-matter check was the one reader of a dantotsu's paths, actually `weak-points.ts` read the same `zone:` field through the shared `readTrackedPaths`, which still meant "exists now".*

Machine. The writer of `c54e32da7` knew the right definition, since it wrote it. The codebase kept the path set in a shared module, and the new definition went into one caller instead of that module. `weak-points.ts` runs only in `pages.yml` after a merge and in `scripts/reports.sh`, so nothing the writer ran showed the second reader failing.

## Detection failure causes

- **Commit hook:** it ran only the lenient reader, so the strict one ran when somebody built the reports.
- **CI:** `pages.yml` runs `weak-points.ts` after a merge, not on a pull request, so PR #224 merged green.
- **Code review:** the deletion, the private reader and the nine records were in different folders.

## Countermeasure

This commit restores the nine original zones, `EnergyBar.tsx` and the three gates PR #224 deleted among them.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit adding this file, in the kaizen pull request for PRs #216 and #231.

`readPathsEverTracked` moved into `dantotsu-corpus.ts`, and both readers call it. `readTrackedPaths` is gone, so there is one definition and a deletion cannot break a record.

```diff
-  const problems = selectUnresolvedReferences(dots, readTrackedPaths(), engaged);
+  const problems = selectUnresolvedReferences(dots, readPathsEverTracked(), engaged);
```

Both `scripts/quality/weak-points.ts` and `scripts/quality/check-dantotsu-front-matter.ts` import it today, and no `readTrackedPaths` remains (measured with `grep -rn readTrackedPaths scripts/quality`).

**Proof it can fail:** with the restored zones, the reader from `main` refused, and the shared reader wrote the map with 227 dots and exited 0 (recorded when this shipped). A zone that was never in the repository still fails both readers.

```text
  the-tap-that-was-a-mouse-press: zone scripts/argent.sh names no path in the repository
  the-wrapper-for-driving-previews-could-not-reach-one: zone scripts/argent.sh names no path in the repository
exit 1
```

**Similar instances:** `grep -rn "ls-files" scripts/quality/*.ts | grep -v test` finds `dantotsu-corpus.ts`, the shared reader, and `working-conditions.ts`, which lists feature folders that exist now on purpose. [`the-link-checker-skipped-the-folder-it-was-trusted-for.md`](./the-link-checker-skipped-the-folder-it-was-trusted-for.md) and [`the-runner-called-a-script-main-had-deleted.md`](./the-runner-called-a-script-main-had-deleted.md) are the same deletion seen from other readers.

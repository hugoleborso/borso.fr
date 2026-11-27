---
date: 2026-08-20
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#63'
fix-commits: [cb69f25248, 79be245e0]
eradication-level: 2
eradication-paths: [scripts/pre-push-range.sh, scripts/pre-push-range.test.ts, .husky/pre-push]
time-to-detect: 40 minutes
tags: [git, tooling, ci, husky, testing]
zone: .husky/pre-push
recurs: [a-stale-ref-priced-a-one-line-push-at-fifty-minutes]
---

# The scoped gate that charged me for all of main

## User impact

The operator pushed PR #63's branch after merging `main` into it. The push gate ran the tests of four applications and mutated 78 files, for a push whose own work was 23 files. It timed out twice before it was clear the hook was not broken. The branch had been open two days and `main` had moved 46 commits. Ordinary pushes, with no merge in them, were not affected.

| | Seen | Expected |
| --- | --- | --- |
| Push after merging `main` | `[pre-push] gating 491 changed file(s) — range: this push`, `borso-fr: mutating 78 changed gated file(s)` | 23 files gated, the branch's own work |

## Causal chain

- The push that merged `main` gated 491 files and timed out twice.
  - `git diff --name-only <remote sha> HEAD` listed 491 files. The push carried a merge commit, so everything `main` did since the branch's last push sat in the same range as the branch's three commits.
    - The hook diffed against the remote sha of the branch being pushed, and nothing else.

      ```bash
      # .husky/pre-push, as added in 9fc3b9a40
      push_base="$remote_sha"
      changed=$(git diff --name-only "$push_base" HEAD) # ❌ a merge brings all of main's new commits into this range
      ```

      - Commit `9fc3b9a40` (2026-08-09, written by an agent) set that base to replace `merge-base HEAD origin/main`, which re-gated the whole branch on every push. Its message says "all four cases were exercised before this landed": a new branch, an empty stdin, an unresolvable remote sha and an ordinary push. A merge was not one of them.
        - The base computation lived inline in a shell hook that reads git's stdin protocol, with no test harness. Each case was replayed by hand in a throwaway repository and kept nowhere. (Machine)

## Root cause of occurrence

*Thought the commits new to this ref are the commits this push adds, actually a merge commit makes those two sets differ by the whole of the base branch, which `full-suite.yml` had already gated on `main`.*

Man, under the agentic rule. The same commit wrote the principle that disproves the code. Its message says pre-push proves "only the commits being pushed", and moves the full suite to `main` as the backstop. The principle was in the agent's context, and the four shapes it replayed by hand did not include a merge. The chain's last why is a Machine condition: a fix tried by hand and kept nowhere can be undone by the next fix unseen. `scripts/pre-push-range.sh` records exactly that later: "fixed four times, each time replayed by hand in a throwaway repository and never kept as a test".

## Detection failure causes

- **Typing / linter:** it is a shell script. `sh -n` accepted it.
- **Tests:** the hook had none. Its range logic sat inline between a stdin read and four package-manager calls, so no test could reach it without running the whole hook.
- **Local validation:** it ran correctly on every ordinary push for eleven days. A merge push is rarer, and its failure looks like slowness rather than a wrong answer.
- **CI:** it does not run the push hook.

## Countermeasure

Commit `cb69f2524` (PR #71) re-based a push that merges `main` onto main's tip. If `origin/main` is reachable from `HEAD` and not from the remote sha, the merge is inside this push, and diffing against main's tip leaves exactly the branch's own work. A file the branch took verbatim from `main` drops out, correctly, since `full-suite.yml` gated it there. A file either side changed still differs and is still gated. Measured on `9b2ff2b`: the merging push gated 23 files instead of 491. An ordinary push gated 1, unchanged.

## Eradication

**Type:** DevX check (level 2).

**Reference:** commit [`cb69f252`](https://github.com/hugoleborso/borso.fr/commit/cb69f25248) fixed the merge case. Commit [`79be245e0`](https://github.com/hugoleborso/borso.fr/commit/79be245e0) (PR #208) moved the whole base computation out of the hook into a tested script, which is what holds the class today.

```bash
# .husky/pre-push
range=$(scripts/pre-push-range.sh "$push_base")
```

`scripts/pre-push-range.test.ts` builds real git repositories and plants each shape the earlier fixes named: a new branch, a rewritten branch, a push that merges `main` in, a later push after that merge, and a merge that resolved a conflict. The root `vitest.config.ts` includes `scripts/**/*.test.ts`, and `.github/workflows/ci.yml` runs it (`pnpm exec vitest run --coverage`). A change to the range that undoes an earlier case now fails a test.

**Proof it can fail:** the case "gates neither main nor the work already pushed when the push merges main in" asserts the label `this push, minus the commits it merged from origin/main` (read this session). Reverting `scripts/pre-push-range.sh` to the base of `9fc3b9a40` would fail it (inferred, not replayed).

**Similar instances:** [`the-merge-that-re-gated-the-whole-branch.md`](./the-merge-that-re-gated-the-whole-branch.md) is the fourth fix of the same range, and the one that extracted the script. [`a-stale-ref-priced-a-one-line-push-at-fifty-minutes.md`](./a-stale-ref-priced-a-one-line-push-at-fifty-minutes.md) is the earlier cost of the same base. The same sweep found two generators gated on "a `.ts` file is staged" while they also read `docs/dantotsus/`. Each now triggers on the union of its real inputs.

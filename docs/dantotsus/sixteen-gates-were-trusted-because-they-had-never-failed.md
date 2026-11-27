---
date: 2026-10-10
introduced-at: conception
detected-at: review
severity: high
related-pr: '#40'
fix-commits: [2e656e8e]
eradication-level: 5
time-to-detect: months, sixteen times
tags: [gates, ci, hooks, coverage, mutation, eslint, testing, process]
blueprints: [test-artifact-audit]
eradication-paths: [.claude/skills/dantotsu/SKILL.md, stryker-zero-test-guard.js, eslint-rules/disable-directives.test.js]
zone: scripts/standards
recurs: [a-gate-that-reported-success-while-measuring-nothing]
---

# Sixteen gates were trusted because they had never failed

## User impact

Every developer of the repository got a green tick on a change that was wrong,
while a standard said the change could not pass. Between 2026-05-14 and
2026-10-05, sixteen dantotsus in this folder found a gate that reported success
while it measured nothing. Each was found by accident and fixed on its own.

| | Seen | Expected |
| --- | --- | --- |
| A change breaking a gated rule | green CI, green hooks | a refusal naming the rule |

<details><summary>The sixteen gates</summary>

| Date | Dantotsu | What the gate was doing |
|------|----------|-------------------------|
| 05-14 | [biome-lint-was-not-gated-anywhere](./biome-lint-was-not-gated-anywhere.md) | the linter ran in no hook and no workflow; 47 errors sat on `main` |
| 05-25 | [biome-formatter-was-not-gated](./biome-formatter-was-not-gated.md) | the formatter ran nowhere either |
| 08-08 | [per-file-coverage-gate-was-never-armed](./per-file-coverage-gate-was-never-armed.md) | the 100% thresholds sat in a block Vitest ignores |
| 08-08 | [a-gate-that-reported-success-while-measuring-nothing](./a-gate-that-reported-success-while-measuring-nothing.md) | four gates at once, including an exit code lost in a pipe |
| 08-08 | [a-mutation-config-a-workspace-file-overruled](./a-mutation-config-a-workspace-file-overruled.md) | Stryker on two applications aborted in its dry run and never reached a mutant |
| 08-09 | [a-green-mutation-gate-is-not-a-green-coverage-gate](./a-green-mutation-gate-is-not-a-green-coverage-gate.md) | a push cleared every mutation run and CI's coverage gate went red four minutes later |
| 08-14 | [three-green-gates-on-code-that-ran-nowhere](./three-green-gates-on-code-that-ran-nowhere.md) | coverage, mutation and knip all passed a module only its own test called |
| 08-15 | [a-sed-delimiter-disarmed-the-mutation-gate](./a-sed-delimiter-disarmed-the-mutation-gate.md) | the push hook never pulled a changed test's source into the mutation run |
| 08-18 | [two-guard-hooks-that-never-guarded](./two-guard-hooks-that-never-guarded.md) | two refusing hooks let the command they were written for run |
| 08-20 | [the-tooling-that-gates-everything-was-checked-by-nothing](./the-tooling-that-gates-everything-was-checked-by-nothing.md) | no type checker read `scripts/`, `eslint-rules/` or `.claude/skills/` |
| 08-20 | [the-mutants-were-judged-by-the-wrong-jury](./the-mutants-were-judged-by-the-wrong-jury.md) | five mutants survived a test that asserted every string they changed |
| 08-21 | [the-hook-guarded-every-form-but-the-documented-one](./the-hook-guarded-every-form-but-the-documented-one.md) | the body hook refused the shapes it knew while placeholders the server deletes went through |
| 08-21 | [the-invariant-test-read-a-file-stryker-was-rewriting](./the-invariant-test-read-a-file-stryker-was-rewriting.md) | a test meant to hold two files equal read the copy Stryker had mutated |
| 09-16 | [the-threshold-was-measured-and-left-unguarded](./the-threshold-was-measured-and-left-unguarded.md) | a link the body hook let through came back from the server dead |
| 09-18 | [the-test-that-no-project-collected](./the-test-that-no-project-collected.md) | a test file matched no project's include, so it never ran |
| 10-05 | [vitest-5-ran-no-test-against-any-mutant](./vitest-5-ran-no-test-against-any-mutant.md) | after a dependency bump Stryker ran zero tests per mutant |

</details>

## Causal chain

- Sixteen gates exited 0 on changes they existed to refuse.
  - Each gate's mechanism measured nothing: a configuration key where the tool
    does not read it, a flag on the wrong script, an exit code lost in a pipe,
    a glob that matched nothing, a test reading the wrong file, a bump that
    changed what a runner does.
    - Each gate was written from its configuration and trusted once it ran
      green. `thresholds: { perFile: true }`, `stryker run` and a printed score
      are what a working gate looks like.
    - On 2026-08-08, `a-gate-that-reported-success-while-measuring-nothing`
      named the class fix, *a meta-check asserting that every declared gate
      actually fails on a planted defect*, called it buildable, and did not
      build it. The twelve later rows came after it.

## Root cause of occurrence

*Thought a gate that had passed every run so far was a gate that worked,
actually a gate has shown that it works only once it has failed on a defect
someone planted for it, and none of ours ever had to.* (Method)

The process for adding a gate ended at "it runs green". Had each author broken
their gate on purpose before trusting it, each defect would have shown on the
day the gate was written.

## Detection failure causes

- **Linter:** the enforcement ledger checked that a standard named a mechanism
  that exists and that a hook or workflow mentioned it. It never asked the
  mechanism to do anything.
- **CI:** CI runs each gate on code meant to be clean. A gate that cannot fail
  and a gate with nothing to fail on give the same green job.
- **Review:** a reviewer reads the gate's configuration, which looked right
  every time.
- **Monitoring:** a gate has no user, so a gate that stops working has nobody
  to complain.

## Countermeasure

2e656e8ee (PR #164) shipped `scripts/standards/gate-canaries.ts` and its
registry. It planted one defect per gate in a copy of the tree, 131 canaries,
and failed CI when a gate exited 0 on its canary, failed without naming it, or
had none. Its first run found two live instances: the last-loop-lepin migration
audit could not parse `CREATE TABLE IF NOT EXISTS`, and the root, `infra/cdk`
and `infra/shared` coverage configs set `perFile` outside `thresholds`. Both
were fixed.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit 2e656e8ee added the canaries. Commit c54e32da7
(2026-10-29, PR #224) deleted them by operator decision, with their CI jobs
(176 s and 332 s per run, and 2 of the last 10 failed runs, as its message
measured). Its message says: "The proof that a gate can fail moves from a
standing canary tool to the /dantotsu skill: a new check is shown refusing the
reintroduced defect once, in the entry that adds it."

What holds today:

- `.claude/skills/dantotsu/SKILL.md` asks each eradication to be tried: "plant
  the defect on a scratch copy, run the check, paste its refusal here, revert."
  That proves a gate on the day it ships. It is a written step.
- Two gates carry a standing proof. `stryker-zero-test-guard.js` fails a
  mutation run in which a covered mutant ran zero tests, the vitest-5 case.
  `eslint-rules/disable-directives.test.js` plants a disable directive in a
  copy of the tree and runs the real `oxlint` on it.

The class is open again. A gate disarmed later by a bump or a config move, as in
`vitest-5-ran-no-test-against-any-mutant`, is caught by nothing except where one
of those two proofs happens to cover it.

**Proposed:** a cheaper standing proof than the canary runner. Give each gate a
Vitest suite beside it that plants its defect and runs the gate, the shape
`eslint-rules/disable-directives.test.js` already has. The root
`vitest.config.ts` collects `eslint-rules/**/*.test.js` and
`scripts/**/*.test.ts`, and `.github/workflows/full-suite.yml` runs them
unscoped on main. A bump that disarms a gate then turns main red on the next
full suite, with no separate registry or CI job. It does not exist beyond the
two gates above.

**Proof it can fail:** the canary runner's first run, above, refused two gates.

**Similar instances:** the sixteen in the table above.

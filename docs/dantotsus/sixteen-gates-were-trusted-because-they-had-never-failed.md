---
date: 2026-10-10
introduced-at: conception
detected-at: measurement
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-pr: this PR (claude/gate-canaries)
fix-commits: []
eradication-level: 2
time-to-detect: months, sixteen times
tags: [gates, ci, hooks, coverage, mutation, eslint, testing, process]
blueprints: [test-artifact-audit]
---

# Sixteen gates were trusted because they had never failed

## Symptom

Between 2026-05-14 and 2026-10-05, sixteen dantotsus in this folder found a
gate that reported success while it measured nothing. Each was found by
accident, usually while someone was looking at something else, and each was
fixed on its own:

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

From the developer's side every one of these looked the same: a green tick on
a change that was wrong, and a rule in a standard that said the change could
not have passed.

## Root-cause chain

1. **Why did each gate pass?** Sixteen different mechanisms: a configuration
   key in a place the tool does not read, a flag on the wrong script, an exit
   code destroyed by a pipe, a glob that matched nothing, a test that ran
   against the wrong file, a dependency that changed what a runner does.
2. **Why did nobody see it?** A gate that measures nothing looks exactly like
   a gate that measures something and finds nothing wrong. Both exit 0. Both
   print a table.
3. **Why was a gate believed?** Because it was read, not broken. The config
   said `thresholds: { perFile: true }`, the hook said `stryker run`, the log
   printed a score. Each of those is what a working gate looks like.
4. **Why did the fix not spread?** Each dantotsu fixed its own gate. The
   fourth entry, `a-gate-that-reported-success-while-measuring-nothing`, named
   the class fix in its Eradication section: *a meta-check asserting that every
   declared gate actually fails on a planted defect*. It said it was buildable
   and was not built. Every later row in the table above came after it.

**Root cause:** we thought a gate that had passed every run so far was a gate
that worked, but actually a gate has only shown that it works once it has
failed on a defect someone planted for it, and none of ours ever had to.

If that had been known, each author would have broken their gate on purpose
before trusting it, and the defect would have shown on the day the gate was
written rather than weeks or months later.

## Detection failure causes

- **Linter / static analysis:** the enforcement ledger checks that a standard
  names a mechanism that exists and that a hook or workflow mentions it. It
  never asks the mechanism to do anything, so a gate wired into the right file
  with the wrong flag resolves as `yes`.
- **CI:** CI runs each gate once, on code that is supposed to be clean. A
  gate that cannot fail and a gate that has nothing to fail on produce the
  same green job.
- **Code review:** a reviewer reads the gate's configuration, which in every
  one of these cases looked right. Several were reviewed by the person who
  wrote the standard describing them.
- **Monitoring:** none. A gate has no user, so a gate that stops working has
  nobody to complain.

## Countermeasure

`scripts/standards/gate-canaries.ts` and its registry,
`scripts/standards/canary-registry.ts`. Every gate gets a canary: a small
defect the gate must refuse. The runner copies the working tree into a
temporary directory, plants each canary there, runs the gate the way its hook
or workflow runs it, and fails when:

- the gate exits 0 on its canary, or
- the gate exits non-zero without naming the planted defect, which means it
  failed for some other reason and has not shown it saw the defect, or
- a gate has no canary at all.

The list of gates is not maintained by hand. It is every mechanism the
enforcement ledger resolves (custom and third-party ESLint rules, scripts,
generators, the named gates, test gates, type declarations), every tracked
`scripts/**/check-*` file, and every generator a hook or workflow runs with
`--check`. A new check script, a new rule, or a new citation in a standard
fails the runner until someone plants a defect for it. A mechanism that gates
nothing by design is listed in `MECHANISMS_THAT_GATE_NOTHING` with its reason:
`check-branch-context.sh` only prints a warning, and the standard says
`rule-provenance.ts` gates nothing.

The ESLint rule canaries reuse the RuleTester suites rather than duplicating
them: `eslint-rules/rule-tester.js` records each suite's invalid cases when
`GATE_CANARY_CASES` names a file, and the runner lints the first one through
the repository's real configuration, at the path the case names. A suite
proves the rule's logic; the canary proves the rule is switched on where the
case says it should fire. Where a suite's paths do not exist in the tree
(`no-component-css-imports` tests a `components/` folder `borso-fr` does not
have), the registry supplies the canary instead.

The 131 canaries, run on 2026-10-10 against this branch:

| Gate | Canaries | Defect planted |
|------|----------|----------------|
| custom ESLint rules | 39 | first invalid case of each rule's own suite |
| third-party ESLint rules | 11 | an `any`, a magic number, a missing hook dependency, … |
| `eslint` gate | 1 | a warning-severity violation, which only `--max-warnings 0` turns into a failure |
| `lint-repository.sh` | 1 | an explicit `any` in the tooling outside every workspace |
| `eslint-rule-suites` | 1 | a rule whose `context.report` call was deleted |
| `prettier`, `knip`, `actionlint`, `commitlint` | 4 | a misformatted file, an unused module, a misspelt workflow key, an untyped commit message |
| `typecheck` | 4 | a type error in the tooling, both infra packages and a CDK app |
| `react-i18next.d.ts` | 6 | a translation key no catalogue holds, typechecked per site |
| `i18n-parity.core.test.ts` | 4 | a key only the English catalogue has |
| `vitest-coverage` | 9 | a pure file with one branch untested, in every workspace with a threshold |
| `stryker` | 8 | a pure file whose test asserts nothing, in every mutated workspace |
| `migrations.audit.test.ts` | 3 | a migration with `DEFAULT now()` |
| `vitest-back-e2e` | 4 | a failing repository test |
| check scripts and generators | 36 | one per script, from a duplicate ADR number to a NUL byte; one is this runner's own, a check script with no canary |

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — a gate over the gates)

**Reference:** this PR, branch `claude/gate-canaries`

**The actual fix:**

```diff
+ scripts/standards/gate-canaries.ts      the runner
+ scripts/standards/canary-registry.ts    one canary per gate, and the gates that gate nothing
+ scripts/standards/canaries.core.ts      inventory and verdicts, 100% covered and mutated
+ scripts/standards/canary-workspace.ts   the throwaway copy of the tree
+ scripts/standards/canary-rule-cases.ts  RuleTester cases as lint canaries
+ scripts/standards/ledger-input.ts       the ledger's enumeration, shared with the runner
  eslint-rules/rule-tester.js             records invalid cases when GATE_CANARY_CASES is set
  .github/workflows/ci.yml                + gate-canaries job, one run per tier
  vitest.config.ts, infra/*/vitest.config.ts   perFile under thresholds, where Vitest reads it
  apps/last-loop-lepin/api/src/database/migrations.audit.test.ts   reads CREATE TABLE IF NOT EXISTS
  docs/standards/12-linting-and-gates.md  + "Every gate has to fail once, on purpose"
```

It is level 2, not level 1. A level-1 fix would make a gate that cannot fail
impossible to write, and nothing in a shell script or a Vitest configuration
can be made to refuse that by construction. What this does reach is the
moment: a gate can no longer be added, or quietly broken by a bump, without a
planted defect proving it still fails, and the proof runs on every pull
request.

**What it does not cover**, so nobody reads more into a green job than it
says:

- It runs each gate's command, not the hook around it. A hook that calls the
  gate and then throws its exit code away, the way `stryker run | tail` did in
  `a-gate-that-reported-success-while-measuring-nothing`, still passes. The
  ledger checks that the hook names the gate; nothing checks what the hook
  does with the answer.
- It runs Stryker with `--mutate` on the planted file, not the push hook's
  logic for choosing which files to mutate. The defect in
  `a-sed-delimiter-disarmed-the-mutation-gate` lived in that choice.
- Every canary is a negative control. A gate that fails on everything also
  refuses its canary.

**Sibling defects swept:** the first full run found two live instances of
the class.

The migration audit in `last-loop-lepin` passed its canary. Its
`CREATE TABLE` pattern did not allow `IF NOT EXISTS`, so it never read
`0002_admin_auth_tables.sql`, whose two tables both carry `DEFAULT now()`.
The test asserted that the migrations folder was not empty, found no
occurrence in the file it could not parse, and passed. `pragma` and `talos`
had already widened the pattern in their own copies; this one is the
`test-artifact-audit` blueprint, so it was the shape new audits were copied
from. The pattern now allows `IF NOT EXISTS`, the file also reads
`ADD COLUMN … DEFAULT now()` as the other two do, and the two columns it
now sees, `admin_credentials.updated_at` and `admin_sessions.created_at`,
join the allow list: no code reads either, which is the same reason
`auth_attempts.created_at` was already on it.

The second was in the coverage gate the fourth dantotsu had already fixed
once.
The root `vitest.config.ts` carried `perFile: true` directly under
`coverage`, where Vitest does not read it; the option lives under
`coverage.thresholds`. `infra/cdk` and `infra/shared` had no per-file
threshold at all. All three were enforcing a single global 100%, which on a
clean tree happens to demand the same thing, so nothing passed that should
have failed. The canary still caught it: a global threshold fails without
naming any file, so the gate could not show which file it refused, and the
run reported "failed, but not on the planted defect" for all three. The key
now sits under `thresholds` in all three configs, and the three canaries
refuse by name.

```diff
   coverage: {
     provider: 'v8',
     include: ['scripts/**/*.{core,utils}.ts'],
-    perFile: true,
-    thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
+    thresholds: { perFile: true, statements: 100, branches: 100, functions: 100, lines: 100 },
   },
```

No other gate passed its canary. The sixteen defects above were each fixed
before this existed, and the run confirms those fixes still hold. Two other
canaries failed for the wrong reason on the first run, and both were mistakes
in the canary, not the gate: a rule suite naming a `components/` folder that
`borso-fr` does not have, and a link checker that reads only tracked files,
so its canary has to be staged.

## See also

- [`docs/standards/12-linting-and-gates.md`](../standards/12-linting-and-gates.md),
  *Every gate has to fail once, on purpose*
- [`docs/knowledge/the-shell-gates-are-only-ever-run-where-they-pass.md`](../knowledge/the-shell-gates-are-only-ever-run-where-they-pass.md)

---
date: 2026-05-25
introduced-at: implementation
detected-at: review
severity: low
related-pr: 27
fix-pr: 27
fix-commits: [dc6684d, 82f0e29]
eradication-level: 2
time-to-detect: minutes
tags: [claude-md, harness, hooks, pre-commit, ci, self-improvement-loop]
---

# Wrote off a failing test as "preexisting" and moved on

## Symptom

During PR #27 the local `pnpm run test:core` failed on
`cdk/test/stack.test.ts` with :

```
Failed to resolve entry for package "@borso/infra".
The package may have incorrect main/module/exports specified in
its package.json.
```

Reflex was to qualify the failure as *preexisting* (i.e. "not
introduced by my diff") and proceed. The user pushed back hard
in all caps :

> "NO ISSUE IS PRE EXISTING. CD ensures it is not the case. Write"

CI ran the same gate in `.github/workflows/ci.yml` and *did*
green-light it — but only because CI explicitly sequenced
`pnpm --filter @borso/infra build` before `test:core`. Locally,
nothing primed `infra/cdk/dist/`, so the import resolved to
nothing and the test errored.

## Root-cause chain

1. **Why?** CDK test depends on the compiled output of
   `@borso/infra` (cross-workspace consumer). The local
   `test:core` script didn't list that build as a prerequisite.
2. **Why?** When CI shipped the workspace, the build was added
   to the workflow YAML rather than to the script in
   `package.json`. The harness was correct on CI ; the local
   gate was missing that one step.
3. **Why?** The agent saw a red local test, didn't connect it
   to the workspace-build step CI was doing, and labelled it
   "preexisting" — moving past it. The behavioural failure mode
   is broader than this one PR : *"a failure I didn't introduce
   isn't mine to fix"*.

**Root cause:** *thought local test failures with no obvious link
to the diff are out of scope, actually any failing gate ON the
branch IS in scope — CI runs the same gate and will block the
PR, or worse a future regression slips in mislabelled as inert.*

## Detection failure causes

- **CI:** Caught the failure mode in its own context (build +
  test), masking the gap in the local harness.
- **Pre-commit:** Didn't run the failing test (test:core is
  pre-push, not pre-commit).
- **Convention / culture:** No CLAUDE.md rule explicitly forbade
  the "preexisting" carve-out. The user had to surface it
  in-thread.

## Countermeasure

Two parallel eradications :

1. Add a hard rule to CLAUDE.md under *Tone & rigor* :
   > "Preexisting" is not an excuse. If a test fails, a build
   > breaks, a linter shouts — fix it, regardless of who
   > introduced it or when. … Investigate, then either fix the
   > underlying issue or fix the harness so it can't fire
   > spuriously (e.g. a missing `pnpm --filter <pkg> run build`
   > prerequisite belongs in the workspace's test script). Never
   > qualify a failure as "preexisting" and move on.
2. Apply the rule immediately to the specific harness gap that
   caused this failure — add `pnpm --filter @borso/infra run
   build &&` to `test:core` (and `test:coverage`) in
   `apps/last-loop-lepin/package.json` so the local gate is
   self-contained.

## Eradication shipped

**Type:** knowledge addition + code diff (level 2 — pre-flight
prerequisite landed in the workspace script, and CLAUDE.md rule
now governs how future "preexisting" claims are treated)

**Reference:** PR #27 · commits
[`dc6684d`](https://github.com/hugoleborso/borso.fr/commit/dc6684d)
(CLAUDE.md rule) +
[`82f0e29`](https://github.com/hugoleborso/borso.fr/commit/82f0e29)
(also bundled the same theme via `test:core` prerequisite)

**The actual fix (CLAUDE.md):**

```diff
+- **"Preexisting" is not an excuse.** If a test fails, a build
+  breaks, a linter shouts — fix it, regardless of who
+  introduced it or when. CI gates every PR with the same
+  suites, so a failure you walk past is a failure that will
+  block the next push or, worse, a regression you
+  mislabelled. …
```

**The actual fix (test:core script):**

```diff
-"test:core": "vitest run --project core",
+"test:core": "pnpm --filter @borso/infra run build && vitest run --project core",
```

**Sibling defects swept:** none — but the rule applies the next
time the agent feels the urge to label something "preexisting".
The orphan `OUT_OF_ZONE_*` constants cleaned up at the same time
(left dead by an earlier geofence removal) were the immediate
test of the rule.

## See also

- [`CLAUDE.md`](../../CLAUDE.md) — *Tone & rigor* section.

---
date: 2026-08-18
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#60'
fix-pr: '#61'
fix-commits: [59867d4]
eradication-level: 2
time-to-detect: minutes
tags: [pre-commit, gates, hooks, meta, developer-experience]
---

# One stale generator per rejection

## Symptom

Committing the setlist fix in PR #60 took four attempts. Each rejection
named exactly one generated file:

```
1st  .claude/skills/blueprint/blueprint-index.md is out of date. Run …
2nd  .claude/skills/blueprint/blueprint-coverage.html is out of date. Run …
3rd  docs/architecture/pragma-architecture.json is out of date. Run …
4th  (committed)
```

Every regeneration was a one-line command; the cost was the three
round-trips to learn which three.

## Root-cause chain

1. **Why did the commit fail three times?** Three separate `--check`
   invocations guard three generated artefacts.
2. **Why did they not report together?** They run as consecutive
   commands under `set -e`, so the first non-zero exit ends the hook.
3. **Why was that the natural way to write it?** Each check was added at
   a different time, each as a single line following the one before, and
   under `set -e` a single line is a complete gate.
4. **Why does it matter?** A source change that moves the map usually
   moves the blueprint index too, and a new blueprint moves the coverage
   page as well, so the three are correlated by construction: the common
   case is not one stale file, it is all of them.
5. **Why is continuing cheap?** Each generator walks a tree that the
   first pass has already pulled into the file cache. The measured
   difference is a pass, not a build.

**Root cause:** thought *"a gate stops at the first failure"*, actually
*"a gate whose failures are independent should report all of them, or
it charges one commit cycle per fact it already knows"*.

## Detection failure causes

- **Typing:** shell.
- **Linter / static analysis:** nothing reads a hook for whether its
  checks are independent.
- **Functional validation locally:** each check was tested alone, where
  fail-fast and report-all are indistinguishable.
- **CI:** CI runs the same generators and also stops at the first, but
  nobody is waiting on a CI run the way they wait on a commit.
- **Code review:** three correct lines in sequence read as three correct
  lines.

## Countermeasure

- **Code:** commit `59867d4` — the three checks run to completion, the
  failures are collected, and one rejection prints every command to run.
- **Operator action:** none.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the gate now reports every stale artefact at once)

**Reference:** [PR #61](https://github.com/hugoleborso/borso.fr/pull/61) · commit [`59867d4`](https://github.com/hugoleborso/borso.fr/commit/59867d4)

**The actual fix:**

```diff
+generator_failures=""
+run_generator_check() {
+  if ! pnpm exec tsx "$1" --check; then
+    generator_failures="${generator_failures}  pnpm exec tsx $1
+"
+  fi
+}
@@
+if [ -n "$generator_failures" ]; then
+  echo "[pre-commit] ERROR: generated files are stale. Run all of these, then commit again:" >&2
+  printf '%s' "$generator_failures" >&2
+  exit 1
+fi
```

Verified with two artefacts made stale at once: both are named, and the
summary lists the two commands to paste.

**Sibling defects swept:** none — the other pre-commit checks are
already independent single greps whose failures are self-describing.

## See also

- [`a-generated-file-cannot-contain-its-own-commit`](./a-generated-file-cannot-contain-its-own-commit.md) — the other way these generated artefacts bite.
- [`docs/knowledge/gate-timings-before-and-after.md`](../knowledge/gate-timings-before-and-after.md) — what each gate costs, and why cheap checks belong on the commit.

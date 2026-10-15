---
date: 2026-10-12
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#118, #163, #165, #166'
fix-pr: '#173'
fix-commits: [self]
eradication-level: 1
eradication-paths: [.husky/pre-push]
time-to-detect: hours
tags: [husky, pre-push, mutation, stryker, vitest, agents, sandbox]
zone: .husky/pre-push
recurs: [a-green-mutation-gate-is-not-a-green-coverage-gate]
---

# The gates that timed each other out

## Symptom

Five of the twelve agents of one weekend had a push refused for tests that
pass alone: infra-cdk synth tests past 30 s, talos `App.test.tsx` past its
4 s `flushUntil`, eslint-rules suites, a pragma typecheck killed with exit
137. One agent needed three attempts for one push. The load average reached
40 on a four-core sandbox.

## Root-cause chain

1. **Why did correct tests time out?** They were starved of CPU.
2. **Why?** Pre-push started every gate at once: knip, coverage suites, a
   typecheck per app, each app's tests and one Stryker run per app, each
   Stryker run with its own workers.
3. **Why was that thought safe?** The earlier fix divided Stryker's workers by
   the number of runs, which bounds Stryker against itself but not against
   the test gates, and a push that changed four apps still started everything
   together.
4. **Why did it get worse in a fan-out?** Each agent pushes from its own
   worktree, and a limit inside one hook cannot see another hook running
   beside it.

**Root cause:** the hook was designed as if it owned the machine, but the
gates compete with each other and, in a fan-out, with other agents' hooks,
and a timeout reads as a failing test.

## Detection failure causes

- **Functional validation locally:** a single push from a quiet machine
  stays under every timeout.
- **Code review:** the knowledge entry on timeouts recorded this shape three
  times and told the reader to re-run alone, which treats the symptom.

## Countermeasure

1. Gates run at most `nproc / 2` at a time (`BORSO_PRE_PUSH_JOBS` overrides).
2. Mutation runs start only after every other gate has finished, one at a
   time, each with the whole machine (`BORSO_MUTATION_RUNS_IN_FLIGHT=1`).
3. A machine-wide `flock` lets only one checkout's pre-push run its gates at
   a time; a second push says it is waiting and waits. The gates are started
   with the lock's descriptor closed, so nothing they leave behind holds it.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #173](https://github.com/hugoleborso/borso.fr/pull/173) · commit `self` (this entry ships with it)

**The actual fix:**

```diff
 start_gate() {
   gate_name="$1"
   shift
+  while [ "$(running_count)" -ge "$gate_limit" ]; do
+    reap_oldest_gate
+  done
   echo "[pre-push] start: $gate_name"
-  ( "$@" ) >"$gate_log_dir/$gate_name.log" 2>&1 &
+  ( "$@" ) 8>&- >"$gate_log_dir/$gate_name.log" 2>&1 &
```

```diff
+if command -v flock >/dev/null 2>&1; then
+  exec 8>"${TMPDIR:-/tmp}/borso-pre-push.lock"
+  if ! flock -n 8; then
+    echo "[pre-push] another checkout's pre-push is running its gates on this machine; waiting for it rather than racing it"
+    flock 8
+  fi
+fi
```

```diff
-BORSO_MUTATION_RUNS_IN_FLIGHT=$(( ${changed_app_count:-0} + 2 ))
+wait_for_gates
+gate_limit=1
+BORSO_MUTATION_RUNS_IN_FLIGHT=1
```

The runner was exercised under `dash` with a limit of two and four fake
gates: the third waited for the first, a failing gate was reported after the
others, and the hook exited 1.

A push now pays its gates in sequence where it used to pay them in parallel,
so a push touching several apps takes longer than before. It no longer fails
for load, which is what made agents push two and three times.

**Sibling defects swept:** `wait_for_gates` used to be the single wait; it
now runs twice, and the second still sits outside `SKIP_MUTATION_GATE` so
every started gate is awaited.

## See also

- [`../knowledge/a-timeout-under-parallel-gates-is-not-a-regression.md`](../knowledge/a-timeout-under-parallel-gates-is-not-a-regression.md), which recorded the shape three times.
- [`the-fetch-that-undid-the-narrowing.md`](./the-fetch-that-undid-the-narrowing.md), the range bug that fed the same wave 81 files.

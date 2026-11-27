---
date: 2026-10-12
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#118, #163, #165, #166'
fix-commits: [self, c54e32da7]
eradication-level: 1
eradication-paths: [.husky/pre-push, scripts/mutate-changed.sh]
time-to-detect: hours
tags: [husky, pre-push, mutation, stryker, vitest, agents, sandbox]
zone: .husky/pre-push
recurs: [a-green-mutation-gate-is-not-a-green-coverage-gate]
---

# The gates that timed each other out

## User impact

Agents had pushes refused for tests that pass alone.

| | Seen | Expected |
| --- | --- | --- |
| One weekend, 12 agents | 5 had a push refused: infra-cdk synth tests past 30 s, talos `App.test.tsx` past its 4 s `flushUntil`, eslint-rules suites, a pragma typecheck killed with exit 137. One agent needed three attempts for one push. | each push refused only for a test that fails |
| Machine | load average 40 on a four-core sandbox | a load the gates fit in |

Counts as recorded when this entry was first written, on 2026-10-12.

## Causal chain

- Correct tests timed out in pre-push.
  - They were starved of CPU and memory.
    - Pre-push started every gate at once: knip, coverage suites, a typecheck per app, each app's tests, and one Stryker run per app with its own workers.
      - Stryker was the heaviest of them. It took 194 s of one 244 s push on PR #216 (`scripts/mutate-changed.sh` header).
      - An earlier fix divided Stryker's workers by the number of Stryker runs. That bounded Stryker against itself, not against the test gates.
      - Commit `9fc3b9a40` made the gates run in parallel, "each into its own log", to cut the push from about fifty minutes.
    - In a fan-out, each agent pushed from its own worktree, so several hooks ran these gates at once on one machine.

## Root cause of occurrence

*Thought a hook owns the machine while it runs, so its gates can all start
together, actually its gates compete with each other, the heaviest gate
(Stryker) took most of the push on its own, and in a fan-out other agents'
hooks share the same cores.* (Method)

The hook was designed for one push on a quiet machine. A timeout under that
load reads as a failing test, which hid the cause.

## Detection failure causes

- **Local validation:** a single push from a quiet machine stays under every timeout.
- **Knowledge:** `docs/knowledge/a-timeout-under-parallel-gates-is-not-a-regression.md` recorded the shape three times and told the reader to re-run alone, which treats the symptom.

## Countermeasure

PR #173 bounded the load:

1. Gates run at most `nproc / 2` at a time (`BORSO_PRE_PUSH_JOBS` overrides).
2. Mutation runs started only after every other gate finished, one at a time.
3. A machine-wide `flock` lets only one checkout's pre-push run its gates at a time. A second push says it is waiting and waits.

It was exercised under `dash` with a limit of two and four fake gates. The
third waited for the first, a failing gate was reported after the others, and
the hook exited 1.

## Eradication

**Type:** structural impossibility (level 1), by subtraction

**Reference:** commit `c54e32da7` (#224) took Stryker off the push. The
heaviest load is gone from the hook, not queued inside it.
`.husky/pre-push` now reads "Mutation testing runs in CI, on the pull request:
scripts/mutate-changed.sh." and `.github/workflows/ci.yml:439` runs
`scripts/mutate-changed.sh` on every pull request.

```diff
-      pnpm --filter "@borso-app/$app" exec stryker run --mutate "$mutate_glob"
+# Mutation testing runs in CI, on the pull request: scripts/mutate-changed.sh.
```

The throttle of PR #173 stays as the fallback for the gates left on the push.
`.husky/pre-push:138-140` sets `gate_limit` to half the cores, and
`.husky/pre-push:212-216` takes the machine-wide `flock` (read 2026-11-27).

**Proof it can fail:** not replanted this session.

**What stays possible:** a gate added back to pre-push that is heavy on its
own can still starve a test under the throttle. The throttle queues load. It
does not remove it.

**Similar instances:** `grep -n 'start_gate' .husky/pre-push` lists the gates
still on the push. None runs Stryker (measured 2026-11-27).

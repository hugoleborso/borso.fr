---
date: 2026-05-25
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#27'
fix-commits: [e138811ba9, 51558c14c6]
eradication-level: 5
eradication-paths: [CLAUDE.md, apps/last-loop-lepin/package.json]
time-to-detect: minutes
tags: [claude-md, harness, hooks, pre-commit, ci, self-improvement-loop]
zone: CLAUDE.md
---

# Wrote off a failing test as "preexisting" and moved on

## User impact

During PR #27 the session met a red local test, called it "preexisting" and
carried on. The operator had to stop it: « NO ISSUE IS PRE EXISTING. CD ensures
it is not the case. Write ».

| | Seen | Expected |
| --- | --- | --- |
| `pnpm run test:core` in last-loop-lepin | `cdk/test/stack.test.ts` fails with `Failed to resolve entry for package "@borso/infra"` | the suite passes on a fresh checkout, as it does in CI |
| The session's report | the failure set aside as "preexisting" | the failure fixed, whoever introduced it |

## Causal chain

- The session walked past a red test. Two branches meet here.
  - Branch one. The test was red.
    - `cdk/test/stack.test.ts` imports `@borso/infra` through its built entry,
      and `infra/cdk/dist/` did not exist locally.
      - last-loop-lepin's `test:core` ran Vitest with no build before it:

        ```json
        "test:core": "vitest run --project core",
        ```

        - Commit `6f3b84222f` (2026-05-15) wired the app's suite into CI and
          put the build in the workflow instead of the script. Its message
          names the need: "Also build `@borso/infra` before app-tests
          (last-loop-lepin's cdk/test imports the construct package via its
          built entry point)".
          - CI and the laptop ran two different definitions of the same gate,
            one in `ci.yml`, one in `package.json`.
  - Branch two. The session called the failure "preexisting".
    - It saw no link between the failure and its diff, and read "not caused by
      me" as "not mine to fix".
      - No rule in CLAUDE.md said otherwise at the time. The operator's
        correction became the first one, in commit `e138811ba9`.

## Root cause of occurrence

Two writers, two causes.

*The writer of `6f3b84222f` thought a job's prerequisite belongs in the workflow
that runs it, actually the workflow and the laptop each read their own copy, and
only the script is read by both.* (Machine)

The codebase let CI call a gate through its own steps rather than through the
app's script, so a prerequisite could live on one side only.

*The session at PR #27 thought a failure its diff did not cause was out of scope,
actually CI runs the same gate and the branch cannot merge until it passes.*
(Material)

The rule that every failing gate is in scope was absent from its context. It did
not exist yet.

## Detection failure causes

- **CI:** it built `@borso/infra` in its own step, so it stayed green and hid
  the gap in the local script.
- **Pre-commit:** `test:core` runs at pre-push, not pre-commit.
- **Harness:** nothing read a reply that set a failure aside.

## Countermeasure

Commit `51558c14c6` adds the build to last-loop-lepin's script, so the local gate
stands on its own:

```diff
-"test:core": "vitest run --project core",
+"test:core": "pnpm --filter @borso/infra run build && vitest run --project core",
```

Commit `e138811ba9` adds the rule to CLAUDE.md. It reads today, under
*Principles*, "**Fix the failures you find**, whoever caused them.
'Preexisting' is not a reason to walk past."

## Eradication

**Type:** knowledge (level 5)

**Reference:** commits [`e138811ba9`](https://github.com/hugoleborso/borso.fr/commit/e138811ba9)
and [`51558c14c6`](https://github.com/hugoleborso/borso.fr/commit/51558c14c6).
Every app that has a `test:core` now starts it with `pnpm --filter @borso/infra run build`
(`grep -n '"test:core"' apps/*/package.json`, measured). That line is copied by
hand, and the CLAUDE.md principle is a written instruction, so the level is 5.

**Proof it can fail:** none. The Machine cause is still live. `ci.yml` builds
`@borso/infra` in its own step, then calls
`pnpm --filter "@borso-app/$APP" exec vitest run --project core --coverage`
directly, not `test:core`. A prerequisite missing from the script still passes
CI.

**Proposed:** make CI run the script. In the *Pure suites and the per-file
coverage gate* step of `ci.yml`, call
`pnpm --filter "@borso-app/$APP" run test:core --coverage` and delete the
separate infra build step for that job. pnpm appends the extra argument to the
script's last command (inferred, not tried). The laptop and CI would then run
one command, and a missing prerequisite would fail in CI as well as locally.

**Proposed:** a Stop check in `scripts/hooks/checks/`, modelled on
`screens-shown.core.ts`, that refuses a reply using "preexisting" or
"pre-existing" to set a failure aside. The CLAUDE.md principle would then hold
when the model's habit wins.

**Similar instances:** `grep -n 'pnpm --filter @borso/infra build' .github/workflows/ci.yml`
lists each CI step that builds the constructs outside an app's script.

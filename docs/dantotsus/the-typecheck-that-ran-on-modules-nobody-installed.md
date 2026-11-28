---
date: 2026-11-28
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#431'
fix-commits: [self]
eradication-level: 1
eradication-paths: [.npmrc, scripts/lint-workspace.sh]
time-to-detect: minutes
tags: [pnpm, tooling, hooks, session-start, monorepo]
zone: scripts/ensure-installed.sh
recurs: [the-merge-that-linted-against-dependencies-it-never-installed]
---

# The typecheck that ran on modules nobody installed

## User impact

The shipping session of PR #431 ran pragma's typecheck and read three errors
on files it had not touched.

| | Seen | Expected |
| --- | --- | --- |
| PR #431, `pnpm run typecheck` in `apps/pragma`, 11:24 | TS2307 for `mailchecker`, `validator` and `qrcode.react` | a clean typecheck, which it got after `pnpm install --frozen-lockfile` |
| This sweep, its first `pnpm exec` after moving to `origin/main` | `pnpm-lock.yaml` and `node_modules/.pnpm/lock.yaml` differ | the install matches the lockfile |

## Causal chain

- Typecheck failed on modules the change never touched.
  - `node_modules` did not hold packages that PR #410 and PR #421 added to the
    lockfile.
    - The install did not match the tree. Why the session's start left it so is
      not observable now. The session's own log says its branch was level with
      `origin/main`, and its next command fast-forwarded to it (transcript,
      11:24:36).
      - Nothing between a hand-run `pnpm run` and `node_modules` compared the
        two lockfiles. `scripts/ensure-installed.sh` ran only in pre-commit,
        pre-push and `lint-workspace.sh`.

## Root cause of occurrence

*Thought a stale install is caught by guarding each gate that reads
`node_modules`, actually every new reader is one more place to remember, and
pnpm already checks this before any `pnpm run` or `pnpm exec`.*

This is the fourth sweep on a stale install. PR #107 and PR #136 guarded
pre-push, PR #334 guarded pre-commit, and each left the next reader open.
pnpm 10's `verify-deps-before-run` setting does it for every reader that goes
through pnpm.

## Detection failure causes

- **The earlier sweeps:** each one guarded the gate that had failed. None asked
  whether pnpm could hold the property for all of them.
- **Typing:** it reported correctly. The defect was in the environment.

## Countermeasure

`.npmrc` sets `verify-deps-before-run=install`. `lint-workspace.sh` runs
through `pnpm run lint`, so it lost its own call to `ensure-installed.sh`. The
git hooks call `node_modules/.bin` directly, so they keep it.

## Eradication

**Type:** structural impossibility (level 1). No `pnpm run` or `pnpm exec` can
start on an install that does not match the lockfile.

**Reference:** the commit adding this file.

```diff
 fail-if-no-match=true
+verify-deps-before-run=install
```

**Proof it can fail:** this sweep installed the lockfile from before PR #421,
then restored the current one. With the setting off,
`pnpm exec node -e 'require.resolve("qrcode.react")'` in `apps/pragma` failed.
With it on, pnpm installed and the same command printed `resolved`. A
`pnpm exec` on an up-to-date install took 0.65 s in all (measured).

**Library considered:** none needed. The check is pnpm's own, so
`scripts/ensure-installed.sh` stays only where pnpm is not in the path.

---
date: 2026-11-14
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#197'
fix-pr: none (lands with the kaizen pull request for PR #334)
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/ensure-installed.sh, .husky/pre-commit, .husky/pre-push, scripts/lint-workspace.sh]
time-to-detect: minutes
tags: [gates, pre-commit, pnpm, oxlint, hooks]
zone: .husky/pre-commit
recurs: [the-cache-outlived-the-install-it-was-built-against]
---

# The merge that linted against dependencies it never installed

## User impact

The operator saw nothing. The main session of PR #334's sweep merged `main`,
and the merge commit failed pre-commit until the session ran `pnpm install` by
hand.

| | Seen | Expected |
| --- | --- | --- |
| Merge of `main` into PR #334, 2026-11-14 | oxlint failed with `type error` on the merged files | the merge commits, or pre-commit installs first |

## Causal chain

- The merge commit was refused.
  - oxlint's type-aware rules could not resolve a newly merged app's imports.
    - `main` had brought a lockfile entry this checkout had never installed.
      - Pre-push compares `pnpm-lock.yaml` with `node_modules/.pnpm/lock.yaml`
        and installs on a difference. Pre-commit had no such step, and a merge
        with a conflict commits through pre-commit.

## Root cause of occurrence

*Thought the stale install was handled, actually only pre-push handled it.*

PR #155 made `scripts/lint-workspace.sh` refuse to lint while the two lockfiles
differed. PR #197 replaced ESLint with oxlint and removed that script's cache,
and the refusal went with it (`git log -S'node_modules/.pnpm/lock.yaml' --
scripts/lint-workspace.sh` lists both commits). The property dropped was
"no lint result is computed against a stale install".

## Detection failure causes

- **Local:** PR #136's sweep put the comparison in pre-push only, because knip
  was the gate that had failed. The lint gates that also read `node_modules`
  were not listed.
- **Review:** PR #197's commit named the cache it removed, not the refusal
  that shared its file.

## Countermeasure

`scripts/ensure-installed.sh` holds the comparison and the install. Pre-push,
pre-commit and `lint-workspace.sh` all call it. When the two files agree it
costs 6 ms (measured).

## Eradication

**Type:** structural impossibility (level 1). No gate that calls it reads a
`node_modules` older than the lockfile.

**Reference:** this commit.

```diff
+# A merge of main can bring a lockfile this checkout never installed, and the
+# type-aware oxlint rules then fail on modules they cannot resolve.
+scripts/ensure-installed.sh pre-commit
```

**Proof it can fail:** after appending a line to `node_modules/.pnpm/lock.yaml`,
the script printed `[pre-commit] pnpm-lock.yaml changed since the last install;
installing before the gates read node_modules` and ran `pnpm install`. With the
two files equal it printed nothing and exited 0.

**Similar instances:** `grep -rln 'node_modules/.bin' .husky scripts/*.sh`
lists the gates that read node_modules. Pre-push and pre-commit run before all
of them, and `lint-workspace.sh` is the one an app's `pnpm run lint` reaches
without a hook.

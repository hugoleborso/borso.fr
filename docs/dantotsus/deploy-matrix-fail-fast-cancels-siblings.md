---
date: 2026-05-14
introduced-at: implementation
detected-at: production
severity: medium
related-pr: 12
fix-pr: 16
fix-commits: [cd3aab2]
eradication-level: 1
time-to-detect: minutes
tags: [github-actions, ci, deploy]
---

# Deploy matrix cancelled `last-loop-lepin` because `borsouvertures` failed first

## Symptom

PR #12 merged, triggered `deploy.yml` on `main`. The matrix had two
apps to deploy: `borsouvertures` (first) and `last-loop-lepin`
(second), serialised by `max-parallel: 1`. `borsouvertures` failed.
GitHub then cancelled `last-loop-lepin` before it ever started.

Hugo: *"Le job de deploy ne lance pas les deploy en simultané : du
coup comme le deploy de borsouvertures a fail, celui de last loop
lepin n'a pas commencé"*.

## Root-cause chain

1. **Why didn't `last-loop-lepin` run?** GitHub cancelled the matrix
   entry while it was still queued.
2. **Why was it cancelled?** Matrix `strategy.fail-fast` defaults
   to `true`. When one entry fails, GitHub cancels every remaining
   entry — including the ones serialised behind `max-parallel: 1`
   that haven't started yet.
3. **Why was the default left in place?** When the workflow was
   written, the only matrix concern documented was the shared-zone
   CFN race (hence `max-parallel: 1`). Independence between apps
   under failure wasn't considered — implicit assumption that one
   app's deploy can fail without taking out unrelated apps.

**Root cause:** thought "`max-parallel: 1` means serial, so each
app gets its turn", actually "`max-parallel: 1` + default
`fail-fast: true` means strictly *up to* the first failure; siblings
are cancelled".

## Detection failure causes

- **Typing / linter:** N/A — workflow YAML, no schema-aware lint
  for matrix semantics.
- **Functional validation locally:** preview deploys run per-PR via
  a different workflow, never exercise the prod matrix.
- **CI:** the deploy workflow is the CI; it can't catch its own
  semantic gap.
- **Code review:** the comment `max-parallel: 1 — avoid CFN updates
  touching shared zone records` framed the matrix as "safety
  serialisation"; nothing flagged that fail-fast was still on.
- **Staging monitoring:** there is no staging for the prod deploy
  workflow itself; first detection is observing a prod release.

## Countermeasure

- **Code:** `.github/workflows/deploy.yml` — set
  `strategy.fail-fast: false` so each matrix entry runs
  independently. `max-parallel: 1` stays (the shared-zone reason
  is unchanged).

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #16](https://github.com/hugoleborso/borso.fr/pull/16)

**The actual fix:**

```diff
     strategy:
+      fail-fast: false
       matrix:
         app: ${{ fromJson(needs.detect.outputs.apps) }}
       max-parallel: 1
```

Once `fail-fast: false` is set, a failing app cannot cancel a
sibling — the misconception (serialisation alone protects
independence) is no longer expressible in the workflow's behaviour.

**Sibling defects swept:** none — `deploy.yml` is the only place
the prod-deploy matrix is declared. Per-PR preview workflows use a
single-job model, not a matrix.

## See also

- [GitHub Actions docs — `jobs.<job_id>.strategy.fail-fast`](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs#handling-failures).

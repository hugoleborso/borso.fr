---
date: 2026-11-05
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#263'
fix-pr: none (shipped by the lessons-from-pr-263 kaizen pull request, numbered once it opens)
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/check-frontend-env-vars.sh]
time-to-detect: days
tags: [ci, gates, github-actions, frontend]
zone: scripts/check-frontend-env-vars.sh
recurs: [the-variable-the-workflow-set-to-nothing]
---

# The check that a site's variable is set passed for an app it was never set for

## User impact

| | Seen | Expected |
| --- | --- | --- |
| last-loop-lepin's Sentry | no event ever, while its site read `VITE_SENTRY_DSN` | errors reported in production |
| talos on PR #263 | `check-frontend-env-vars.sh` passed | a refusal until talos's job set the variable |

## Causal chain

- last-loop-lepin's site initialised Sentry from `VITE_SENTRY_DSN`, and Sentry never ran.
  - `deploy.yml` set the variable as `matrix.app == 'pragma' && vars.SENTRY_DSN || ''`, empty for every other app.
    - `check-frontend-env-vars.sh` compared variable names only: read by any site against named in any workflow.
      - pragma's gated line named it, so every app counted as set.

## Root cause of occurrence

*Thought a variable named in a workflow is set, actually it can be set for one app of the matrix and empty for the rest.*

The check's own header says the pairing is the point, then pairs names across the whole repository rather than per app.

## Detection failure causes

- **check-frontend-env-vars.sh:** the comparison was one set of names against another, with no app on either side.
- **Review:** the agent wiring talos noticed it on PR #263 and logged it; nothing failed.

## Countermeasure

PR #263 set `VITE_SENTRY_DSN` for every app.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the lessons-from-pr-263 kaizen pull request · commit `[self]`

```diff
-unset_variables=$(comm -23 <(list_read_variables) <(list_set_variables))
+    sed -E "s/^ *(VITE_[A-Z0-9_]+): .*matrix\.app == '([a-z0-9-]+)'.*/\2 \1/; t; s/^ *(VITE_[A-Z0-9_]+): .*/* \1/" |
+  if grep -qxF -e "* $variable" -e "$app $variable" <<<"$set_pairs"; then
```

Each read is now `<app> <variable>`, and each workflow value is set for its gated app or, ungated, for every app.

**Proof it can fail:** with `VITE_SENTRY_DSN` gated back to pragma in both workflows, the check exits 1 and names banana-rush, borso-fr, borsouvertures, last-loop-lepin and talos, one line each.

**Similar instances:** `grep -rn "matrix.app == '" .github/workflows/` lists the other gated values (`PRAGMA_SENTRY_DSN`, the per-app API DSNs, `SENTRY_AUTH_TOKEN`). None is a `VITE_` variable, so this check is the only place the gating was read.

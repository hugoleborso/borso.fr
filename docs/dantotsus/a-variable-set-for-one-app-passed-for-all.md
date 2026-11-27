---
date: 2026-11-05
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#163'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/check-frontend-env-vars.sh, .github/workflows/deploy.yml]
time-to-detect: days
tags: [ci, gates, github-actions, frontend]
zone: scripts/check-frontend-env-vars.sh
recurs: [the-variable-the-workflow-set-to-nothing]
---

# The check that a site's variable is set passed for an app it was never set for

## User impact

| | Seen | Expected |
| --- | --- | --- |
| last-loop-lepin's Sentry, 2026-10-12 to 2026-11-05 | no event, while its site read `VITE_SENTRY_DSN`, and no record anywhere in the checks that it was off | errors reported, or the decision to keep them off listed by the check with its reason |
| talos on PR #263 | `check-frontend-env-vars.sh` passed | a refusal until talos's job set the variable |

The agent wiring talos noticed it on PR #263 and logged it.

## Causal chain

- last-loop-lepin's site initialised Sentry from `VITE_SENTRY_DSN`, and
  Sentry never ran.
  - `deploy.yml` set the variable for pragma only:

    ```yaml
    VITE_SENTRY_DSN: ${{ matrix.app == 'pragma' && vars.PRAGMA_SENTRY_DSN || '' }}
    ```

    - Commit 6385b5727 (PR #163, an agent session) wrote that line to switch
      Sentry on for pragma. Its message says last-loop-lepin "still reports
      nothing", so the scope was a choice.
      - The same commit deleted the one record of that choice, the
        `ALLOWED_UNSET` entry for `VITE_SENTRY_DSN` in
        `check-frontend-env-vars.sh`:

        ```diff
        -declare -A ALLOWED_UNSET=(
        -  [VITE_SENTRY_DSN]="reporting is off until a Sentry project and secret exist; ..."
        -)
        +declare -A ALLOWED_UNSET=()   # ← the faulty line
        ```

        - The check, written in 647e2148f, compared the names read by any
          site with the names written in any workflow:
          `comm -23 <(list_read_variables) <(list_set_variables)`. Pragma's
          gated line named the variable, so the check counted it set for
          every app and stayed green without the entry. **Machine.**

## Root cause of occurrence

*Thought `ALLOWED_UNSET` lists variables no workflow names, so a variable
now named in both deploy workflows no longer belongs there, actually it lists
decisions to ship a site with a variable empty, and last-loop-lepin's empty
DSN was still one.* **Man:** the agent edited the file whose header says
"Removing a line from here without setting the variable is what the check is
for", and trusted the check's green over that line. The check could not show
the gap, because it paired names with no app on either side.

## Detection failure causes

- **check-frontend-env-vars.sh:** one set of names against another, with no
  app on either side. Every value was set for every app when the check was
  written, so the shortcut held until #163 wrote the first gated `VITE_`
  value.
- **Monitoring:** an empty DSN is Sentry's designed off switch, so a site with
  no DSN sends nothing and raises nothing.
- **Review:** the commit message stated last-loop-lepin stays off, which read
  as a decision already accounted for.

## Countermeasure

PR #263 set `VITE_SENTRY_DSN` for every app.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file, in PR #265 (5fbce1af0 on main).

```diff
-unset_variables=$(comm -23 <(list_read_variables) <(list_set_variables))
+    sed -E "s/^ *(VITE_[A-Z0-9_]+): .*matrix\.app == '([a-z0-9-]+)'.*/\2 \1/; t; s/^ *(VITE_[A-Z0-9_]+): .*/* \1/" |
+  if grep -qxF -e "* $variable" -e "$app $variable" <<<"$set_pairs"; then
```

Each read is now `<app> <variable>`, and each workflow value counts as set
for its gated app or, ungated, for every app. A second mechanism holds the
Sentry case on deploy: `deploy.yml:143`, "Refuse to deploy with Sentry off",
fails the job of any app whose `VITE_SENTRY_DSN` is empty, and the variable
is now ungated (`deploy.yml:128`).

**Proposed:** subtract the parsing. The check would refuse any `VITE_` value
written as `matrix.app == '…' &&` in `deploy.yml` or `preview.yml`, and drop
the per-app `sed`. No `VITE_` value is gated today
(`grep -rn "VITE_[A-Z_]*: .*matrix.app ==" .github/workflows/` finds none,
measured 2026-11-27). A site variable would then be set for every app or
listed in `ALLOWED_UNSET` with its reason, and a gate could no longer make a
pragma-only value read as set for the others.

**Proof it can fail:** with `VITE_SENTRY_DSN` gated back to pragma in both
workflows, the check exits 1 and names banana-rush, borso-fr,
borsouvertures, last-loop-lepin and talos, one line each (measured when the
entry was written).

**Similar instances:** `grep -rn "matrix.app == '" .github/workflows/` lists
the gated values: the per-app API DSNs, `SENTRY_AUTH_TOKEN` and `SEED_QUERY`. None is a
`VITE_` variable.

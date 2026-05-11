---
date: 2026-05-11
introduced-at: implementation
detected-at: operator-deploy
severity: medium
related-pr: 2
fix-pr: this PR (branch `claude/stale-previews-budget-forecast-j3sPS`)
fix-commits: [8b581dc9eb390c3b62dadc8dd0036576f1ddd19e]
eradication-level: 4
time-to-detect: 8 days
tags: [github-actions, cdk, cloudformation, ci, idempotency]
---

# A trailing `|| echo` turned every cdk-destroy failure into silent green

## Symptom

Hugo ran a manual `aws cloudformation list-stacks` on 2026-05-11 and
found four preview stacks still alive, weeks after the PRs that owned
them had merged:

| Stack | PR | Closed at |
| --- | --- | --- |
| `borso-fr-pr-2` | merged | 2026-05-03 |
| `borso-fr-pr-4` | merged | 2026-05-03 |
| `borso-fr-pr-6` | merged | 2026-05-03 |
| `borso-fr-pr-7` | merged | 2026-05-04 |

The system promised two layers of cleanup. The `teardown` job in
`preview.yml` runs on `pull_request: closed` — should have destroyed
each one immediately on PR close. The `cleanup-orphans` workflow
runs nightly at 03:17 UTC and on `pull_request: closed` — should have
swept anything teardown left behind. Both layers ran. Both went green.
The stacks stayed.

Cost impact was small (S3 storage on the four buckets is negligible
and CloudFront usage is zero post-merge), but the trust impact wasn't:
the entire claim "preview stacks are automatic, you don't have to
think about them" was no longer true, and nothing alerted us.

## Root-cause chain

1. **Why were the four stacks still in CFN?**
   Neither `preview.yml`'s `teardown` job nor `cleanup-orphans` issued
   a successful `DeleteStack` for them — verified by reading the
   stacks' `describe-stack-events` history (no `DELETE_*` events on
   any of the four).

2. **Why didn't the workflows issue `DeleteStack`?**
   The `cdk destroy` invocation inside the teardown loop exited
   non-zero. The exact failure mode isn't recoverable now (GitHub
   Actions log retention + no per-stack capture), but the *symptom
   inside the workflow* was: `cdk destroy` returned ≠ 0.

3. **Why did the workflow report green when destroy failed?**
   Both workflows wrapped the destroy call in the same idiom:
   ```bash
   pnpm --filter "@borso-app/$app" run destroy \
     || echo "(stack does not exist or already destroyed)"
   ```
   `|| echo …` returns 0. The `for` loop continued. The step exited
   0. The job went green.

4. **Why was the `|| echo` written that way?**
   The author wanted idempotent re-runs. If a previous nightly had
   destroyed the stack already, the next nightly would find no stack
   and `cdk destroy` would fail — that "failure" is benign and the
   loop should move on to the next app.

5. **Why did "tolerate idempotent re-runs" become "swallow all exit
   codes"?**
   `cdk destroy --force` returns the same non-zero exit code for
   *every* failure mode: missing stack, IAM error, custom-resource
   Delete handler failure, missing context, network blip, anything.
   `|| echo` can't tell those apart. The author collapsed all of
   them into "benign" by treating exit-code alone as the signal.

**Root cause:** the author thought *"`cdk destroy` failing means the
stack is gone"*, but actually *"`cdk destroy` fails non-zero for
any reason — only `aws cloudformation describe-stacks` distinguishes
'missing' from 'broken'"*. If they had known that, they would have
probed for existence before destroying, or at minimum captured
failures and surfaced them at the end of the loop.

## Detection failure causes

- **Typing / linter / static analysis:** N/A — this is bash exit-code
  semantics. `actionlint` doesn't flag `|| echo` because it's
  syntactically valid and a legitimate pattern in many contexts.
- **Functional validation locally:** the destroy path can't easily
  be exercised locally (needs real CFN state). Author shipped on
  paper review.
- **CI:** the cleanup-orphans workflow ran every night since 2026-05-05
  and reported success. The "success" was meaningless — the workflow
  only ever asserted "the script exited 0", never "the final state
  matches expectations". No follow-up assertion existed.
- **Code review:** the trailing `|| echo` looked like the right shape
  ("swallow expected errors, keep iterating"). The author and reviewer
  shared the same misconception about what `cdk destroy` returns.
- **Production monitoring / alerting:** no CloudWatch alarm exists
  for "preview stack alive past N days post-PR-close" or for "preview
  stack count > N". The $5 monthly budget would have fired eventually
  if the stacks kept accumulating, but the per-stack cost is too
  small for that to be a fast signal.

The strongest pinch point was **CI signal**: the workflow's exit
code was the only thing anyone watched, and the workflow lied about
it by construction.

## Countermeasure

- **Code:** commit
  [`8b581dc`](../../commit/8b581dc9eb390c3b62dadc8dd0036576f1ddd19e) —
  both workflows now distinguish "stack does not exist" (probe with
  `describe-stacks` or treat as a separate case in the gh-pr-state
  switch) from "destroy failed for some other reason" (collected
  into a `failures` array and surfaced with `::error::` annotations
  before the step exits non-zero).
- **Operator action:** the four orphan stacks were destroyed by a
  one-shot script Hugo ran on 2026-05-11 — see chat transcript for
  the script body (read-only IAM in the analysis session, so the
  agent could not run it directly).

## Eradication (mandatory — code-level)

**Type:** code diff (level 4 — detection)

**Reference:** commit
[`8b581dc`](../../commit/8b581dc9eb390c3b62dadc8dd0036576f1ddd19e)

**The actual fix** — `cleanup-orphans.yml`:

```diff
+          unknown_app_stacks=()
+          destroy_failures=()
+
           for stack in $stacks; do
             if [[ ! "$stack" =~ ^(.+)-pr-([0-9]+)$ ]]; then continue; fi
             app="${BASH_REMATCH[1]}"
             pr="${BASH_REMATCH[2]}"

             if ! grep -qx "$app" <<<"$all_apps"; then
-              echo "[skip] $stack: app '$app' not in workspace"
+              echo "::warning::stack $stack: app '$app' not in workspace; sweeper cannot destroy it"
+              unknown_app_stacks+=("$stack")
               continue
             fi

             state=$(gh pr view "$pr" --repo "$GH_REPO" --json state -q .state 2>/dev/null || echo UNKNOWN)
             case "$state" in
               CLOSED|MERGED)
                 echo "[orphan] destroying $stack (PR #$pr is $state)"
-                STAGE=preview PR_NUMBER="$pr" \
-                  pnpm --filter "@borso-app/$app" run destroy \
-                  || echo "(destroy failed; investigate manually)"
+                if STAGE=preview PR_NUMBER="$pr" \
+                    pnpm --filter "@borso-app/$app" run destroy; then
+                  echo "[ok] $stack destroyed"
+                else
+                  echo "::error::$stack: cdk destroy exited non-zero (PR #$pr is $state)"
+                  destroy_failures+=("$stack")
+                fi
                 ;;
               ...
             esac
           done
+
+          fail=0
+          if (( ${#unknown_app_stacks[@]} )); then
+            echo "::error::${#unknown_app_stacks[@]} stack(s) belong to slugs not in apps/: ${unknown_app_stacks[*]}"
+            fail=1
+          fi
+          if (( ${#destroy_failures[@]} )); then
+            echo "::error::${#destroy_failures[@]} cdk destroy failure(s): ${destroy_failures[*]}"
+            fail=1
+          fi
+          exit "$fail"
```

And `preview.yml` teardown — same shape, with `describe-stacks` as
the probe that distinguishes "missing" from "broken":

```diff
-      - name: Destroy every app's per-PR stack (ignore missing)
+      - name: Destroy every app's per-PR stack
         env:
           APPS_JSON: ${{ steps.apps.outputs.list }}
+        shell: bash
         run: |
+          set -euo pipefail
+          failures=()
           for app in $(jq -r '.[]' <<<"$APPS_JSON"); do
-            echo "[teardown] destroying $app-pr-$PR_NUMBER..."
-            pnpm --filter "@borso-app/$app" run destroy \
-              || echo "(stack does not exist or already destroyed)"
+            stack="$app-pr-$PR_NUMBER"
+            if ! aws cloudformation describe-stacks \
+                --stack-name "$stack" >/dev/null 2>&1; then
+              echo "[skip] $stack: stack does not exist"
+              continue
+            fi
+            echo "[teardown] destroying $stack..."
+            if pnpm --filter "@borso-app/$app" run destroy; then
+              echo "[ok] $stack destroyed"
+            else
+              echo "::error::$stack: cdk destroy exited non-zero"
+              failures+=("$stack")
+            fi
           done
+          if (( ${#failures[@]} )); then
+            echo "::error::${#failures[@]} stack(s) failed to destroy: ${failures[*]}"
+            exit 1
+          fi
```

**Why level 4, not level 1.** Making this defect *structurally
impossible* would mean encoding the stack's intended lifetime in a
type-safe way that AWS would enforce — AWS doesn't offer "delete
this stack at time T". A DevX check (level 2) over bash exit-code
semantics is also not credible. The honest level is detection:
when destroy fails, the workflow turns red and the operator sees
it within 24h instead of 8+ days.

**Sibling defects swept:** the same `|| echo "(failure)"` shape was
present in both workflows and is now fixed in both. No other workflow
in `.github/workflows/` uses the `cdk destroy ... ||` pattern (grep'd).

## See also

- [`paths-filter-base-head1-on-push.md`](./paths-filter-base-head1-on-push.md) —
  similar class: a CI workflow that silently misbehaved because the
  failure shape didn't trip any visible alarm.
- [`pnpm-reserved-script-names.md`](./pnpm-reserved-script-names.md) —
  related: `pnpm --filter <pkg> destroy` (without `run`) is a pnpm
  built-in, not the workspace script. If a future destroy path
  invokes it that way, the script never runs and exits 0 silently —
  the existing pre-push grep catches it before it lands.
- The four orphan stacks discovered alongside this RCA were destroyed
  by a one-shot operator script; the discovery itself spawned this
  dantotsu and the patch above.

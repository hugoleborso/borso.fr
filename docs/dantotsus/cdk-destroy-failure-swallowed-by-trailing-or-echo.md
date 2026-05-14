---
date: 2026-05-11
revised: 2026-05-11
introduced-at: implementation
detected-at: operator-deploy
severity: medium
related-pr: 2
fix-pr: PR #9 (branch `claude/stale-previews-budget-forecast-j3sPS`)
fix-commits: [8b581dc9eb390c3b62dadc8dd0036576f1ddd19e, 663267998ba86c91d5e91817831547e85090fcf5]
prior-eradication-level: 4
eradication-level: 2
time-to-detect: 8 days
tags: [github-actions, cdk, cloudformation, ci, idempotency, pnpm-scripts]
---

> ### Revised same day — root cause was one level deeper, eradication upgraded rung 4 → rung 2
>
> The first version of this dantotsu (earlier on 2026-05-11) shipped a
> **rung-4 detection eradication**: stop swallowing `cdk destroy`
> failures with `|| echo`, surface them as `::error::`, exit the
> workflow non-zero. That fix is right, and it immediately paid for
> itself — the same evening Hugo tried to run the one-shot operator
> cleanup script and got a real, visible error:
>
> ```
> «CannotFindAsset» Cannot find asset at .../apps/borso-fr/dist
>     at new BucketDeployment2 (.../aws-s3-deployment/lib/bucket-deployment.js:1)
>     at StaticSite.buildPreview (.../infra/cdk/src/constructs/static-site.ts:233)
> ```
>
> That's the *actual* reason every nightly cleanup-orphans run since
> 2026-05-05 was failing. `cdk destroy` synthesizes the app first, and
> `Source.asset(path.resolve(props.assetsPath))` resolves the path at
> synth time. The `destroy` script in `apps/borso-fr/package.json`
> didn't chain `pnpm build`, so `apps/borso-fr/dist/` never existed in
> the CI workspace, synth failed with `CannotFindAsset`, the workflow's
> `|| echo` flattened the failure to green, and four merged-PR stacks
> sat in CFN for 7-8 days.
>
> The original framing ("the developer thought `cdk destroy` failing
> means the stack is gone") was true but downstream. The deeper
> misconception was **"`cdk destroy` is symmetric with `cdk deploy`"**.
> It isn't — `deploy` explicitly chains the build (`pnpm --filter
> @borso/infra run build && pnpm build && cdk deploy …`), `destroy`
> doesn't (`cdk destroy --all --force`) — yet synth has the same
> filesystem prerequisites either way. Making `destroy` chain the
> same builds as `deploy` removes the asymmetry and upgrades this
> eradication to rung 2 (DevX check via workspace-script convention,
> backstopped by an `eradication-checks.test.ts` guard that fails CI
> if any app ever ships a `destroy` script that doesn't chain the
> build).
>
> The rung-4 detection layer stays in the workflows as a sibling
> backstop — necessary if anyone ever bypasses the workspace script
> and invokes `cdk destroy` directly. The original Eradication section
> is preserved at the bottom of this entry under *Prior eradication*.

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
   non-zero. After the rung-4 detection eradication landed, the next
   manual run reproduced the actual failure on the operator's terminal:
   `CannotFindAsset: Cannot find asset at .../apps/borso-fr/dist`.

3. **Why was `apps/borso-fr/dist/` missing?**
   `cdk destroy` synthesizes the app before issuing DeleteStack —
   it walks the construct tree to discover what to delete. The
   `StaticSite` construct creates a `BucketDeployment` whose source
   is `Source.asset(path.resolve(props.assetsPath))`, and CDK
   resolves the path at synth time (it computes the asset hash so
   the BucketDeployment custom resource carries the right key). In
   a fresh CI checkout — or any context where `pnpm build` hasn't
   run — `apps/borso-fr/dist/` doesn't exist, synth throws, destroy
   never reaches the AWS API.

4. **Why didn't `destroy` build the app like `deploy` does?**
   `apps/borso-fr/package.json` had:
   ```json
   "deploy":  "pnpm --filter @borso/infra run build && pnpm build && cdk synth --all && ../../scripts/preflight-cloudfront-aliases.sh cdk.out && cdk deploy --all --require-approval never",
   "destroy": "cdk destroy --all --force"
   ```
   The author wrote each script to its surface intent — deploy needs
   `dist/` on disk so it can upload to S3; destroy is "just delete
   the stack." That conflated the AWS-side semantics (deploy uploads,
   destroy deletes) with the CDK-side semantics (both invoke synth
   first). The two scripts looked asymmetric because the surface
   intents are asymmetric, but the prerequisites are the same.

5. **Why did the workflow report green when destroy failed?**
   Both workflows wrapped the destroy call in the same idiom:
   ```bash
   pnpm --filter "@borso-app/$app" run destroy \
     || echo "(stack does not exist or already destroyed)"
   ```
   `|| echo …` returns 0. The `for` loop continued. The step exited
   0. The job went green.

6. **Why was the `|| echo` written that way?**
   The author wanted idempotent re-runs. If a previous nightly had
   destroyed the stack already, the next nightly would find no stack
   and `cdk destroy` would fail — that "failure" is benign and the
   loop should move on to the next app.

7. **Why did "tolerate idempotent re-runs" become "swallow all exit
   codes"?**
   `cdk destroy --force` returns the same non-zero exit code for
   *every* failure mode: missing stack, IAM error, custom-resource
   Delete handler failure, missing context, network blip, *missing
   asset directory*, anything. `|| echo` can't tell those apart. The
   author collapsed all of them into "benign" by treating exit-code
   alone as the signal.

**Root cause (revised):** the author thought *"`cdk destroy` is
symmetric with `cdk deploy` — both invoke the CDK CLI, deploy needs
extra steps because it uploads, destroy is simpler"*, but actually
*"both run synth first; synth has the same filesystem prerequisites
either way; deploy chains the build because the author noticed, and
destroy didn't because the author didn't"*. If they had known that,
they would have written `destroy` as the same chain minus the upload-
specific tail, and `apps/borso-fr/dist/` would have always existed
when synth ran.

A second misconception sat on top of the first: *"`cdk destroy`
failing means the stack is gone — so swallow the exit code"*. That
one would have been benign on its own; combined with the missing-
build, it produced 8 days of silent failures. Both are eradicated
in this revision — the build chain at rung 2, the loud failures at
rung 4.

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

- **Primary code fix:** commit
  [`6632679`](../../commit/663267998ba86c91d5e91817831547e85090fcf5) —
  `apps/borso-fr/package.json` chains `pnpm --filter @borso/infra
  run build && pnpm build` ahead of `cdk destroy --all --force`,
  mirroring the existing `deploy` chain. Synth now always has its
  asset prerequisites met when invoked via the workspace script.
- **Detection backstop:** commit
  [`8b581dc`](../../commit/8b581dc9eb390c3b62dadc8dd0036576f1ddd19e) —
  both workflows distinguish "stack does not exist" (probe with
  `describe-stacks` or via the gh-pr-state switch) from "destroy
  failed for some other reason" (collected and surfaced via
  `::error::`, step exits non-zero).
- **Operator action:** the four orphan stacks were destroyed by a
  one-shot script (`scripts/cleanup-pr-9.sh`, removed in a follow-up
  commit) — read-only IAM in the analysis session, so the agent
  couldn't run it directly.

## Eradication (mandatory — code-level)

**Type:** code diff (level 2 — DevX check via workspace-script
convention) + sibling detection layer (level 4)

**Reference:** primary fix in commit
[`6632679`](../../commit/663267998ba86c91d5e91817831547e85090fcf5);
detection backstop in commit
[`8b581dc`](../../commit/8b581dc9eb390c3b62dadc8dd0036576f1ddd19e)

**Primary fix** — `apps/borso-fr/package.json`:

```diff
-    "destroy": "cdk destroy --all --force"
+    "destroy": "pnpm --filter @borso/infra run build && pnpm build && cdk destroy --all --force"
```

Backstopped by a guard in `infra/cdk/test/unit/eradication-checks.test.ts`
that walks every `apps/*/package.json` and asserts the `destroy` script
contains the same build chain as `deploy`:

```ts
describe('eradication: every app `destroy` script chains the same builds as `deploy`', () => {
  const APPS_DIR = path.resolve(HERE, '../../../../apps');
  const appNames = fs.existsSync(APPS_DIR)
    ? fs.readdirSync(APPS_DIR).filter((entry) =>
        fs.existsSync(path.join(APPS_DIR, entry, 'package.json')))
    : [];

  it.each(appNames)('%s/package.json: destroy chains the build', (appName) => {
    const pkg = JSON.parse(fs.readFileSync(path.join(APPS_DIR, appName, 'package.json'), 'utf-8'));
    const destroy: string = pkg.scripts?.destroy ?? '';
    expect(destroy).toContain('pnpm --filter @borso/infra run build');
    expect(destroy).toContain('pnpm build');
    expect(destroy).toContain('cdk destroy');
  });
});
```

A future app (e.g. `apps/borsouvertures/`) that ships a destroy
script without the chain fails CI. The misconception "destroy is
simpler than deploy" can no longer enter the codebase undetected.

**Sibling detection layer** — preserved from the original landing.

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

**Why level 2 (DevX check), not level 1 (structural impossibility).**
A rung-1 fix would make it impossible for `cdk destroy` to be
invoked without the build — e.g. by deleting the underlying `cdk
destroy --all --force` invocation from anywhere a human or CI could
reach, leaving only the workspace `pnpm run destroy` path. That's
not credible: `cdk destroy` is a public CLI command we don't own,
and any operator with the repo checked out can invoke it directly
and reproduce the original failure. Rung 2 is the honest level — the
canonical invocation through `pnpm run destroy` is correct by
construction, and the eradication-checks test refuses to let a
sibling app ship a regression.

**Sibling defects swept:**
- The same `|| echo "(failure)"` shape was present in both workflows
  (`preview.yml` teardown + `cleanup-orphans.yml`) and was fixed in
  both in commit `8b581dc`.
- No other workflow in `.github/workflows/` uses the `cdk destroy ...
  ||` pattern (grep'd).
- `apps/borsouvertures/` (under construction in PR #8) does not yet
  exist on `main`; the eradication-checks test will hold the line
  when it lands. PR #8 / PR #10 author will see a CI red if the
  destroy script there ships without the chain.

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
  dantotsu and the patch above. The same script run is what surfaced
  the deeper `CannotFindAsset` root cause that drove this revision.

---

## Prior eradication (rolled forward 2026-05-11 same day, kept for audit)

> **The original Eradication landed earlier on 2026-05-11 as a
> rung-4 detection-only fix in commit `8b581dc`. Within hours, the
> first manual run of `scripts/cleanup-pr-9.sh` surfaced the deeper
> `CannotFindAsset` failure mode the detection layer was designed to
> reveal. The fix above (commit `6632679`) makes the underlying
> defect a DevX-check-prevented regression instead of a detection-
> only one. The detection layer remains as a sibling backstop.**
>
> The original Eradication section read:
>
> > **Type:** code diff (level 4 — detection)
> >
> > **Reference:** commit `8b581dc`
> >
> > [workflow diffs preserved above under "Sibling detection layer"]
> >
> > **Why level 4, not level 1.** Making this defect *structurally
> > impossible* would mean encoding the stack's intended lifetime in
> > a type-safe way that AWS would enforce — AWS doesn't offer "delete
> > this stack at time T". A DevX check (level 2) over bash exit-code
> > semantics is also not credible. The honest level is detection:
> > when destroy fails, the workflow turns red and the operator sees
> > it within 24h instead of 8+ days.
>
> **Why the rung-4-only framing was wrong.** The original entry
> attributed the failure to bash exit-code semantics — true, but
> downstream. The actual misconception was the missing build chain
> in `destroy`, which produced the non-zero exit in the first place.
> The detection layer is necessary (anyone can invoke `cdk destroy`
> directly) but not sufficient — the canonical script path can and
> should be correct by construction. Rung 2 was reachable; the
> original draft missed it because the symptom (silent green CI)
> obscured the underlying mechanism (synth-without-build).

---
date: 2026-11-11
introduced-at: implementation
detected-at: staging
severity: medium
related-pr: '#290'
fix-pr: '#290'
fix-commits: [2d59df1c1, self]
eradication-level: 1
eradication-paths: [infra/cdk/src/internal/stage-wiring.utils.ts, scripts/preflight-preview-recovery.sh, scripts/preflight-preview-recovery.test.ts, .github/workflows/preview.yml]
time-to-detect: days
tags: [cdk, ci, preview, deploy, github-actions]
zone: scripts/preflight-preview-recovery.sh
weak-point: gate-measures-nothing
recurs: none (the first entry on a preview stack's log groups; cdk-failed-deploy-leaves-retained-buckets-orphaned is the same RETAIN default on buckets)
---

# A preview stack lost its logs to the script meant to protect it

## User impact

The operator opened the pragma-pr-290 logs to read the wide events the pull
request added, and found none.

| | Seen | Expected |
| --- | --- | --- |
| Preview API logs after the second push | CloudWatch says `/aws/lambda/pragma-pr-290-api` does not exist, while CloudFormation lists it (measured in #290 commit `5e37dfe`, squashed into `2d59df1c1`) | One JSON line per request |
| Log groups left in the account after previews closed | 934 groups named `/aws/lambda/<app>-pr-<N>-*`, 728 with no retention, so they never expire (measured 2026-11-11 with `describe-log-groups`) | None once a pull request closes |

## Causal chain

- A preview API wrote its logs into a log group that no longer existed.
  - `preflight-preview-recovery.sh` deleted every `/aws/lambda/<app>-pr-<N>-*` group before each deploy, the live stack's own included.
    - Its step 2 was written for a rolled-back stack, whose log group collides with the retry's `LogGroup` resource, and ran whatever the stack's state.
      - The collision existed because CDK's `LogGroup` defaults to `RemovalPolicy.RETAIN`, so a rollback or a destroy leaves the group behind.
- CloudFormation never recreated the group, because its record still listed it.
  - #290's first repair recreated the group by hand, which gave it neither the stack's tags nor, at first, its retention.

## Root cause of occurrence

*Thought a log group under the stack's prefix was an orphan, actually a live
stack owns every group under that prefix.*

The script's header names the orphan case only: "Orphan log groups left behind
when the Lambda was created and AWS auto-provisioned its log group before the
stack rolled back." The deletion it wrote did not ask whether a stack still
owned the group. The orphans it existed to remove were themselves made by the
`RETAIN` default that `infra/cdk/src/constructs/lambda-api.ts` never
overrode, so the script was a cleanup for a leak nobody had stopped.

## Detection failure causes

- **Tests:** the script had none. Each of #290's three fixes was checked with
  a fake `aws` on `PATH` written by hand and then thrown away.
- **Deploy:** a redeploy succeeds when the log group is gone. The Lambda logs
  nothing and reports no error, so only a person reading logs sees it.
- **Account hygiene:** nothing counts log groups, so 934 accumulated unseen.

## Countermeasure

#290 ran step 2 only once no stack is left, in its commit `5e37dfe`, and added a
step that recreated the groups a live stack had lost. This pull request removes
that restore step, because its only cause was the deletion #290 stopped, and
the only stack it repaired is destroyed. That also removes the recreated
groups without tags.

## Eradication

**Type:** structural impossibility (level 1), with a detection test (level 4)
behind it.

**Reference:** the kaizen branch for PR #290, commit `self`.

The shared constructs now give every log group `RemovalPolicy.DESTROY` on any
stage but prod, so a destroyed or rolled-back preview takes its groups with it
and a retry finds nothing to collide with.

```diff
+export function selectLogGroupRemovalPolicy(stage: Stage): RemovalPolicy {
+  if (isProductionStage(stage)) return RemovalPolicy.RETAIN;
+  return RemovalPolicy.DESTROY;
+}
```

```diff
     const logGroup = new LogGroup(this, 'Logs', {
       logGroupName: `/aws/lambda/${lambdaFunctionName(props, handlerSlug)}`,
       retention: RetentionDays.ONE_WEEK,
+      removalPolicy: selectLogGroupRemovalPolicy(props.stage),
     });
```

The Lambdas CDK adds for its own custom resources, such as `BucketDeployment`
and `S3AutoDeleteObjects`, create their groups at first call with no
retention, and no construct prop reaches them. Preview teardown now runs the
preflight once the stack is destroyed, so its orphan sweep removes them.

```diff
             if pnpm --filter "@borso-app/$app" run destroy; then
               echo "[ok] $stack destroyed"
+              ./scripts/preflight-preview-recovery.sh "$app" "$PR_NUMBER"
```

`scripts/preflight-preview-recovery.test.ts` runs the script against a fake
`aws` and asserts that a live stack loses no log group, that an absent stack's
groups are swept, and that a rolled-back stack is deleted before its sweep.
The prod templates do not change, because `RETAIN` is already the default
there, and `infra/shared`'s snapshot test passes unchanged.

**Proof it can fail:** the test run against the script as it was before #290:

```
 FAIL  scripts/preflight-preview-recovery.test.ts > preflight-preview-recovery.sh > leaves every log group of a live stack in place
AssertionError: expected [ '/aws/lambda/pragma-pr-7-api', …(2) ] to strictly equal []
      Tests  1 failed | 2 passed (3)
```

**Similar instances:** `grep -rn "new LogGroup" infra/cdk/src` finds six, and
five now take the selector. The sixth, in `internal/origin-verify.ts`, is built
only when the API sits behind CloudFront, which `previewable-app.ts` does on
prod alone. The 934 groups already left behind stay until the
operator decides to delete them, because sessions here hold read-only AWS.

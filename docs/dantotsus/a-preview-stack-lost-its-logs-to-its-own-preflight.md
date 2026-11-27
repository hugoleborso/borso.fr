---
date: 2026-11-11
introduced-at: implementation
detected-at: staging
severity: medium
related-pr: '#290'
fix-commits: [2d59df1c1, self]
eradication-level: 4
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

    ```bash
    # --- 2. Orphan Lambda log groups ---
    aws logs describe-log-groups --log-group-name-prefix "$LOG_GROUP_PREFIX" ...
    aws logs delete-log-group --log-group-name "$log_group" ... # ❌ whatever the stack's state
    ```

    - Commit `304b89247` (2026-05-13, an agent) wrote the step after PR #12's retry hit `AWS::Logs::LogGroup /aws/lambda/last-loop-lepin-pr-12-api already exists`. Its message calls that group an "orphan from the rollback that left the auto-created Lambda log group behind".
      - The retry collided because the rollback had left the group behind. CDK gives a `LogGroup` `RemovalPolicy.RETAIN` by default, and `lambda-api.ts` did not override it. (Machine)
      - The step deleted every group under the prefix because the writer read the group as auto-created. It was not. `lambda-api.ts` had declared it as a stack resource since the port (`git show 1aa979e74:infra/cdk/src/constructs/lambda-api.ts`, line 71, `new LogGroup(this, 'Logs', …)`). The commit's input was the CloudFormation error, and its diff does not touch the construct. (Material)
  - CloudFormation never recreated the group, because its record still listed it.
    - #290's first repair recreated the group by hand, which gave it neither the stack's tags nor, at first, its retention.

## Root cause of occurrence

*Thought a log group under the stack's prefix was one Lambda had auto-created,
so deleting it was harmless, actually the construct declares it as a stack
resource that CloudFormation keeps in its record and never recreates.*

Material, inferred. The script's header names the orphan case only: "Orphan
log groups left behind when the Lambda was created and AWS auto-provisioned its
log group before the stack rolled back." An auto-provisioned group is recreated
by Lambda at its next call, so deleting one is safe. A declared one is not. The
collision the script answered was itself made by the `RETAIN` default that
`lambda-api.ts` never overrode, so the script was a cleanup for a leak nobody
had stopped.

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

**Type:** detection (level 4). The shared constructs' own groups cannot leak,
and the groups of CDK's internal Lambdas rely on a sweep called from chosen
teardown branches.

**Reference:** commit [`2d59df1c1`](https://github.com/hugoleborso/borso.fr/commit/2d59df1c1) and the commit adding this file.

The shared constructs give every log group `RemovalPolicy.DESTROY` on any
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

`scripts/preflight-preview-recovery.test.ts` runs the script against a fake
`aws` and asserts that a live stack loses no log group, that an absent stack's
groups are swept, and that a rolled-back stack is deleted before its sweep.

The Lambdas CDK adds for its own custom resources, such as `BucketDeployment`
and `S3AutoDeleteObjects`, create their groups at first call, and no construct
prop reaches them. Preview teardown runs the sweep after a destroy.

The gap, measured. This entry first claimed level 1. On 2026-11-14 the
operator backlog item `preview-teardown-log-group-check.md` was closed
`refuted`: the teardown of #319 logged `[skip] last-loop-lepin-pr-319: stack
does not exist`, the skip branch never ran the sweep, and three groups
remained. `preview-log-groups-of-five-teardowns.md` then deleted 13 groups
left by five teardowns. `preview.yml` now calls the sweep on the skip branch
too (lines 503 to 511). Any new teardown branch has to remember to call it.

**Proposed:** a CDK Aspect in `infra/cdk/src/internal/` that, outside prod,
points every `AWS::Lambda::Function`'s `LoggingConfig.LogGroup` at a
stack-owned group with `DESTROY`, CDK's internal Lambdas included. Every
teardown path would then leave no group, and the sweep and its call sites
could be deleted. Feasibility is inferred, not tried.

**Proof it can fail:** the test run against the script as it was before #290:

```
 FAIL  scripts/preflight-preview-recovery.test.ts > preflight-preview-recovery.sh > leaves every log group of a live stack in place
AssertionError: expected [ '/aws/lambda/pragma-pr-7-api', …(2) ] to strictly equal []
      Tests  1 failed | 2 passed (3)
```

**Similar instances:** `grep -rn "removalPolicy: selectLogGroupRemovalPolicy" infra/cdk/src`
finds five log groups in four constructs. `internal/origin-verify.ts` builds
the sixth only behind CloudFront, which `previewable-app.ts` does on prod
alone.
The 934 groups already left behind on 2026-11-11 went to the operator backlog
as `docs/operator-backlog/orphan-preview-log-groups.md`, closed `done` the same
day.

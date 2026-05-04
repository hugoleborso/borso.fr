---
date: 2026-05-04
introduced-at: conception
detected-at: operator-deploy
severity: high
related-pr: #6
fix-pr: #7
fix-commits: [<to-be-filled>]
eradication-level: 2
time-to-detect: minutes
tags: [cdk, s3, cloudformation, deploy]
---

# A failed first deploy leaves the retained S3 bucket as an orphan; retries 409 on bucket-name reuse

## Symptom

After fixing the CloudFront CNAME conflict from
[`docs/dantotsus/cloudfront-cname-must-be-released-before-redeploy.md`](./cloudfront-cname-must-be-released-before-redeploy.md)
and re-running the deploy from CI, the new failure was:

```
└─ borso-fr-prod
   └─ Site
       └─ Bucket
           └─ Resource (AWS::S3::Bucket SiteBucket978D4AEB)
               🛑 Resource of type 'AWS::S3::Bucket' with identifier
                  'borso-fr-prod' already exists.
                  (at /Resources/SiteBucket978D4AEB)
```

The bucket `borso-fr-prod` existed in S3, was empty, was not part of any
CloudFormation stack, and the new stack's `CREATE_IN_PROGRESS` couldn't claim
the name.

## Root-cause chain

1. **Why** did `borso-fr-prod` already exist when the second deploy ran?
   Because the first deploy attempt got far enough to create the bucket
   before failing at a later step (the CloudFront alias 409). When CFN rolled
   the stack back, it left the bucket behind.

2. **Why** did CFN leave the bucket behind?
   The CDK `StaticSite` construct creates the bucket with
   `RemovalPolicy.RETAIN` (so a successful deploy followed by a stack delete
   doesn't drop user data) and CFN treats `RetainOnRollback` as the default
   for retained resources during a failed-create rollback. The bucket is
   considered "potentially still owned by something else" so CFN refuses to
   delete it on rollback.

3. **Why** doesn't the second deploy import / reuse the existing bucket?
   CDK doesn't try to. From CFN's view the new stack has no prior knowledge
   of the bucket — the first stack rolled back, the bucket isn't in any stack's
   resource set, and CFN's `CreateStack` issues a literal `CreateBucket` API
   call which fails with `BucketAlreadyOwnedByYou`.

4. **Why** is the obvious fix (delete the bucket and retry) safe here?
   Because the bucket is empty and not referenced by any current resource:
   the deploy that created it never reached the `BucketDeployment` step that
   uploads `dist/`. Verified via:
   ```bash
   aws s3 ls s3://borso-fr-prod/                       # empty
   aws s3api list-object-versions --bucket borso-fr-prod  # no versions, no delete markers
   aws s3api get-bucket-versioning --bucket borso-fr-prod  # versioning disabled
   ```
   `aws s3 rb s3://borso-fr-prod` removes it cleanly; the next deploy creates
   it fresh.

5. **Why** is this not a one-off?
   Any first deploy that crashes after `CreateBucket` succeeded but before
   the rest of the stack landed will reproduce this. The alias-conflict was
   *one* such failure; the next will be something else (cert-issued-too-late,
   IAM-permission-eventual-consistency, BucketDeployment Lambda timeout, …).

**Root cause:** *thought* "the cleanup of a failed `CREATE_IN_PROGRESS` stack
would also remove the bucket"; *actually* `RemovalPolicy.RETAIN` (or the CDK
default for buckets that hold user data) means CFN leaves the bucket behind
on rollback, and a bucket with a literal `bucketName` cannot be re-created
on retry — the operator has to clean up the orphan first.

## Detection failure causes

- **Typing / linter / CI:** N/A — runtime AWS API error.
- **Local synth (`cdk diff`, `cdk synth`):** these compare the proposed
  template against the *target stack*'s existing template. They cannot see
  resources that exist in the account but are *not* part of the target stack.
- **CI:** the deploy job ran, `CreateStack` returned the 409 mid-flight, the
  stack rolled back. The CI doesn't have a step between `cdk synth` and
  `cdk deploy` that probes the account for orphans.
- **Code review:** reviewer would have to hold a complete mental model of
  every previous deploy's failure mode, which is not realistic.

## Countermeasure

Delete the orphan bucket and re-run the deploy.

```bash
# Verify empty (script-and-script-only; the human runs these by hand):
aws s3 ls s3://borso-fr-prod/
aws s3api list-object-versions --bucket borso-fr-prod \
  --output text --query '[Versions[],DeleteMarkers[]]'
aws s3api get-bucket-versioning --bucket borso-fr-prod

# If the three commands all show empty / disabled, delete:
aws s3 rb s3://borso-fr-prod

# Re-run the deploy.
```

- **Code:** none for the recovery itself.
- **Operator action:** above commands, then re-run CI.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-deploy preflight script)

**Reference:** PR #7 · commit `<kaizen-commit>`

**The actual fix:** add a second preflight script
`scripts/preflight-orphan-buckets.sh` that runs after
`scripts/preflight-cloudfront-aliases.sh` and before `cdk deploy`. It walks
every `AWS::S3::Bucket` resource in `cdk.out/*.template.json` that declares
a literal `BucketName`, and for each:

1. `aws s3api head-bucket` — if the name is free, no conflict.
2. `aws cloudformation describe-stack-resources --physical-resource-id` —
   if the bucket is owned by the *target* stack, CFN will issue an update
   not a create, so no conflict.
3. Otherwise the bucket is either an orphan from a prior failed deploy or
   owned by a different stack. The script lists it and exits non-zero with
   the recovery commands inline (`aws s3 ls`, `aws s3 rb`).

The borso-fr deploy script is updated to chain the new preflight after the
existing CloudFront-alias preflight:

```diff
- "deploy": "… && cdk synth --all && ../../scripts/preflight-cloudfront-aliases.sh cdk.out && cdk deploy …",
+ "deploy": "… && cdk synth --all && ../../scripts/preflight-cloudfront-aliases.sh cdk.out && ../../scripts/preflight-orphan-buckets.sh cdk.out && cdk deploy …",
```

The pattern generalises: every fixed-name AWS resource the CDK creates with
`RemovalPolicy.RETAIN` can produce orphans the same way (Route53 records,
IAM roles with literal names, DSQL clusters, etc.). For now the script
covers S3 only, since that's the resource type that bit us this PR. Future
deploys touching other retained-with-fixed-name resources should extend
the script with a new section per type.

**Sibling defects swept:** none yet observed in the repo, but the same
pattern applies to every consumer of `StaticSite` (`borsouvertures` when its
migration runs) and to any future construct that pins a `bucketName`.

## See also

- [`docs/dantotsus/cloudfront-cname-must-be-released-before-redeploy.md`](./cloudfront-cname-must-be-released-before-redeploy.md) — same migration-cutover defect family at the CloudFront layer; eradication chained alongside this one.
- [`docs/dantotsus/dsql-first-deploy-must-be-prod.md`](./dsql-first-deploy-must-be-prod.md) — sister vendor-ordering rule that surfaces only at deploy time.
- [`docs/dantotsus/bucketdeployment-prune-default.md`](./bucketdeployment-prune-default.md) — same `BucketDeployment` resource that didn't get a chance to run on the first failed deploy.

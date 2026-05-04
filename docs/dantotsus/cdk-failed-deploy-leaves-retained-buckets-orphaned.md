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

## Eradication

**Type:** Knowledge entry (level 5 — floor)

**Reference:** PR #7 · [`docs/knowledge/cdk-retain-buckets-orphan-on-failed-create.md`](../knowledge/cdk-retain-buckets-orphan-on-failed-create.md)

**Decision:** an earlier draft of this entry shipped a `scripts/preflight-orphan-buckets.sh` (level 2 DevX check) that scanned `cdk.out` for pinned `BucketName`s and head-checked each one against S3 + CFN before allowing `cdk deploy` to proceed. PR #7 review concluded the gate was heavy-handed for a rare failure mode (first-deploy partial rollback) with a three-command manual recovery, and rolled it back in favour of a knowledge entry.

The knowledge entry [`docs/knowledge/cdk-retain-buckets-orphan-on-failed-create.md`](../knowledge/cdk-retain-buckets-orphan-on-failed-create.md) carries:

- the conditions under which the orphan path triggers (literal `bucketName` + `RemovalPolicy.RETAIN` + first-deploy failure post-bucket-create),
- three structural alternatives ranked by strength (drop the literal name, rehearse via preview, document recovery),
- the verbatim three-command recovery (head-check empty, confirm no live owner, `aws s3 rb`).

Future occurrences are expected to be detected at deploy time (CFN fails with `BucketAlreadyOwnedByYou`) and resolved by an operator following the recovery commands. If the failure mode recurs more than once, escalate this back to a level-2 eradication.

**Sibling defects swept:** none yet observed. The same pattern applies to every consumer of `StaticSite` and to any future construct pinning a `bucketName` with `RETAIN`; the knowledge entry is the team-wide notice.

## See also

- [`docs/dantotsus/cloudfront-cname-must-be-released-before-redeploy.md`](./cloudfront-cname-must-be-released-before-redeploy.md) — same migration-cutover defect family at the CloudFront layer; eradication chained alongside this one.
- [`docs/dantotsus/dsql-first-deploy-must-be-prod.md`](./dsql-first-deploy-must-be-prod.md) — sister vendor-ordering rule that surfaces only at deploy time.
- [`docs/dantotsus/bucketdeployment-prune-default.md`](./bucketdeployment-prune-default.md) — same `BucketDeployment` resource that didn't get a chance to run on the first failed deploy.

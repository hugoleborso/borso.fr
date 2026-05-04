---
date: 2026-05-04
tags: [cdk, s3, cloudformation, deploy]
---

# CDK `RemovalPolicy.RETAIN` on a literal-named bucket leaves orphans on first-deploy failure

## What happens

A CDK stack containing an `S3.Bucket` with both:

- an explicit `bucketName: 'borso-fr-prod'` (or any pinned name), and
- `removalPolicy: RemovalPolicy.RETAIN`

…will leave the bucket behind in the AWS account if the *first* deploy of the stack fails after the bucket has been created but before the rest of the stack succeeds. CloudFormation rolls the stack back, but `RETAIN` instructs it to *keep* every resource that already existed at rollback time.

The next deploy attempts to create a fresh bucket with the same literal name, and AWS::S3::Bucket fails with `BucketAlreadyOwnedByYou` because the orphan is still there. There is no automatic recovery: a human has to delete the orphan (or import it into the new stack).

## Why both conditions matter

- **Without the literal name**, CDK auto-generates a unique name on each deploy — collisions are impossible. The orphan becomes a cost-per-month curiosity, not a deploy blocker.
- **Without `RETAIN`**, CFN would auto-delete the bucket on rollback. (Default for `Bucket` is `DESTROY` in CDK 2.x — the dangerous combination is opt-in.)

The combination is desirable for prod static-site buckets — predictable name, safety net against accidental delete — and that's exactly when the rollback path bites.

## Avoiding the trap

Three options, in order of structural strength:

1. **Drop the literal `bucketName`.** CDK auto-names. Trade-off: bucket name becomes opaque (`stage-static-site-bucket123abc4`). For static-site origins this is invisible — CloudFront takes whatever name the origin reports. Use this whenever the bucket name doesn't appear in operator-facing tooling.
2. **Keep the literal name + `RETAIN` but ensure the *first* deploy is rehearsed in `preview`.** The orphan path only triggers on first-create rollback; preview catches the same construct shape under a different name and exercises the create flow before prod ever sees it.
3. **Keep both, document the manual recovery.** Below.

## Manual recovery (the path that bit us in PR #6 prod cutover)

```bash
# 1. Confirm the bucket is empty (objects + versions).
aws s3api list-object-versions --bucket borso-fr-prod
# → expect "Versions": null, "DeleteMarkers": null

# 2. Confirm no live stack owns it.
aws cloudformation describe-stack-resources \
  --physical-resource-id borso-fr-prod
# → expect ValidationError "Stack for ... does not exist"

# 3. Delete.
aws s3 rb s3://borso-fr-prod
```

After step 3, retry the deploy.

## Why we don't ship a preflight gate for this

We did, briefly (a `scripts/preflight-orphan-buckets.sh` walking `cdk.out` and head-checking each pinned `BucketName` against S3). It got cut for being heavy-handed: the orphan path is rare (first-deploy partial failure), the recovery is three commands, and the preflight slowed every deploy and added a code surface that itself can break. The trade is favourable to a knowledge entry: cheap to read, no deploy-time cost, and the recovery commands are right here.

## See also

- [`docs/dantotsus/cdk-failed-deploy-leaves-retained-buckets-orphaned.md`](../dantotsus/cdk-failed-deploy-leaves-retained-buckets-orphaned.md) — the original RCA. Note: that entry's "level 1 eradication via preflight" was rolled back in favour of this knowledge entry (level 5).
- [`docs/knowledge/cloudfront-cname-uniqueness.md`](./cloudfront-cname-uniqueness.md) — sister trap from the same migration, kept as a preflight because CloudFront alias collisions break deploys non-recoverably (the deploy can hang for hours waiting on AWS retries).

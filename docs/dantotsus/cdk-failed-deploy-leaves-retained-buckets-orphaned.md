---
date: 2026-05-04
introduced-at: conception
detected-at: operator-deploy
severity: high
related-pr: '#6'
fix-commits: [a1bcefe385]
eradication-level: 1
eradication-paths: [infra/cdk/src/constructs/static-site.ts, infra/cdk/test/unit/eradication-checks.test.ts]
time-to-detect: minutes
tags: [cdk, s3, cloudformation, deploy]
zone: infra/cdk/src/constructs/static-site.ts
---

# The retry of a failed first deploy collided with the bucket the failure left behind

## User impact

The first prod deploy of borso-fr failed on a CloudFront alias conflict (see `cloudfront-cname-must-be-released-before-redeploy.md`). After that was fixed, the retry from CI failed too.

| | Seen | Expected |
| --- | --- | --- |
| Retry of the first prod deploy | `Resource of type 'AWS::S3::Bucket' with identifier 'borso-fr-prod' already exists.` The stack rolled back again. | The retry creates the stack. |

The bucket `borso-fr-prod` existed, was empty, and belonged to no stack.

## Causal chain

- The retry failed because `borso-fr-prod` already existed.
  - The first, failed attempt had created the bucket, and its rollback left it in place.
    - CloudFormation keeps a resource with `DeletionPolicy: Retain` when it rolls back a failed create.
      - The construct created the prod bucket with `RemovalPolicy.RETAIN`:

        ```ts
        const bucket = new Bucket(this, 'Bucket', {
          bucketName: bucketName(props, stack.region, stack.account),
          ...
          removalPolicy: RemovalPolicy.RETAIN, // ← kept on rollback
        });
        ```

        - Commit `1aa979e74` (2026-05-01, an agent) ported this construct "verbatim from upstream", from `hugoleborso/borso-platform`.
  - The retry asked for the same literal name, `borso-fr-prod`, so it could not create a fresh bucket beside the orphan.
    - The same lines pin `bucketName`. Nothing outside the construct reads that name: `grep -rn "bucketName(" infra apps --include=*.ts` finds only its definition and its one call in `static-site.ts` (Machine).

## Root cause of occurrence

*Thought every bucket should be `RETAIN` as the safe default, actually `RETAIN` protects only data that cannot be rebuilt, and a static-site bucket holds only the output of `pnpm build`.* (Man)

The reflex is the canonical CDK pattern for data buckets. Here it bought no protection and added the orphan on a failed create. The commit that removed it says so: "Static-site buckets hold only build artefacts from dist/ … fully rebuildable from source" (`a1bcefe`).

## Detection failure causes

- **Typing and linter:** `RemovalPolicy.RETAIN` is a valid value. No rule asks what the bucket holds.
- **Local synth and diff:** they compare with the target stack's template. They cannot see a bucket that exists in the account outside any stack.
- **CI:** no step between synth and deploy probes the account for a resource with the same name.
- **Review:** `RETAIN` reads as textbook safety unless the reviewer asks whether this bucket holds anything irreplaceable.

## Countermeasure

The operator checked the orphan was empty (`aws s3 ls`, `aws s3api list-object-versions`), deleted it with `aws s3 rb s3://borso-fr-prod`, and re-ran the deploy. The deploy succeeded.

## Eradication

**Type:** structural impossibility (level 1), for every app that uses the construct.

**Reference:** commit [`a1bcefe`](https://github.com/hugoleborso/borso.fr/commit/a1bcefe3856143b12eb0ae4ad494073fba0f3a59)

```diff
-      removalPolicy: RemovalPolicy.RETAIN,
+      removalPolicy: RemovalPolicy.DESTROY,
+      autoDeleteObjects: true,
```

`StaticSiteProps` has no removal-policy prop, so no app can express `RETAIN` on its site bucket. A failed first deploy now deletes the bucket on rollback. Inside the construct, `infra/cdk/test/unit/eradication-checks.test.ts` refuses `RemovalPolicy.RETAIN` in `static-site.ts`, and `infra/cdk/test/unit/static-site.test.ts` asserts `DeletionPolicy: 'Delete'` and a `Custom::S3AutoDeleteObjects` resource.

The pinned name remains. It caused a second defect, `a-bucket-name-someone-else-already-owned.md`, where the literal name was already taken in the global S3 namespace. That fix added the `bucketNameSuffix: 'account'` option and a check in `scripts/check-app-registration.sh`.

**Proposed:** subtract the name. Drop `bucketName` from the prod `Bucket` in `static-site.ts` and let CloudFormation generate it. A retry could then never collide with an orphan, and no name could be taken by another account. The `RETAIN` regex guard, the `bucketNameSuffix` option, `accountScopedBucketName` and the registration check would all go. Each existing prod bucket would be replaced once at the next deploy (inferred from how CloudFormation handles a name change), which is safe because the bucket holds only rebuildable output.

**Proof it can fail:** not planted this session. Putting `RemovalPolicy.RETAIN` back in `static-site.ts` would fail `expect(stripped).not.toMatch(/RemovalPolicy\.RETAIN/)` (inferred from the assertion).

**Similar instances:** `grep -rn "RemovalPolicy.RETAIN" infra/cdk/src infra/shared/lib` finds two. Prod log groups (`stage-wiring.utils.ts`) carry no pinned name. The shared previews bucket (`shared-stack.ts`) is an account singleton deployed only by the operator, outside any first-deploy retry.

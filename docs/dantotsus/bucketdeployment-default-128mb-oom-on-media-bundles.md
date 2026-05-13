---
date: 2026-05-12
introduced-at: conception
detected-at: ci
severity: high
related-pr: 11
fix-pr: 11
fix-commits: [c2eea65, 374c8c9]
eradication-level: 1
time-to-detect: hours
tags: [cdk, s3, bucket-deployment, lambda, preview, deploy]
---

# CDK BucketDeployment Lambda OOMs on multi-MiB bundles with cryptic SSL EOFs

## Symptom

PR #11 added ~10 MiB of media assets to `apps/borso-fr/site/public/media/12-travaux/`. The preview deploy hung in `UPDATE_IN_PROGRESS` for ~15 minutes, then failed. The custom resource backing CDK's `BucketDeployment` reported, in CloudWatch logs:

```
upload failed: ../../tmp/.../media/12-travaux/septembre-2025-triathlon-groupe.jpg
  to s3://borso-previews/borso-fr/pr-11/media/...
  SSL validation failed for https://borso-previews.s3.eu-west-3.amazonaws.com/...
  [SSL: UNEXPECTED_EOF_WHILE_READING]
  EOF occurred in violation of protocol (_ssl.c:1032)

[ERROR] cfn_error: b"Command '['/opt/awscli/aws', 's3', 'sync',
  '/tmp/.../contents', 's3://borso-previews/borso-fr/pr-11']'
  returned non-zero exit status 1."
REPORT Duration: 879565.21 ms Billed Duration: 879566 ms
  Memory Size: 128 MB Max Memory Used: 126 MB
```

CloudFormation rolled back. The next CI deploy job (started after the user stopped the rolling stack) failed in 42 seconds because CFN refused operations during `UPDATE_ROLLBACK_IN_PROGRESS` — looked like a code regression but was a state-machine block.

## Root-cause chain

1. **Why did `aws s3 sync` crash with an SSL EOF?**
   The CDK `BucketDeployment` construct ships a Lambda backed by `python:3.11` + a bundled `awscli`. The Lambda was running at 126 / 128 MB — out of memory headroom. When Python is memory-pressured, the OpenSSL handshake state can be evicted mid-handshake; S3 closes the connection; `aws s3 sync` interprets the EOF as a transient error, retries until it exhausts its budget, then exits non-zero.

2. **Why was the Lambda only allocated 128 MB?**
   `BucketDeployment`'s `memoryLimit` prop defaults to 128 MB. The construct's documented use case is "small static-site bundles" — the framing assumes a handful of HTML/JS/CSS files. Multi-megabyte image bundles are off-pattern but not rejected.

3. **Why were we shipping 10 MiB of media into a static-site bundle?**
   The `/12-travaux` feature retroactively documents Hugo's monthly challenges with photos and a video. The site is the right home for the assets (no CMS needed; everything stays version-controlled). The bundle is going to grow, not shrink.

4. **Why didn't anyone notice the 128 MB default during conception?**
   The construct's defaults are right for the *original* static-site shape this repo deploys. No app had previously crossed a few MiB of assets. The default became a latent footgun the moment we landed image-heavy content.

**Root cause:** thought `BucketDeployment`'s Lambda defaults were tuned for arbitrary static-site payloads; actually the 128 MB default OOMs on anything past a few MiB of total upload, and the failure mode is a misleading SSL error rather than an OOM kill.

## Detection failure causes

- **Typing:** the CDK construct accepts the bundle without complaint at synth time; size is opaque to the type system.
- **Linter / static analysis:** Biome doesn't audit CDK construct usage.
- **Functional validation locally:** local dev never invokes the BucketDeployment Lambda. `pnpm dev` serves files directly from `site/public/`; the OOM is invisible until cloud deploy.
- **CI (build):** the bundle builds successfully; `pnpm build` doesn't probe upload feasibility.
- **Code review:** the construct call looks idiomatic; the missing `memoryLimit` is the absence of a prop, not the presence of a wrong one. Reviewers don't flag what isn't there.
- **Staging monitoring:** preview *is* the staging environment for this app; the OOM only fires here.

## Countermeasure

The eradication landed in the StaticSite construct (which both prod and preview deploys flow through), so every app inherits the bump without per-app changes.

- **Code:** commit [`c2eea65`](https://github.com/hugoleborso/borso.fr/commit/c2eea65058a85f108302f4df505de017a85c2a6b) — `BucketDeployment` `memoryLimit: 512` on both the prod and preview paths inside `infra/cdk/src/constructs/static-site.ts`, with a comment explaining the SSL-EOF symptom so the next reader doesn't roll the number back.
- **Code:** commit [`374c8c9`](https://github.com/hugoleborso/borso.fr/commit/374c8c965df168d3e08c10b1a3a06fefa9b4a2bf) — recompressed the actual /12-travaux JPEGs to 1600 px / q80 (13 MiB → 9.3 MiB). Defence in depth: smaller bundles upload faster regardless of Lambda memory.
- **Operator action:** during the original failure, the rollback Lambda itself re-uploads the *old* asset set — equally large. If you ever see a `UPDATE_ROLLBACK_IN_PROGRESS` that's been running close to the 15-minute Lambda timeout, it may be on the verge of `UPDATE_ROLLBACK_FAILED`. Wait it out or, if it fails, `aws cloudformation continue-update-rollback`.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility at the construct boundary)

**Reference:** [PR #11](https://github.com/hugoleborso/borso.fr/pull/11) · commit [`c2eea65`](https://github.com/hugoleborso/borso.fr/commit/c2eea65058a85f108302f4df505de017a85c2a6b)

**The actual fix:**

```diff
     new BucketDeployment(this, 'Deploy', {
       sources: [Source.asset(path.resolve(props.assetsPath))],
       destinationBucket: bucket,
       distribution,
       distributionPaths: ['/*'],
+      // 128 MB (the default) leaves no headroom for `aws s3 sync` to upload
+      // multi-MiB media bundles and crashes with `[SSL: UNEXPECTED_EOF_WHILE_READING]`.
+      memoryLimit: 512,
     });
```

The same change landed on the preview-path `BucketDeployment` a few lines down. Every static-site app now deploys through a Lambda with 4× the memory; the 128 MB OOM cannot recur via this construct.

**Sibling defects swept:** preview-path `BucketDeployment` in the same file (the construct keeps the two deployments structurally distinct because preview uses a shared bucket with a key prefix); both paths now set `memoryLimit: 512` and carry the same explanatory comment.

## See also

- [`docs/knowledge/cfn-rollback-blocks-redeploys.md`](../knowledge/cfn-rollback-blocks-redeploys.md) — the secondary symptom (next CI deploy failing in 42 s) that made this defect look like a regression.
- [`docs/dantotsus/bucketdeployment-prune-default.md`](./bucketdeployment-prune-default.md) — sibling default-footgun on the same construct (`prune: true` wipes co-tenant prefixes); precedent for adjusting CDK construct defaults at the wrapper boundary.
- [`docs/dantotsus/bucketdeployment-cloudfront-invalidation.md`](./bucketdeployment-cloudfront-invalidation.md) — third reason the `BucketDeployment` construct's defaults need wrapping (invalidation scope).

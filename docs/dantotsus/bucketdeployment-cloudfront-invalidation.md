---
date: 2026-05-02
introduced-at: conception
detected-at: production
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-pr: https://github.com/hugoleborso/borso.fr/pull/2
fix-commits: [2a4aef4]
eradication-level: 1
time-to-detect: hours per redeploy (bug surfaced every iteration)
tags: [cdk, cloudfront, s3, bucketdeployment, caching]
---

# `BucketDeployment` doesn't invalidate CloudFront unless you tell it to

## Symptom

After fixing the Mondrian generator's HTML and pushing, the preview
URL kept serving the previous version. Hard-refresh in the browser
sometimes worked, sometimes didn't. The S3 bucket clearly had the
new bytes (`aws s3 cp ... -` showed them) but CloudFront kept handing
out stale HTML.

User impact: every iteration on a preview required either a
manual `aws cloudfront create-invalidation`, a browser hard-refresh
in the right window, or waiting ~24 h. Nobody would do any of these
in a tight inner loop.

## Root-cause chain

1. **Why?** CloudFront serves old content after a successful deploy.
   Because the edge cache holds the previous response keyed on the URI.
   The bucket has new content, but no one told CloudFront to evict.
2. **Why doesn't CDK invalidate automatically?**
   `BucketDeployment` calls `CreateInvalidation` ONLY when its
   `distribution` and `distributionPaths` props are set. Without
   them, CDK has no `IDistribution` to call against.
3. **Why is `prod`'s deploy fine but the preview path was broken?**
   The `prod` `BucketDeployment` already passes `distribution +
   distributionPaths: ['/*']` — the construct created the
   distribution itself, so the reference is right there. Preview's
   `BucketDeployment` uploads to the **shared** previews bucket and
   didn't have a reference to the **shared** distribution.
4. **Why couldn't preview reference the shared distribution?**
   `Distribution.fromDistributionAttributes(...)` requires both the
   distribution id AND its `domainName` (`d…cloudfront.net`). The id
   was published via SSM (`/borso/shared/previews-distribution-id`);
   the domain name was not.
5. **Why does CloudFront's default cache TTL hide this for ~24 h?**
   When the origin doesn't set explicit `Cache-Control` headers,
   CloudFront's default Min/Default/Max TTL is 1s/24h/365d.
   S3 doesn't set Cache-Control on plain object GETs.

**Root cause:** we thought `BucketDeployment` invalidates the CDN
behind it as part of its job. Actually it only invalidates when given
an explicit distribution reference, which we hadn't plumbed through
SSM for the shared previews CDN.

## Detection failure causes

- **Typing:** `BucketDeployment`'s `distribution` is optional in the
  type, and the optionality reads as "you might not have one" rather
  than "without this, redeploys are silent no-ops for ~24h".
- **Linter:** no rule for "if you depend on freshness, set distribution".
- **Functional validation locally:** locally we never deployed; we
  ran tests against the synthesised template, which doesn't expose
  the runtime invalidation behaviour.
- **CI:** unit tests assert template structure but had no assertion
  on whether `BucketDeployment` was paired with `distribution`.
- **Code review:** the absent prop is invisible — there's nothing in
  the diff to flag.
- **Staging monitoring:** no separate staging CDN.
- **Production monitoring:** no alarm on "preview content age";
  caching is silent until someone notices.

## Countermeasure

- **Code:** commit `2a4aef4` — added
  `previewsDistributionDomain: '/borso/shared/previews-distribution-domain'`
  to the SSM map in both `static-site.ts` and `shared-stack.ts`.
  Shared stack now publishes
  `previewsDistribution.distributionDomainName` alongside the id.
  `StaticSite.buildPreview` reads both params, calls
  `Distribution.fromDistributionAttributes(...)`, and passes
  `distribution + distributionPaths: ['/<keyPrefix>/*']` to
  `BucketDeployment`. Path scope (`/<app>/pr-<n>/*`) keeps one PR's
  invalidation from busting other PRs' caches.
- **Operator action:** redeploy shared once after pulling so the
  new SSM param is published; preview deploys synth-fail with
  `SSM Parameter Store value not found` until then.

## Eradication

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #2](https://github.com/hugoleborso/borso.fr/pull/2) · commit [`2a4aef4`](https://github.com/hugoleborso/borso.fr/commit/2a4aef4)

**The actual fix:**

```diff
+ // Look up the shared previews distribution so BucketDeployment can
+ // issue a CloudFront invalidation for this PR's prefix on every
+ // redeploy. Without this, CloudFront keeps serving the previously-
+ // cached HTML until TTL (~24h).
+ const previewsDistribution = Distribution.fromDistributionAttributes(
+   this,
+   'SharedPreviewsDistribution',
+   {
+     distributionId: StringParameter.valueForStringParameter(
+       this, SHARED_SSM.previewsDistributionId,
+     ),
+     domainName: StringParameter.valueForStringParameter(
+       this, SHARED_SSM.previewsDistributionDomain,
+     ),
+   },
+ );
  new BucketDeployment(this, 'Deploy', {
    sources: [Source.asset(path.resolve(props.assetsPath))],
    destinationBucket: sharedBucket,
    destinationKeyPrefix: keyPrefix,
    prune: false,
+   distribution: previewsDistribution,
+   // Scope to this PR's prefix so co-tenant previews don't pay for
+   // unrelated cache busting.
+   distributionPaths: [`/${keyPrefix}/*`],
  });
```

`StaticSite` is the only construct issuing `BucketDeployment` against the previews CDN; new apps using it get invalidation for free. The synth-time test in `infra/cdk/test/unit/static-site.test.ts` asserts `DistributionPaths` is set, so a regression that drops the prop fails CI immediately.

**Sibling defects swept:** verified every `BucketDeployment` in `infra/cdk/src/` is paired with a distribution (`grep -rn 'new BucketDeployment' infra/cdk/src/`).

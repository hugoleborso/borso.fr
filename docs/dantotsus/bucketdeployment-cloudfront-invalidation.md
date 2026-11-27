---
date: 2026-05-02
introduced-at: conception
detected-at: production
severity: medium
related-pr: '#2'
fix-commits: [2a4aef4902]
eradication-level: 4
eradication-paths: [infra/cdk/src/constructs/static-site.ts, infra/cdk/test/unit/static-site.test.ts]
time-to-detect: hours per redeploy (bug surfaced every iteration)
tags: [cdk, cloudfront, s3, bucketdeployment, caching]
zone: infra/cdk/src/constructs/static-site.ts
---

# `BucketDeployment` doesn't invalidate CloudFront unless you tell it to

## User impact

The operator pushed a fix to the Mondrian generator and opened the preview.
It kept showing the previous version. A hard refresh sometimes worked,
sometimes not. The bucket held the new bytes (`aws s3 cp ... -` showed them,
measured then).

| | Seen | Expected |
| --- | --- | --- |
| Open a preview after a successful redeploy | The previous HTML, for up to about 24 hours | The HTML just deployed |

Every preview of every app was affected. Production was not.

## Causal chain

- The preview served the previous HTML after a successful deploy.
  - CloudFront's edge kept its cached copy. No invalidation was sent, and the object carried no `Cache-Control`, so CloudFront's default TTL of 24 hours applied.
    - The preview's `BucketDeployment` had no `distribution`, so it never called `CreateInvalidation`.

      ```ts
      new BucketDeployment(this, 'Deploy', {
        sources: [Source.asset(path.resolve(props.assetsPath))],
        destinationBucket: sharedBucket,
        destinationKeyPrefix: previewS3Prefix(props),
        prune: false,
      }); // ❌ no distribution, no distributionPaths
      ```

      - Commit `1aa979e74` (2026-05-01, written by an agent) ported `StaticSite`. Its production path created its own distribution and passed it, two lines above. Its preview path uploaded to the shared previews bucket and had no distribution object to pass.
        - The shared stack published the previews distribution's id to SSM but not its domain name, and `Distribution.fromDistributionAttributes` needs both. The construct had no way to reach the distribution it deployed behind. (Machine)

## Root cause of occurrence

*Thought the preview path was complete as ported, actually it uploaded behind a distribution it had no handle to, because the shared stack published the previews distribution's id and not the domain name `fromDistributionAttributes` needs.*

Machine. The writer knew `BucketDeployment` invalidates only a distribution it
is given. Commit `1aa979e74` passes `distribution` and `distributionPaths: ['/*']` in
the production path, a few lines above. The production path built its
distribution itself, so the reference was in hand. The preview path depended
on the shared stack's contract, which exposed no usable reference, and the
prop is optional, so leaving it out compiled and deployed silently.

## Detection failure causes

- **Typing:** `distribution` is optional. Its absence reads as "you might have no CDN", not as "redeploys go stale".
- **Local:** nothing deploys locally, and a synthesised template does not show runtime caching.
- **CI:** the unit tests asserted template structure, with no assertion that a deployment was paired with a distribution.
- **Review:** an absent prop leaves nothing in the diff to flag.
- **Monitoring:** nothing measures how old a preview's content is.

## Countermeasure

Commit [`2a4aef4`](https://github.com/hugoleborso/borso.fr/commit/2a4aef4)
published `previewsDistributionDomain` to SSM from the shared stack.
`StaticSite.buildPreview` reads the id and the domain, builds the distribution
with `Distribution.fromDistributionAttributes`, and passes it with
`distributionPaths: ['/<keyPrefix>/*']`, so one PR's invalidation does not
evict another's cache. The operator redeployed the shared stack once to
publish the parameter.

## Eradication

**Type:** detection (level 4). The original entry labelled it level 1, but the
prop is still optional. A synth-time test holds it.

**Reference:** commit `2a4aef4`. `infra/cdk/test/unit/static-site.test.ts`
asserts it, in a package gated at 100% coverage:

```ts
it('issues a CloudFront invalidation scoped to this PR prefix on every redeploy', () => {
  const json = JSON.stringify(tpl.toJSON());
  expect(json).toContain('"DistributionPaths":["/test-app/pr-42/*"]');
```

Production has gone further since. Commit `0b560c3df` (2026-09-18) split its
upload in two in `static-site.ts`: fingerprinted assets with a long
`immutable` cache, and entry points with `CacheControl.noCache()` and
`mustRevalidate()`. The browser and the edge then revalidate `index.html` on
every request, so freshness no longer rests on the invalidation alone. The
preview deployment, line 267, still sends no `Cache-Control`.

**Proposed:** `buildPreview` reuses production's two-deployment split, with
the same `cacheControl` values, from one helper both paths call. A preview's
entry point would then be revalidated at every request even when an
invalidation is missed or slow, and the preview path could no longer lack a
freshness setting the production path has.

**Proof it can fail:** the test above fails when `distributionPaths` is
removed from the preview deployment (inferred from the assertion, not rerun
this session).

**Similar instances:** `grep -rn "new BucketDeployment" infra apps --include=*.ts`
finds three, all in `static-site.ts`. The two production ones set
`Cache-Control`, and the one that pairs with a distribution passes it. The
preview one passes a distribution and no `Cache-Control`.

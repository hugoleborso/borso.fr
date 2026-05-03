# BucketDeployment doesn't invalidate CloudFront unless you tell it to

## Symptom

Preview deploys uploaded the new HTML/CSS/JS to S3 successfully, but
the published preview URL kept serving the previous version for hours
after the deploy. Hard-refresh in the browser sometimes worked, but
not consistently — and the bytes on the CloudFront edge stayed stale.

## Root-cause chain

1. **Why** is the URL serving old content after a successful deploy?
   CloudFront's edge cache still holds the previous response keyed
   on the URI. The bucket has the new content, but no one told
   CloudFront to evict.
2. **Why** doesn't CDK invalidate automatically?
   `BucketDeployment` invalidates only when the props
   `distribution` and `distributionPaths` are set. Without them,
   CDK has no `IDistribution` to call `CreateInvalidation` on.
3. **Why** is `prod`'s deploy fine but the preview path was broken?
   The `prod` `BucketDeployment` already passes `distribution +
   distributionPaths: ['/*']` (the construct created the
   distribution itself, so it's right there). The preview path
   uploads to the **shared** previews bucket and didn't have a
   reference to the **shared** distribution.
4. **Why** couldn't preview reference the shared distribution
   directly?
   `Distribution.fromDistributionAttributes(...)` requires both the
   distribution id and its `domainName` (`d…cloudfront.net`). We
   already published the id via SSM
   (`/borso/shared/previews-distribution-id`); the domain was not
   published.
5. **Why** would CloudFront's default cache TTL hide this for ~24 h?
   CloudFront's default cache TTL is 24 h when the origin doesn't
   set explicit `Cache-Control` headers. S3 doesn't set them.

**Root cause:** the cross-stack reference needed to invalidate the
shared previews CDN was missing because we never plumbed the
distribution's domain through SSM.

## Fix

- **Code:** commit `2a4aef4` — added
  `previewsDistributionDomain: '/borso/shared/previews-distribution-domain'`
  to the SSM map. Shared stack now publishes the distribution's
  `distributionDomainName`. `StaticSite.buildPreview` reads both
  params, calls `Distribution.fromDistributionAttributes(...)`,
  and passes `distribution + distributionPaths: ['/<keyPrefix>/*']`
  to `BucketDeployment`. The path scope (`/<app>/pr-<n>/*`) keeps
  one PR's invalidation from busting other PRs' caches.
- **Operator action (one-time):** redeploy shared after pulling the
  change so the new SSM param is published. Otherwise per-app
  preview deploys synth and fail with
  `SSM Parameter Store value not found`.
- **Convention:** every `BucketDeployment` in the repo behind a
  CloudFront distribution must set both `distribution` and
  `distributionPaths`. If it doesn't, redeploys silently no-op for
  ~24 h.

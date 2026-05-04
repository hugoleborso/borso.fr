---
date: 2026-05-04
introduced-at: implementation
detected-at: production
severity: high
related-pr: #6
fix-pr: #7
fix-commits: [<to-be-filled>]
eradication-level: 1
time-to-detect: minutes
tags: [cdk, cloudfront, s3, static-site]
---

# CloudFront's `defaultRootObject` only handles the apex `/`; nested directories need a viewer-request Function

## Symptom

After the prod deploy of `borso-fr-prod` succeeded (bucket created, dist uploaded, alias claimed):

- `https://borso.fr/` → **HTTP/2 200** (the homepage)
- `https://borso.fr/art/mondrian/` → **HTTP/2 404** with `content-type: image/jpeg, content-length: 729401` (the `404.jpeg` body, served by the `errorResponses` mapping)
- `https://borso.fr/art/mondrian` → same 404
- `https://borso.fr/art/mondrian/index.html` → **HTTP/2 200**

The file was in S3, the URL didn't get rewritten, the user landed on a giant 404 image instead of the painting.

## Root-cause chain

1. **Why** did `/art/mondrian/` 404 when `/art/mondrian/index.html` resolved fine?
   CloudFront forwarded the URI to S3 unchanged. S3 has no key called `art/mondrian/` (S3 is a flat key store; trailing slashes are not directories), so it returned `NoSuchKey`. CloudFront's `errorResponses` mapping rewrote the response body to `404.jpeg`.

2. **Why** did the apex `/` work but `/art/mondrian/` not?
   `defaultRootObject: 'index.html'` in the CDK construct. Reading the CDK / CloudFront docs carefully: this setting tells CloudFront to fetch `<origin>/index.html` when the requested URI is *exactly* `/`. It does **not** apply to nested directories — a request for `/art/mondrian/` is forwarded as `art/mondrian/` to S3 with no rewrite.

3. **Why** is this not handled by S3?
   The new CDK setup uses `S3BucketOrigin.withOriginAccessControl(bucket)` — a regular S3 origin with OAC, *not* the legacy S3-website endpoint. The website endpoint *does* have a built-in directory-index feature (configurable IndexDocument), but it requires public bucket access and predates OAC. The OAC bucket origin is the modern, secure default; it just doesn't carry the website-endpoint conveniences with it.

4. **Why** wasn't this caught in conception or implementation?
   The spec's *Use cases* listed the routes the user would visit (`/art/mondrian/`, `/family/mom.html`, etc.) but assumed CloudFront would resolve directory-style URIs the way the *previous* (S3-website-endpoint) setup did. The CDK migration changed the origin shape; the spec didn't list "verify directory URI resolution under the new origin" as a use case. The previews distribution avoids the issue because it has its own viewer-request CloudFront Function (`cf-host-routing-function.code.js`) that already includes a directory-index rewrite branch — the prod distribution had no such function.

5. **Why** wasn't this caught by any validator?
   - `/visual-validation` ran against the dev server (`pnpm dev`), which proxies the `site/` folder directly and resolves directory-style URIs the same way as a website endpoint would. The prod-only failure mode never manifested.
   - The dev server is a Vite-internal mechanism with its own URL handling; it does not exercise CloudFront's behaviour.
   - There is no production-smoke automation. The first time CloudFront's behaviour matters is when the user opens the prod URL.

**Root cause:** *thought* `defaultRootObject: 'index.html'` made CloudFront serve `index.html` for any directory-style URI; *actually* it only handles the apex `/`. Nested directories need a viewer-request CloudFront Function that rewrites `/<dir>/` and `/<dir>` to `/<dir>/index.html`.

## Detection failure causes

- **Typing / linter / CI:** N/A — runtime CloudFront behaviour.
- **`/technical-validation`:** Walks the diff against the spec; the spec listed routes but didn't assert they resolve correctly under the new origin shape. Validator had no way to know.
- **`/visual-validation`:** Ran against the local dev server only. Vite serves `index.html` from a directory-style URI by virtue of its own dev middleware; the test passed locally even though the prod path would have failed.
- **CI:** Preview deploys *also* exercise this path (`borso-fr-pr-N.preview.borso.fr/art/mondrian/`), and the preview *did* work — because the previews CloudFront has the host-routing function which includes the directory-index rewrite as a side effect. Prod has no such function. The asymmetry between prod and preview infra was invisible.
- **Code review:** Reviewer would need to know the OAC-vs-website-endpoint distinction *and* that CDK's `defaultRootObject` is apex-only, *and* that the previews function was carrying the rewrite for prod via copy-paste lineage. Realistic but not robust.
- **Production monitoring:** None for static-site 404s.

## Countermeasure

Wire a CloudFront Function (viewer-request) into the StaticSite default behaviour that rewrites directory-style URIs to `/<dir>/index.html`. Two cases:

- `uri === '' || uri.endsWith('/')` → append `index.html` (handles apex and nested trailing-slash dirs).
- The last path segment after the rightmost `/` contains no `.` → treat as a directory, append `/index.html` (handles `/art/mondrian` without trailing slash).

The function is the same shape as the directory-rewrite branch already living in the previews function, but without the host-routing prefix.

- **Code:** PR #7 commit `<sha>` adds `infra/cdk/src/internal/cf-static-site-index-rewrite.code.js` (the JS source as a string at synth time), `infra/cdk/src/internal/cf-static-site-index-rewrite.ts` (the re-export), and wires it into `static-site.ts`'s `Distribution.defaultBehavior.functionAssociations` as a `FunctionEventType.VIEWER_REQUEST`.
- **Operator action:** rerun the prod deploy after merge.

## Eradication (mandatory — code-level)

**Type:** Structural impossibility (level 1 — every `StaticSite` distribution gets the rewrite by construction)

**Reference:** PR #7 · commit `<kaizen-commit>`

**The actual fix:** the `StaticSite` construct ships a default `viewer-request` CloudFront Function that performs the directory-style rewrite. **Every consumer of the construct** (current: `borso-fr` prod, future: `borsouvertures` after its migration, the previewable-app) inherits the rewrite — there is no way to instantiate `StaticSite` without it. The misconception (*"`defaultRootObject` handles directory URIs"*) becomes structurally impossible to ship because the function is wired by the construct itself, not by each consumer.

```diff
+ const indexRewriteFunction = new CloudFrontFunction(this, 'IndexRewriteFunction', {
+   runtime: FunctionRuntime.JS_2_0,
+   code: FunctionCode.fromInline(STATIC_SITE_INDEX_REWRITE_FUNCTION_CODE),
+   comment: 'Rewrite directory-style URIs to /<dir>/index.html',
+ });
+
  const distribution = new Distribution(this, 'Distribution', {
    defaultBehavior: {
      origin: S3BucketOrigin.withOriginAccessControl(bucket),
      …
+     functionAssociations: [
+       { function: indexRewriteFunction, eventType: FunctionEventType.VIEWER_REQUEST },
+     ],
    },
    defaultRootObject: 'index.html',  // kept as defence-in-depth for the apex
    …
  });
```

The function source is unit-tested at 100% coverage (`infra/cdk/test/unit/cf-static-site-index-rewrite.test.ts`) covering: `/`, `/art/mondrian/`, `/art/mondrian` (no trailing slash), `/family` (single-segment dir), `/style.css`, `/img/photo.jpg`, `/assets/playfair-display-…woff2` (asset with dot in last segment), and the empty-URI edge case.

**Sibling defects swept:** the previews distribution's directory-index path was already covered by the host-routing function; this PR doesn't change that. Future apps consuming `StaticSite` (e.g. `borsouvertures` migration) inherit the fix automatically.

## See also

- [`docs/dantotsus/cloudfront-cname-must-be-released-before-redeploy.md`](./cloudfront-cname-must-be-released-before-redeploy.md) — same migration-cutover PR, same defect family (vendor surprise that surfaces only at prod deploy time).
- [`docs/dantotsus/cdk-failed-deploy-leaves-retained-buckets-orphaned.md`](./cdk-failed-deploy-leaves-retained-buckets-orphaned.md) — sister entry on first-deploy partial success.
- `infra/cdk/src/internal/cf-host-routing-function.code.js` — the previews function whose directory-rewrite branch is what *should* have lived in the prod distribution from day one.

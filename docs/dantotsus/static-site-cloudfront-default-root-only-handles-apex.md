---
date: 2026-05-04
introduced-at: implementation
detected-at: production
severity: high
related-pr: '#6'
fix-commits: [d736fbb22d]
eradication-level: 4
eradication-paths: [infra/cdk/src/constructs/static-site.ts, infra/cdk/src/internal/cf-static-site-index-rewrite.code.js, infra/cdk/test/unit/cf-static-site-index-rewrite.test.ts]
time-to-detect: minutes
tags: [cdk, cloudfront, s3, static-site]
zone: infra/cdk/src/constructs/static-site.ts
---

# CloudFront's `defaultRootObject` only handles the apex `/`; nested directories need a viewer-request Function

## User impact

After the first prod deploy of `borso-fr-prod`, a visitor opening a painting page got a full-screen 404 image. Every directory-style URL below the apex was affected. The apex and URLs ending in a file name were not. Measured with `curl -I` right after the deploy:

| URL | Seen | Expected |
| --- | --- | --- |
| `https://borso.fr/` | HTTP/2 200, the homepage | the same |
| `https://borso.fr/art/mondrian/` | HTTP/2 404, `content-type: image/jpeg`, `content-length: 729401` (the `404.jpeg` body) | HTTP/2 200, the painting page |
| `https://borso.fr/art/mondrian` | the same 404 | HTTP/2 200, the painting page |
| `https://borso.fr/art/mondrian/index.html` | HTTP/2 200 | the same |

## Causal chain

- The visitor saw the 404 image on `/art/mondrian/`.
  - CloudFront's `errorResponses` replaced S3's `NoSuchKey` with `/404.jpeg`.
    - CloudFront forwarded the URI unchanged, and S3 has no key `art/mondrian/`. The origin is `S3BucketOrigin.withOriginAccessControl(bucket)`, a REST origin with no index document.
      - The prod distribution had no viewer-request function. It relied on this line of `infra/cdk/src/constructs/static-site.ts`:

        ```ts
        defaultRootObject: 'index.html',  // ← applies to the apex `/` only
        ```

        - `1aa979e74` ported the construct "verbatim from upstream" `borso-platform`, as the monorepo plan's §5 asked (commit message). The upstream prod branch had the same line and no rewrite (Material).
          - Upstream resolved directories in only one of its two request paths. The preview path's `cf-host-routing-function`, ported in the same commit, appended `index.html` to directory URIs. The prod path did not (Machine).

## Root cause of occurrence

*Thought `defaultRootObject: 'index.html'` makes CloudFront serve `index.html` for any directory-style URI. Actually it applies only when the request is exactly `/`, and a REST S3 origin resolves no index for nested paths.* (Material, with Machine behind it)

The prod `curl` table above is the evidence: `/` answered 200 and `/art/mondrian/` 404 under the same distribution. The CloudFront developer guide's page on the default root object says the same (inferred from memory, not reread this session). The S3 website endpoint did resolve index documents, and the site used it before the CDK migration. Its index resolution did not survive the switch to an OAC origin.

The belief came in with the ported input. The port copied it, and a correct rewrite sat in the sibling preview function of the same commit. Two request paths each carried their own directory resolution, so one could lack it unnoticed.

## Detection failure causes

- **Typing, linter, CI:** `defaultRootObject` is a valid prop. Synth cannot know the bucket's key layout.
- **`/visual-validation`:** it ran against `pnpm dev`. Vite's dev middleware serves `index.html` for a directory URI, so the prod failure could not show.
- **Preview deploy:** `borso-fr-pr-N.preview.borso.fr/art/mondrian/` worked, because the preview distribution rewrote directories in its host-routing function. A green preview proved nothing about prod, which ran a different request path.
- **`/technical-validation`:** the spec listed the routes but not their resolution under the new origin, so the validator had nothing to check them against.
- **Monitoring:** no alarm watched 404 rates on static sites. The operator found it by opening the URL.

## Countermeasure

`d736fbb22d` adds a viewer-request CloudFront Function to the `StaticSite` default behaviour. It appends `index.html` when the URI is empty or ends in `/`, and `/index.html` when the last segment has no dot. `defaultRootObject` stays for the apex. Verified by the unit test below and by the prod URLs answering 200 after the redeploy.

## Eradication

**Type:** detection (level 4)

**Reference:** commit [`d736fbb`](https://github.com/hugoleborso/borso.fr/commit/d736fbb22d6893c49269d9440d89f08b5b3a06c4).

```diff
+    const indexRewriteFunction = new CloudFrontFunction(this, 'IndexRewriteFunction', {
+      runtime: FunctionRuntime.JS_2_0,
+      code: FunctionCode.fromInline(STATIC_SITE_INDEX_REWRITE_FUNCTION_CODE),
+    });
     const distribution = new Distribution(this, 'Distribution', {
       defaultBehavior: {
         origin: S3BucketOrigin.withOriginAccessControl(bucket),
+        functionAssociations: [
+          { function: indexRewriteFunction, eventType: FunctionEventType.VIEWER_REQUEST },
+        ],
       },
```

The wiring still exists (read today, `static-site.ts:101-121`). The construct adds the function unconditionally, so every prod `StaticSite` gets it today. No test pins that wiring, so deleting the `functionAssociations` block passes every gate. What holds is detection on the handler alone. `infra/cdk/test/unit/cf-static-site-index-rewrite.test.ts` covers `/`, `/art/mondrian/`, `/art/mondrian`, `/family`, `/style.css`, a dotted asset name and the empty URI.

The class that remains open is drift between the two request paths. Directory resolution exists twice today, in `cf-static-site-index-rewrite.code.js:5-15` and in `cf-host-routing-function.code.js:65-69` (measured). A change to one does not reach the other, and a passing preview still does not vouch for prod.

**Proposed:** keep one source of directory resolution. `cf-host-routing-function.ts` already reads its code with `readFileSync`. It can prepend the shared helper from `cf-static-site-index-rewrite.code.js` at synth time and call it on the prefixed URI. The edge runtime has no modules, but a concatenated string needs none (inferred from how both `.ts` wrappers load their code). Preview and prod would then resolve directories with the same lines, so a preview that passes vouches for prod.

**Proposed:** pin the wiring in `infra/cdk/test/unit/static-site.test.ts` with a `hasResourceProperties('AWS::CloudFront::Distribution', ...)` assertion on `DistributionConfig.DefaultCacheBehavior.FunctionAssociations` containing `Match.objectLike({ EventType: 'viewer-request' })`, and on the function's code equal to `STATIC_SITE_INDEX_REWRITE_FUNCTION_CODE`. Removing the association then fails the infra suite at commit, and the construct's shape becomes a guarantee rather than a fact of today's code.

**Proof it can fail:** the handler's test fails when the rewrite is broken. Nothing fails when the `functionAssociations` block is removed from the construct. On `origin/main`, `static-site.test.ts` asserts viewer-request associations only on the `/api/*` behaviours (lines 161 and 191), and no snapshot holds `IndexRewriteFunction` (measured, `git show origin/main:infra/cdk/test/unit/static-site.test.ts | grep -n "DefaultCacheBehavior\|FunctionAssociations"`). That gap is why the level is 4, not 1.

**Similar instances:** `grep -rn "hasNoExtensionOnLastSegment" infra/cdk/src` finds the two copies above and nothing else. `grep -rn "new StaticSite" infra/cdk/src` finds the one consumer, `previewable-app.ts`, which every app's prod stack goes through.

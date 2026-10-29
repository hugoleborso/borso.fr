---
date: 2026-10-29
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#206'
fix-pr: none (the kaizen pull request for PR #206 that adds this file)
fix-commits: [self]
eradication-level: 4
eradication-paths: [scripts/pr/pr-body.core.ts, scripts/pr/pr-body.core.test.ts]
time-to-detect: hours
tags: [preview, cloudfront, pragma, pr-body, agents]
zone: apps/pragma/site/src/lib/assistant-install.utils.ts
recurs: [api-anchor-must-use-api-url-on-preview]
---

# The preview address that named the site host

## Symptom

PR #206 wrote the address of pragma's MCP endpoint on a preview twice, and
both times on the wrong host.

1. The Account page built its install commands from the page origin. On a
   preview that is `https://pragma-pr-206.preview.borso.fr`, the previews CDN,
   which answers `/mcp` with the site's `index.html`. The technical validation
   caught it (`TV-PREVIEW-INSTALL-URL`, report
   `technical-validation-2026-10-27-1234.md`) and commit `d992239a` moved the
   address onto `VITE_API_BASE`.
2. Two hours later the open-pr stage wrote the same mistake into the pull
   request body: the *Before merge* smoke test told the operator to run
   `claude mcp add … https://pragma-pr-206.preview.borso.fr/mcp`. The body
   passed `check-pr-body.ts`, and the operator found it. The body on `main`'s
   merge carries the right host, `pragma-pr-206-api.preview.borso.fr`.

## Root-cause chain

1. **Why does the site host not answer `/mcp`?** A preview serves the site
   and the API on two hosts. The previews CloudFront distribution routes
   `<app>-pr-<n>` to the site bucket and `<app>-pr-<n>-api` to the API; only
   production puts both behind one domain with path behaviours
   (`apiPublicOrigin()` in `infra/cdk/src/internal/naming.utils.ts` encodes
   exactly this).
2. **Why did the same mistake happen twice in one pull request?** The
   production shape, one origin for everything, is the one every spec
   sentence and every example uses: `https://pragma.borso.fr/mcp`. A preview
   address is derived by replacing the host, and the natural replacement is
   the host the reader is looking at, the site's.
3. **Why did the first fix not prevent the second?** `d992239a` fixed the
   site code and added a unit test for it. The pull request body is prose,
   written by another agent from the spec, and nothing reads a body for
   addresses.
4. **Why did the repository's earlier eradication not reach it?** PR #27 hit
   the same split with a CSV link and shipped `borso/no-api-anchor-in-site`,
   which refuses a literal `/api/` in a JSX attribute. `/mcp` is not under
   `/api/`, the page built the address from `location.origin` rather than a
   literal, and the body is not JSX.

**Root cause:** thought a preview's API answers on the preview's address,
actually a preview splits the site and the API onto two hosts and only
production shares one, so an API path on the site host reaches `index.html`.

## Detection failure causes

- **Linter:** `no-api-anchor-in-site` matches a literal `/api/` only.
- **PR body checker:** `check-pr-body.ts` checked sizes and placeholders, not
  addresses.
- **Code review:** the technical validator caught the first one; nothing
  reviews the body after `/open-pr` writes it.
- **Operator:** caught the second, at the cost of a failed smoke test.

## Countermeasure

`d992239a` (site), and the body was rewritten with the `-api` host before the
merge.

## Eradication (mandatory — code-level)

**Type:** detection (level 4)

**Reference:** the commit that adds this file.

**The actual fix:** the body checker refuses an API path on a preview's site
host, which is the shape of the second defect, and says where the API is:

```diff
+const PREVIEW_SITE_HOST_API_ADDRESS =
+  /https:\/\/[a-z0-9-]+-pr-\d+\.preview\.borso\.fr\/(?:mcp\b|api\/|oauth\/|\.well-known\/)[^\s)`'"]*/g;
…
+  for (const address of readSiteHostApiAddresses(source)) {
+    violations.push({
+      where: 'Body',
+      problem: `${address} names the preview's site host, which answers an API path with the app's index.html; the API is on the -api host`,
+    });
+  }
```

`/mcp`, `/api/`, `/oauth/` and `/.well-known/` are the paths pragma sends to
the API. The `-api` host and the screenshots host pass, and so does a page of
the site. `check-pr-body.ts --pr <n>` now reads a posted body through
`gh api`, so the check also runs on a body after GitHub kept it.

The site half is held by the unit test `d992239a` added to
`assistant-install.utils.test.ts`; a lint rule for `location.origin` joined to
an API path was considered and not written, because the page origin is
correct in production and the test already pins the preview case.

**Sibling defects swept:** `grep -rn 'location.origin' apps/*/site/src` finds
pragma's vote page link (`VotingRoundPanel.tsx`) and banana-rush's invitation
link (`ShareInviteButton.tsx`), both pages of the site and so correct on the
site host; banana-rush's service worker, which compares origins and builds no
address; and pragma's `readPageOrigin()`, which `AssistantConnections.tsx` now
passes beside the API base so the install address falls back to it only when
no API base is set.

## See also

- [api-anchor-must-use-api-url-on-preview](./api-anchor-must-use-api-url-on-preview.md), the first time, on PR #27.
- [`docs/knowledge/preview-api-cross-origin.md`](../knowledge/preview-api-cross-origin.md).

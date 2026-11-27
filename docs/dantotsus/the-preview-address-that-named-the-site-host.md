---
date: 2026-10-29
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#206'
fix-commits: [self]
eradication-level: 4
eradication-paths: [scripts/pr/pr-body.core.ts, scripts/pr/pr-body.core.test.ts]
time-to-detect: hours
tags: [preview, cloudfront, pragma, pr-body, agents]
zone: apps/pragma/site/src/lib/assistant-install.utils.ts
recurs: [api-anchor-must-use-api-url-on-preview]
---

# The preview address that named the site host

## User impact

PR #206 wrote the address of pragma's MCP endpoint on a preview twice, and
both times on the wrong host.

| | Seen | Expected |
| --- | --- | --- |
| The Account page's install command, on the preview | `https://pragma-pr-206.preview.borso.fr/mcp`, which answers with the site's `index.html` | `https://pragma-pr-206-api.preview.borso.fr/mcp` |
| The *Before merge* smoke test in the PR body | `claude mcp add … https://pragma-pr-206.preview.borso.fr/mcp`, a command that fails | The same command on the `-api` host |

The technical validation caught the first (`TV-PREVIEW-INSTALL-URL`, report
`technical-validation-2026-10-27-1234.md`). The operator caught the second,
at the cost of a failed smoke test. Production was not affected, because it
serves the site and the API on one origin.

## Causal chain

- The install address on the preview reached the site's `index.html`
  - The Account page built the address from the page origin ← the faulty
    line, in `assistant-install.utils.ts`, a branch commit of PR #206
    squashed into `508e63555`
    - A preview serves the site on `<app>-pr-<n>` and the API on
      `<app>-pr-<n>-api`. Only production puts both behind one domain
      (`apiPublicOrigin()` in `infra/cdk/src/internal/naming.utils.ts:169`)
    - The spec gives every address in the production shape,
      `https://pragma.borso.fr/mcp`, where the page origin is the API origin.
      Material
- Two hours after `d992239a` moved that address onto `VITE_API_BASE`, the
  PR body's smoke test named the site host again
  - The open-pr stage derived the preview address from the spec's
    production address by swapping the host for the one it was looking at,
    the site's
    - The spec and its examples hold only the single-origin production
      address. Material

## Root cause of occurrence

*Thought a preview's API answers on the preview's address, actually a preview
splits the site and the API onto two hosts and only production shares one,
so an API path on the site host reaches `index.html`.* **Material.**

Both writers were agents working from the same spec. Every sentence and
example in it uses the production address, `https://pragma.borso.fr/mcp`,
where site and API share an origin. Nothing in what they read said a
preview splits them. That fact lived in
[`docs/knowledge/preview-api-cross-origin.md`](../knowledge/preview-api-cross-origin.md)
and in `apiPublicOrigin()`, neither of which a spec about MCP leads to.

## Detection failure causes

- **Linter:** PR #27 hit the same split with a CSV link and shipped
  `borso/no-api-anchor-in-site`, which refuses a literal `/api/` in a JSX
  attribute. `/mcp` is not under `/api/`, the page built the address from
  `location.origin` rather than a literal, and a PR body is not JSX.
- **Unit test:** `d992239a` fixed the site code and pinned it with a test.
  A PR body is prose, written by another agent, and no test reads it.
- **PR body checker:** `check-pr-body.ts` checked sizes and placeholders, not
  addresses.
- **Code review:** the technical validator caught the first. Nothing
  reviewed the body after `/open-pr` wrote it.

## Countermeasure

`d992239a` (site), and the body was rewritten with the `-api` host before the
merge.

## Eradication

**Type:** detection (level 4)

**Reference:** the commit that adds this file.

The body checker refuses an API path on a preview's site host, and says
where the API is. `scripts/hooks/checks/gh-pr-create.core.ts` runs it on
`gh pr create`, `.husky/pre-commit:245` and `ci.yml:168` run it on the
template.

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

`check-pr-body.ts --pr <n>` also reads a posted body through `gh api`. The
site half is held by the unit test `d992239a` added to
`assistant-install.utils.test.ts`.

**Proof it can fail:** `pr-body.core.test.ts:241` feeds
`claude mcp add pragma https://pragma-pr-206.preview.borso.fr/mcp` and
expects the address back. The `-api` host returns nothing (`:258`).

**Gap in what holds:** the regex hard-codes four API paths, `mcp`, `api/`,
`oauth/` and `.well-known/`. That is a hand-kept copy of the routes mounted
in `apps/pragma/api/src/app.ts:109-113`, and it drifts the next time a route
is added. It also covers pragma's paths only.

**Proposed:** make the site-host address impossible to type instead of
detecting it. The body names a preview API address only through a
placeholder, such as `{api}/mcp`, that `check-pr-body.ts` expands with
`apiPublicOrigin()` (exported from `infra/cdk/src/index.ts:36`) and refuses
when written out by hand. The route list then has no copy to drift, and
every app's split is covered. Routing API paths on the shared previews
distribution, which would remove the split itself, is ruled out in
`docs/knowledge/preview-api-cross-origin.md`.

**Similar instances:** `grep -rn 'location.origin' apps/*/site/src` finds
pragma's vote page link (`VotingRoundPanel.tsx`) and banana-rush's
invitation link (`ShareInviteButton.tsx`), both pages of the site and so
correct on the site host. It also finds banana-rush's service worker, which
compares origins and builds no address, and pragma's `readPageOrigin()`,
which the install address falls back to only when no API base is set. See
[api-anchor-must-use-api-url-on-preview](./api-anchor-must-use-api-url-on-preview.md),
the first time, on PR #27.

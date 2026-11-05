---
date: 2026-11-05
introduced-at: implementation
detected-at: qa
severity: high
related-pr: '#261'
fix-pr: none (the kaizen pull request is opened after this entry is committed)
fix-commits: [06abedfd9, self]
eradication-level: 1
eradication-paths: [apps/pragma/domain/request-headers.core.ts, apps/pragma/cdk/lib/stack.ts, infra/cdk/src/constructs/lambda-api.ts, infra/cdk/src/constructs/previewable-app.ts, apps/pragma/cdk/test/stack.test.ts]
time-to-detect: hours
tags: [pragma, cdk, preview, validation, visual-validation]
zone: infra/cdk/src/constructs/lambda-api.ts
recurs: none (no earlier entry; commit 1629f66 fixed the same class for x-ballot-token in August without writing one)
---

# The header curl never asked permission for

## User impact

On the PR #261 preview, nobody could sign in and no write reached the API.
The visual validator measured it on 2026-11-04 (report
`docs/features/pragma/live-invalidation/validation/visual-validation-2026-11-04-0338.md`,
rows 01 and 09).

| | Seen | Expected |
| --- | --- | --- |
| Sign in on the preview | "Unexpected error." under the login form | The band's pages |
| A reorder on the preview | The new order rolls back with no message, and other members see nothing | The order saved and pushed to the other tabs |
| Prod | Unaffected. Prod builds set no `VITE_API_BASE`, so the site calls `/api` on its own origin and sends no preflight (`.github/workflows/preview.yml:153` is the only place it is set) | Unaffected |

The validator's note said a merge would break prod too. That was an inference
it did not probe, and it is wrong for the reason in the last row.

## Causal chain

- The browser blocked every write and the login on the preview.
  - Each request carried `X-Pragma-Client`, which is not a CORS-safelisted
    header, so the browser sent an `OPTIONS` preflight first.
    - API Gateway answered the preflight `204` with no `access-control-allow-*`
      headers, because its allow list did not name `x-pragma-client`.
      - The allow list was a constant in the shared construct,
        `CORS_ALLOWED_REQUEST_HEADERS` in `infra/cdk/src/constructs/lambda-api.ts`,
        copied by hand from the headers pragma's site sends. Commit `1b6ba33`
        added the header to the site (`apps/pragma/site/src/lib/api.client.ts`)
        and not to that copy.

## Root cause of occurrence

*Thought the API accepts any header the code sends, actually the deployed
preflight accepts only the names a second, hand-kept list holds.*

The header had one owner in the code, `REALTIME_CLIENT_HEADER` in
`apps/pragma/domain/stale-scope.core.ts`, and a second spelling in `infra/`
that nothing derived from it. Commit `1629f66` (August, PR for audience
voting) hit the same gap with `x-ballot-token` and fixed it by adding the name
to the copy, which left the copy in place for the next header.

## Detection failure causes

- **Unit and back-e2e tests:** Hono's `app.request` builds requests in Node.
  Node sends no preflight, so every server test passed.
- **`curl` probes on the preview:** `curl` sends no preflight either. The main
  session's probes passed while every browser write failed.
- **`pnpm dev`:** the Vite proxy (`apps/pragma/vite.config.ts:63`) keeps the
  API on the site's origin, so the local browser sends no preflight. The
  validator's report says local CORS echoes any header, which is true of the
  bare `cors()` but never exercised.
- **Technical validation:** it read the diff of `apps/pragma`. The allow list
  lives in `infra/cdk`, which the diff did not touch.
- **Visual validation (caught it):** the preview is the only stage where the
  site and the API are on two origins (see
  [`../knowledge/preview-api-cross-origin.md`](../knowledge/preview-api-cross-origin.md)),
  and a real browser is the only client that preflights.

## Countermeasure

Commit `c41412c` in PR #261 (squashed into `06abedfd9` on main) added `x-pragma-client` to the shared list and a
pragma stack test asserting the synthesized preflight names
`REALTIME_CLIENT_HEADER`. The validator's second run passed rows 01 and 09
(`visual-validation-2026-11-04-0400.md`).

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** this kaizen pull request, the commit adding this file.

pragma's custom request headers now live in one record,
`PRAGMA_REQUEST_HEADERS` in `apps/pragma/domain/request-headers.core.ts`.
`BALLOT_TOKEN_HEADER` and `REALTIME_CLIENT_HEADER` are read from it, and the
pragma stack hands the same record to the API preflight through a new
`requestHeaders` prop. The shared list drops the two pragma names, so `infra/`
holds no copy to forget.

```diff
 // infra/cdk/src/constructs/lambda-api.ts
 const CORS_ALLOWED_REQUEST_HEADERS = [
   'content-type',
   'authorization',
-  'x-ballot-token',
-  'x-pragma-client',
   'sentry-trace',
   'baggage',
 ];
-            allowHeaders: [...CORS_ALLOWED_REQUEST_HEADERS],
+            allowHeaders: [...CORS_ALLOWED_REQUEST_HEADERS, ...(props.appRequestHeaders ?? [])],

 // apps/pragma/domain/request-headers.core.ts
+export const PRAGMA_REQUEST_HEADERS = {
+  ballotToken: 'x-ballot-token',
+  realtimeClient: 'x-pragma-client',
+} as const;

 // apps/pragma/domain/stale-scope.core.ts
-export const REALTIME_CLIENT_HEADER = 'X-Pragma-Client';
+export const REALTIME_CLIENT_HEADER = PRAGMA_REQUEST_HEADERS.realtimeClient;

 // apps/pragma/cdk/lib/stack.ts
       extraPathPatterns: ASSISTANT_PATH_PATTERNS,
+      requestHeaders: PRAGMA_REQUEST_HEADER_NAMES,
```

A header declared in the record reaches the preflight with no second edit.
What stays possible is a header written as a bare string outside the record.
No such string exists in `apps/pragma/site/src` today (the two `headers.set`
and `headers:` sites both read the domain constants).

**Proof it can fail:** with the `requestHeaders:` line removed from
`apps/pragma/cdk/lib/stack.ts`, the stack test refuses:

```text
FAIL |core| cdk/test/stack.test.ts > pragma app stack > lets every request header the site sends through the API preflight a preview site sends
AssertionError: expected [ 'content-type', …(3) ] to strictly equal ArrayContaining{…}
- ArrayContaining [
-   "x-ballot-token",
```

**Similar instances:** `grep -rn "cors(" apps/*/api/src` finds `banana-rush`,
`last-loop-lepin` and `pragma`. Only pragma's site sends a custom header
(`grep -rn "headers.set\|headers: {" apps/*/site/src`), so the other two need
no record yet. A new app that adds one passes its own list through
`requestHeaders`, the only way left to widen the preflight.

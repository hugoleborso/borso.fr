---
date: 2026-11-12
introduced-at: conception
detected-at: local
severity: low
related-pr: '#298'
fix-commits: [self]
eradication-level: 1
eradication-paths: [infra/cdk/src/internal/cf-host-routing-function.code.js, infra/cdk/test/unit/cf-host-routing-function.test.ts, scripts/hooks/shell-command.core.ts]
time-to-detect: minutes
tags: [preview, cloudfront, pragma, agents, knowledge]
zone: infra/cdk/src/internal/cf-host-routing-function.code.js
recurs: [the-preview-address-that-named-the-site-host, api-anchor-must-use-api-url-on-preview]
---

# The site host that said 200 to an API call

## User impact

A session measuring PR #298 asked the preview's site host for an API path and
was answered as if the API were there. Measured again on 2026-11-12, with
`curl -s -o /dev/null -w '%{http_code} %{content_type}'`:

| Request | Seen | Expected |
| --- | --- | --- |
| `https://last-loop-lepin-pr-302.preview.borso.fr/api/me`, a live preview | `200 text/html`, the app's page | An answer that says no API is here |
| `https://pragma-pr-298.preview.borso.fr/api/me`, a merged pull request | `200 text/html`, the app's page | The same |
| `https://last-loop-lepin-pr-302-api.preview.borso.fr/api/health`, the API host | `200` from the API | `200` from the API |

It is the fourth entry on a preview's two hosts. The earlier ones each closed
one surface: a fetch in site code, an anchor in site code, an address in a
pull request body. This one was a `curl`.

## Causal chain

- A `curl` of `/api/*` on the site host printed 200 and a page of HTML.
  - The shared previews distribution sent the request to S3, which returned
    the app's `index.html`.
    - Its viewer-request function rewrote the path to `index.html`. On a
      single-page app it rewrites every path whose last segment has no
      extension, and `/api/me` has none. ← the faulty line

      ```js
      if (isSinglePageApp(app)) {
        // /api/me has no extension, so it is served as a page of the app
        if (uri === '' || uri === '/' || hasNoExtensionOnLastSegment(uri)) {
          request.uri = keyPrefix + '/index.html';
      ```

      - An agent wrote the rule in `76a231dee` (2026-05-22, "spa fallback in
        the preview host-routing cloudfront function"), to send deep links
        such as `/login` to the React router. Its message sorts paths into
        two kinds only: "any non-asset URI" goes to `index.html`, "anything
        with a "." in the last segment" passes through.
        - The site host had no `/api` path to serve because nine days earlier,
          `a1ab4047f` had moved each preview's API to its own host,
          `<app>-pr-<n>-api.preview.borso.fr`.
          - **Machine:** the previews run on two hosts per app.
            [`preview-api-cross-origin.md`](../knowledge/preview-api-cross-origin.md)
            justifies the split: the shared distribution "is host-routed to S3
            only — there is no per-app behavior surface where we could splice
            an HTTP API origin in cleanly". This is the fourth entry on a
            preview's two hosts (`recurs:`).

## Root cause of occurrence

*Thought every path without an extension on a single-page app's host is a page
of that app, actually `/api/` is never a page: the site sends every API call to
another host, so a request for it on the site host is always a mistake.*
**Material** (inferred): the knowledge entry that says where the API lives
triggered on `apps/*/site/src/api/client.ts` and `preview.yml`, not on the
function the agent was editing, so it was not in its context.

[`preview-api-cross-origin.md`](../knowledge/preview-api-cross-origin.md) says
where the API is: "each PR's frontend reaches its API via a dedicated
hostname". No route of any site starts with `/api`:
`grep -rnE "path(=|: )[\"'\`]/?api\b" apps/*/site/src` prints nothing.

## Detection failure causes

- **Knowledge trigger:** `preview-api-cross-origin.md` printed on a Write to
  `apps/*/site/src/api/client.ts` or to `preview.yml`, never on a command.
- **The entry itself:** its symptom line said the site host answers an API path
  with 404 and a JPEG. It answers 200 and HTML (table above), so a reader who
  found the entry would not have recognised the symptom.
- **Knowledge trigger, on a command:** the session that met the symptom was
  writing no file, so the entry's two path triggers could not print it.
- **The hook's quote stripper:** a command trigger is matched after quoted
  strings are removed, so `curl "https://…/api/me"` matched no host pattern
  (measured: 0 entries printed, against 1 for the unquoted form).
- **The pull request body checker:** it refuses this address in a body. A
  command is not a body.

## Countermeasure

The entry gains a command trigger on `<app>-pr-<n>.preview.borso.fr/api/` and
its symptom line says what the host answers today. The quote stripper keeps a
quoted body that is one address and nothing else.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit that adds this file. The function lives in the
`borso-shared` stack and reached the previews distribution with a
`shared-deploy`. Measured this session: `curl` of
`https://pragma-pr-298.preview.borso.fr/api/me` answers `404`, and `/apiary`
still answers `200 text/html`.

```diff
 var SINGLE_PAGE_APPS = ['banana-rush', 'last-loop-lepin', 'pragma'];
+var API_PATH_PREFIX = '/api/';
 …
   if (isSinglePageApp(app)) {
+    if (uri.indexOf(API_PATH_PREFIX) === 0) {
+      return NOT_FOUND;
+    }
```

A site host can no longer answer an API path with the app's page, whoever
asks: a `curl`, a browser, or a site built without its API address. The quote
stripper moved with the hooks to TypeScript in `458e886c4`. It lives in
`stripStringBodies` of `scripts/hooks/shell-command.core.ts`, and
`shell-command.core.test.ts` holds the case "keeps a quoted body that is one
address and nothing else".

The 404 answers the wrong host. It does not remove the second host, which is
the condition behind all four entries.

**Proposed:** test the premise the knowledge entry rests on. CloudFront
Functions can, as far as the writer knows, change a request's origin from a
viewer-request function (inferred from CloudFront's documentation, not tried
here). If that holds, `cf-host-routing-function.code.js` can send `/api/*` on
`<app>-pr-<n>.preview.borso.fr` to that PR's API origin instead of answering
404. Previews would become same-origin, as the original plan in
`preview-api-cross-origin.md` intended, and the `-api` host, the CORS
allow-list in `LambdaApi` and the wrong-host class would go with it. Trying it
needs a `shared-deploy`, which is the operator's dispatch.

**Proof it can fail:** with the three added lines removed,
`cf-host-routing-function.test.ts` fails on the new case:

```
× answers 404 to an API path on the site host of a single-page app, whose API is on the -api host
AssertionError: expected { …(2) } to match object { statusCode: 404 }
Tests  1 failed | 16 passed (17)
```

A second case holds the edge: `/apiary` still goes to the React router. For
the trigger, the hook was fed four commands: the unquoted address and the
quoted one each print the entry, the `-api` host and a commit message that
mentions the address print nothing.

**Similar instances:** pragma also sends `/mcp`, `/oauth/token` and
`/.well-known/*` to its API host. They are left out on purpose: the site
serves a consent page under `/oauth/`, so those prefixes are not always a
mistake. `grep -ln 'preview\\.borso\\.fr' docs/knowledge/*.md` finds two
other entries triggered by a preview host, and both now print for a quoted
address too (measured with a quoted and an unquoted `curl` of a preview page).

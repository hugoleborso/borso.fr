---
date: 2026-05-25
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: '#27'
fix-commits: [e36b217eda]
eradication-level: 5
eradication-paths: [docs/knowledge/preview-api-cross-origin.md, eslint-rules/no-api-anchor-in-site.js, apps/last-loop-lepin/site/src/lib/api.ts]
time-to-detect: 30m
tags: [frontend, vite, cloudfront, preview, cross-origin, biome, grit, plugins, last-loop-lepin]
zone: apps/last-loop-lepin/site/src/routes/ArchivesPage.tsx
recurs: [frontend-fetch-must-go-through-api-client]
---

# A download button opened the SPA's 404 page while the API said 200

## User impact

The operator tapped the new "Stats par boucle (CSV)" button on the preview of
last-loop-lepin (PR #27, mobile screenshot in the PR thread).

| | Seen | Expected |
| --- | --- | --- |
| Tap "Stats par boucle (CSV)" on the preview | The SPA's catch-all page, "404 Not Found · Page introuvable · Retour à la course" | The CSV downloads |

The endpoint was healthy. `curl` of the same path on the API host returned 200
with the CSV body (measured on 2026-05-25).

```bash
$ curl -s -o /tmp/c.txt -w "HTTP %{http_code}\n" \
    https://last-loop-lepin-pr-27-api.preview.borso.fr/api/standings/3l-lepin-2026/laps.csv
HTTP 200
```

The older "Classement (CSV)" buttons on the archives and spectator pages had
the same defect on every preview. Production was not affected.

## Causal chain

- The button opened the SPA's 404 page.
  - The browser resolved the relative `href` against the page's origin, `last-loop-lepin-pr-27.preview.borso.fr`, whose distribution serves only the static site.

    ```tsx
    href={`/api/standings/${encodeURIComponent(edition.slug)}/laps.csv`} // ❌ relative to the site's origin
    ```

    - Commit `500c348fd` (2026-05-20, written by an agent) added the button by copying the "Classement (CSV)" anchor next to it, which had the same relative `href`.
      - Commit `8de7ffcda` (2026-05-12, an agent) wrote that first anchor when previews were meant to route `/api/*` on the site's own origin, as production does.
        - Commit `a1ab4047f` (2026-05-13) moved each preview's API to its own host, `<app>-pr-<N>-api.preview.borso.fr`, because the shared previews distribution cannot route `/api/*` per app. The anchors written for the old topology stayed in the code as the example to copy. (Machine)

## Root cause of occurrence

*Thought a relative `/api/` link reaches the API, as the CSV button beside it did, actually since `a1ab4047f` a preview serves its API from another origin, and only production and the Vite dev proxy are same-origin.*

Machine. The example the agent copied was correct when it was written and
became wrong a day later. The same line works in two environments out of
three, so nothing in the code or on a dev server shows it is wrong.

[`docs/knowledge/preview-api-cross-origin.md`](../knowledge/preview-api-cross-origin.md):
"The wildcard previews distribution is shared across every app and is
host-routed to S3 only … So previews are cross-origin: each PR's frontend
reaches its API via a dedicated hostname." Its triggers name
`apps/*/site/src/api/client.ts` and the preview workflow, not a route file.

## Detection failure causes

- **Typing:** `href` is a `string`, and the string is well-formed.
- **Linter:** the Grit plugin `no-direct-api-fetch-in-site.grit` matched JS string literals inside `fetch()`. A JSX attribute is another AST node, and `apiClient` wraps only `fetch`.
- **Local:** `pnpm dev` proxies `/api/*` on the same origin, so the link works there.
- **CI:** no site test follows a download link.
- **Review:** the new anchor looked like the existing one, which carried the same latent defect.
- **QA:** production routes `/api/*` on the site's origin, so routine checks there never see it.

## Countermeasure

`apiUrl(pathname)` prefixes the preview's API base. The three anchors call it:
the two archive buttons and the spectator page's download. Commit
[`e36b217`](https://github.com/hugoleborso/borso.fr/commit/e36b217eda) shipped
it. The helper lives today in `apps/last-loop-lepin/site/src/lib/api.ts`.

## Eradication

**Type:** knowledge (level 5). A lint rule exists, but it does not refuse this
defect's own shape. Against that shape, only a triggered knowledge entry and
the `apiUrl` helper hold.

**Reference:** commit
[`e36b217`](https://github.com/hugoleborso/borso.fr/commit/e36b217eda) shipped
a Grit plugin, `biome-plugins/no-api-anchor-in-site.grit`. Commit `314f24821`
(2026-08-08) replaced Biome with ESLint and deleted it. Its successor lives today
in `eslint-rules/no-api-anchor-in-site.js`, enabled as
`borso/no-api-anchor-in-site` in `.oxlintrc.json`. It refuses a JSX attribute
whose string literal starts with `/api/`.

**Proof it can fail:** planting `<a href="/api/a.csv">` and
``<a href={`/api/b.csv`}>`` in a scratch route of
last-loop-lepin and running `oxlint` on it on 2026-11-27 (measured):

```
ZzProbe.tsx:2:24: error borso(no-api-anchor-in-site): A bare `/api/...` string in a JSX attribute …
```

Only the string literal is refused. The template literal passes, and the
faulty line of this defect was a template literal. The rule holds at level 2
for string literals only. Against this defect's shape, what holds is
[`preview-api-cross-origin.md`](../knowledge/preview-api-cross-origin.md),
printed when `apps/*/site/src/api/client.ts` is touched, and `apiUrl` as the
helper to call.

**Proposed:** make previews same-origin, so `/api/*` resolves on the site's own
host everywhere. That needs a per-PR distribution, or a request-time origin
choice on the shared one, to verify against CloudFront's limits first. It
removes the cause rather than detecting it. `API_BASE`, `apiUrl`, CORS with
credentials and both lint rules could then be deleted. Until then,
`no-api-anchor-in-site.js` should also refuse a `TemplateLiteral` whose first
quasi starts with `/api/`.

**Similar instances:** ``grep -rn 'href={`/api' apps/*/site/src`` finds none
today. `recurs:` names the fetch surface of the same topology difference.

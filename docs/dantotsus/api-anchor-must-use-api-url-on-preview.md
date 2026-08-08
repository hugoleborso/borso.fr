---
date: 2026-05-25
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: 27
fix-pr: ./lessons-from-pr-27
fix-commits: [e36b217]
eradication-level: 2
time-to-detect: 30m
tags: [frontend, vite, cloudfront, preview, cross-origin, biome, grit, plugins, last-loop-lepin]
---

# A download button opened the SPA's 404 page while the API said 200

## Symptom

User clicks the new **"Stats par boucle (CSV)"** button on the
preview of last-loop-lepin (PR #27, `*.preview.borso.fr`). The
browser navigates to a page titled "404 Not Found · Page
introuvable · Retour à la course" — the SPA's catch-all 404.
Mobile screenshot included in the PR thread.

Direct `curl` of the same path against the API host returned 200
with the CSV body. The endpoint was healthy ; the anchor was
wrong.

```bash
$ curl -s -o /tmp/c.txt -w "HTTP %{http_code}\n" \
    https://last-loop-lepin-pr-27-api.preview.borso.fr/api/standings/3l-lepin-2026/laps.csv
HTTP 200
$ head -1 /tmp/c.txt
bib,runner_slug,display_name,B1,B2,…,B15
```

The pre-existing **"Classement (CSV)"** button — shipped months
earlier — had the same bug ; it was just never exercised on
preview.

## Root-cause chain

1. **Why?** The browser opened the SPA, not the API. *Because the
   anchor `<a href="/api/standings/.../laps.csv">` is a
   same-origin relative URL : the browser resolved it against the
   current origin (`last-loop-lepin-pr-27.preview.borso.fr`), not
   against the cross-origin API host.*
2. **Why?** Because preview deploys the front and the API on two
   different sub-domains. *Front sits on a static-site CloudFront
   distribution at `<app>-pr-<N>.preview.borso.fr` ; the API has
   its own custom domain at `<app>-pr-<N>-api.preview.borso.fr`.
   That split is intentional and prod uses same-origin routing
   (CloudFront fronts `/api/*` to API Gateway), which is why the
   same anchor works there.*
3. **Why?** The repo already had a sibling Grit plugin
   `no-direct-api-fetch-in-site.grit` that catches
   `fetch('/api/...')`, plus an `apiClient` wrapper. *Neither
   covers `<a href>` — `apiClient` only wraps `fetch`, and the
   plugin matches the JS `string` AST node which JSX attribute
   strings aren't. The author wrote `href={`/api/foo`}` because
   it "felt same-origin" ; the existing pattern wasn't visibly on
   the way for href-style code.*

**Root cause:** *thought a same-origin anchor would resolve to the
API, actually only `fetch` was being routed through `apiClient`
and direct-navigation targets had no equivalent wrapper or guard.*

## Detection failure causes

- **Typing:** TypeScript happily types `<a href="/api/foo">` —
  `href` is `string`, the string is well-formed, the navigation
  semantics aren't part of the type system.
- **Linter / static analysis:** A sibling Grit plugin already
  catches `fetch('/api/...')`. It uses `language js` and the
  template `\`"/api/$_"\`` — both correct for normal JS string
  literals inside a `fetch()` call. JSX attribute strings are a
  different AST node (`JsxString`, wrapping a `JSX_STRING_LITERAL`
  token), invisible to that pattern.
- **Functional validation locally:** Dev runs same-origin via
  Vite's `pnpm dev` proxy — the bug is invisible.
- **CI (tests / build):** No site-level integration test
  exercises the download buttons.
- **Code review:** Anchor looked structurally identical to the
  pre-existing CSV button. The pre-existing button had the same
  latent bug, so the diff didn't draw attention.
- **PO / QA validation:** The bug ships invisibly to prod (where
  same-origin routing makes it work) and only surfaces on preview.
  Routine prod testing never sees it.

## Countermeasure

Export `apiUrl(pathname)` from `api/client.ts` (it already had
the `API_BASE` constant, just not the helper). Three anchor sites
updated to call it : `ArchivesPage.tsx` (×2 — the new "Stats par
boucle (CSV)" + the pre-existing "Classement (CSV)") and
`SpectatorPage.tsx` (×1 — the "Télécharger le CSV").

## Eradications shipped

### 1 — Biome Grit plugin matching JsxString /api/ literals (level 2)

A new `biome-plugins/no-api-anchor-in-site.grit` matches the
`JsxString` AST node whose literal text contains `/api/` and
fires an error pointing at `apiUrl()`. Wired into
`apps/last-loop-lepin/biome.jsonc` alongside the existing
`no-direct-api-fetch-in-site.grit`. Both pre-commit (`biome
check`) and CI gate it.

The non-obvious bit took a tooling-doc dig : the Grit shape
`\`"/api/$_"\`` matches a JS `string` AST node, which JSX
attribute strings are not — they parse to `JsxString(JSX_STRING_LITERAL)`
tokens. Biome's own plugin engine exposes `JsxString()` as a
matchable node when `engine biome(1.0)` + `language js(jsx)` are
declared at the top of the .grit file ; the regex `r".*[\"']/api/.*"`
on the matched node's literal text catches both `href="/api/foo"`
and `href='/api/foo'`. See
[`docs/knowledge/biome-grit-jsx-matching.md`](../knowledge/biome-grit-jsx-matching.md)
for the working pattern shape (and the dead ends that fooled the
first attempt).

**Type:** DevX check (level 2 — biome plugin, fires in IDE + at
pre-commit + in CI)

**Reference:** PR ./lessons-from-pr-27 · commits
[`<this-pr-sha>`] (`biome-plugins/no-api-anchor-in-site.grit` +
`apps/last-loop-lepin/biome.jsonc`)

**The actual fix:**

```grit
engine biome(1.0)
language js(jsx)

JsxString() as $s where {
  $s <: r".*[\"']/api/.*",
  register_diagnostic(
    span = $s,
    message = "Bare `/api/...` in a JSX attribute bypasses VITE_API_BASE and 404s on preview …",
    severity = "error"
  )
}
```

### 2 — Structural helper at call sites (level 1)

`apiUrl(pathname: string)` exported from
`apps/last-loop-lepin/site/src/api/client.ts` :

```ts
export function apiUrl(pathname: string): string {
  return `${API_BASE}${pathname}`;
}
```

Every new download/redirect site uses `href={apiUrl('/api/foo')}`.
The Grit plugin in eradication #1 is the safety net that catches
a future contributor who forgets.

**Sibling defects swept:** the existing "Classement (CSV)" anchor
on both ArchivesPage and SpectatorPage had the same bug latent.
Fixed in the same commit (`e36b217`).

## See also

- [`docs/dantotsus/frontend-fetch-must-go-through-api-client.md`](./frontend-fetch-must-go-through-api-client.md)
  — sibling on the fetch surface, same root cause, different
  Grit pattern shape.
- [`docs/knowledge/biome-grit-jsx-matching.md`](../knowledge/biome-grit-jsx-matching.md)
  — JSX-specific Grit syntax that took a while to find.
- [`docs/knowledge/preview-api-cross-origin.md`](../knowledge/preview-api-cross-origin.md)
  — why preview is cross-origin in the first place.

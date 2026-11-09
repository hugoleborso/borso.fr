---
summary: 'The Dashboard artifact type runs each page `<script>` in its own scope and runs none of a plain artifact''s; share through `window`, and render the page file locally before writing it.'
triggers:
  paths:
    - 'scripts/quality/dashboard/index.html'
  output:
    - 'is not defined'
---

# The Dashboard artifact type's page contract

The 3S board is the one page in this repository that ships to a claude.ai
artifact store rather than to a site. Everything below is the type's own
behaviour, read from its instructions at
`https://claude.ai/artifact/GZLZthZ2sQjn7T16skfdeF` on 2026-11-09 and measured
on the board at `https://claude.ai/artifact/SPfft3WuWwZh2YHRu3Ztab`.

## A plain artifact runs none of the page's JavaScript. This type runs all of it

PR #281 spent four commits learning this. A plain artifact was given an inline
module to drive a zoom dialog; it never ran on the published board though the
same file worked in a browser (`c28d9f1`). The next attempt drove the zoom with
`:target` and a link, which also never opened (`ab1d3a3`). The third used a
native `<details>`, which works because it needs no script at all (`041c482`
then moved the board to the Dashboard type, which does run scripts, so the
charts could be real d3 instead of CSS bars).

If a page needs interaction, the type has to be the Dashboard type. An
artifact's type is fixed when it is created, so changing it means a new link.

## Each `<script>` gets its own scope

> Scripts run in order once the page is in place, each in its own scope.
> Anything two scripts share goes on `window`.

A `function` or `const` declared in one script is invisible to the next. The
call compiles, lints and type-checks — there is nothing to check, it is a
global reference — and throws `<name> is not defined` only in the published
page, where the reader sees a blank chart. `drawChart`, declared in the second
script and called from the third, did exactly that to every sparkline and the
modal on 2026-11-09. The board shares through `window.s3`.

A local file opened in a browser does *not* reproduce this: there, every
top-level script shares one global scope, so the page works. To reproduce the
type, wrap each script body in an IIFE, which is what
`scripts/quality/dashboard-page.core.ts` does.

## The page is mounted inside the dashboard's own document

It lands in `<div id="dash-root">`. So CSS for `body`, `html` or a bare tag
restyles the dashboard around it, and the page's styles stay on classes of its
own. It must work at full width and at about 400 px beside a chat, with no fixed
widths and drawings sized from `clientWidth`.

## The type's tokens are not yours

The page reads about thirty CSS custom properties (`--cds-gap-lg`,
`--cds-font-size-body`, `--color-fg-muted`, `--font-anthropic-sans`, …) that the
type's `artifact-type/app.css` defines, and they vary by theme and density. An
undefined custom property computes to nothing, so a local render without them
measures a page with no gaps and no padding. `DASHBOARD_TYPE_TOKENS` in
`scripts/quality/dashboard-page.core.ts` carries the light-theme,
default-density values read from that stylesheet at version `1794047892-ef8d`.
Re-read it when a measurement stops matching the board.

## Silently dropped, so a page that uses them fails quietly

A `<script src>` or `<link>` naming anything but the dashboard's own files, a
`type="module"` script, `on…=` attributes, and every `<iframe>`, `<object>`,
`<base>` and `<form>` with its contents. There is no React. No network, storage
or cookies.

## Rendering

The type asks only that the *published* board is not browsed to, because that
keeps the reader waiting:

> Render or browse to the page only if asked, since that keeps them waiting.

That says nothing about the page file on disk. Render it before every write with
`pnpm exec tsx scripts/quality/check-dashboard-page.ts`, which is also the
pre-push and CI gate. Reading the restriction as "the page cannot be rendered"
is what sent two defects to the operator's phone — see
[`../dantotsus/the-page-nobody-rendered-before-the-operator.md`](../dantotsus/the-page-nobody-rendered-before-the-operator.md).

After a write, the check is the type's own `check` document in
`data/users/me`, which reports what the published page threw. It reported no
fault on the write that shipped the scope defect, so it is a backstop and not a
renderer.

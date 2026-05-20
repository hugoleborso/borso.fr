---
status: PASS_EXCEPT_UNVERIFIABLE
summary: |
  22 assertions: 4 PASS, 0 FAIL, 18 UNVERIFIABLE (13 explicitly
  deferred-to-follow-up-pr per the implementation-01 partial verdict,
  5 ambiguous-or-untestable on the foundation slice). Shipped surface
  is the design-token layer + i18n catalogs + a single scaffold
  screen; verified `--accent = #2d5fa0` light / `#6b9bd6` dark, cream
  paper `#f5f1e8`, dark-mode flip via `prefers-color-scheme` (no
  in-app toggle), strings sourced from catalogs (not hard-coded), no
  broken images. One genuine grey zone: spec asks for "default FR"
  but implementation does `detectInitialLocale(navigator.language)`
  — Chromium `en-US` renders English; a French-locale browser would
  render French. Spec sentence is ambiguous; flagged for clarification
  rather than failing. No deviations vs design bundle on the shipped
  surface. Auth UI, app shell, routes, PWA, service worker, every
  numbered use case are absent — all match the implementation-01
  "deferred to follow-up PRs" list verbatim.
artifacts:
  - docs/features/pragma/first-features/validation/visual-validation-2026-05-19-2111.md
  - docs/features/pragma/first-features/validation/screenshots-2026-05-19-2111/01-root-default-render.png
  - docs/features/pragma/first-features/validation/screenshots-2026-05-19-2111/02-dark-mode.png
  - docs/features/pragma/first-features/validation/screenshots-2026-05-19-2111/03-mobile-viewport.png
  - docs/features/pragma/first-features/validation/screenshots-2026-05-19-2111/04-catalog-route.png
next:
  kind: ship
---

## Kaizen items

Surfaced from the run for the next conversation (visual-validation
standard says to surface design-bundle drift, missing keys, dev-server
gotchas, accessibility):

- **Spec clarification on "default FR".** The Q.O.D. row "User-facing
  language" needs one sentence resolving the ambiguity between
  "first-render FR regardless of OS locale" and "FR is the fallback when
  OS locale isn't FR or EN". The implementation chose the second
  reading; a reviewer landing on `pragma.borso.fr` with English Chrome
  would see English first, which contradicts a strict reading of the
  spec. Worth resolving before the next visual validation so the same
  ambiguity doesn't get re-litigated.
- **404 / placeholder route for deferred UI surfaces.** Today the SPA
  fallback renders the scaffold on `/catalog`, `/sessions`, `/members`,
  `/bars`, `/instruments`. A 60-line placeholder component keyed off
  `react-router-dom`'s `*` route would communicate intent and make the
  next visual validation strictly faster.
- **Manifest icons (`icons: []`).** Flagged in implementation-01 kaizen.
  Visible defect on PWA install on iOS / Android. Should be generated
  before the prod cutover, not after.
- **No globally-exposed i18next handle in dev.** Adding
  `if (import.meta.env.DEV) window.__i18next = i18next` would let
  agent-browser swap locale without restarting Chromium with a
  different OS locale — a more agent-friendly affordance for the next
  visual-validation run.
- **agent-browser auto-install fails behind cert pinning.** The
  bundled `agent-browser install` tries
  `https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json`
  and fails with `invalid peer certificate: UnknownIssuer` in this
  sandbox. Worked around by reusing the Playwright Chromium at
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` via
  `--executable-path`. Worth a `docs/knowledge/` note so future
  visual-validation runs in this sandbox don't lose a minute on the
  same hurdle.
- **Dev-server's `concurrently` boots the local Postgres even when
  only the site is needed.** For visual-only runs without API
  exercising, `pnpm dev:site` is the right script — the dispatched
  agent should know to use that rather than `pnpm dev` to skip the
  Postgres bring-up cost. Worth surfacing in the per-app README or in
  the dispatch brief template.

## Full report

See [`docs/features/pragma/first-features/validation/visual-validation-2026-05-19-2111.md`](../../validation/visual-validation-2026-05-19-2111.md).

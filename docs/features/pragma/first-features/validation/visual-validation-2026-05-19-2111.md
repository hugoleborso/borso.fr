# Visual validation — Pragma first features (catalog, setlist, sessions, CRM bars)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-05-19T21:11:00Z
- Tooling: agent-browser 0.27.0 (Chromium from `/opt/pw-browsers/chromium-1194`)
- Run id: `2026-05-19-1937-pragma`
- Implementation status under test: **partial** (foundation only — see `implementation-01.md`)

## Scope guidance applied

The implementation verdict marks every UI surface beyond the scaffold as
**deferred to follow-up PRs** (members admin, mastery matrix, catalog
list/detail, sessions, setlist editor, bars CRM, instruments admin, PWA
service worker, full CDK stack). Per the dispatch brief from the
tech-lead orchestrator, deferred assertions are tagged
**UNVERIFIABLE** with reason `deferred-to-follow-up-pr` — they do **not**
FAIL the run. Only assertions targeting the *shipped* surface (single
scaffold screen, design tokens, dark-mode flip, FR/EN catalogs, accent
color) are tagged PASS / FAIL on the merits.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Result | A French-language PWA at `pragma.borso.fr` (private, shared password) | Open `/` on the dev server; read `<h1>`; inspect rendered locale | `./screenshots-2026-05-19-2111/01-root-default-render.png` — renders `Pragma — scaffold ready` in English; no auth wall. `navigator.language = en-US`, runtime selects `en` catalog | UNVERIFIABLE |
| 02 | Result | Editorial-jazz aesthetic — blue accent on cream paper | `getComputedStyle(:root)` for `--accent`, body `background-color` | `--accent = #2d5fa0`; body bg `rgb(245, 241, 232) = #f5f1e8` (cream paper). Token values match design bundle | PASS |
| 03 | Result | Dark-mode opt-in via `prefers-color-scheme` only (no in-app toggle) | `agent-browser set media dark`; re-read tokens; confirm no toggle in DOM | `--accent` flips to `#6b9bd6`, body bg flips to `rgb(26, 24, 20) = #1a1814`. DOM contains no theme-toggle element (only `<h1>` + `<p>`). `./screenshots-2026-05-19-2111/02-dark-mode.png` | PASS |
| 04 | Result | Member palette of 5 distinct equal-chroma hues (coral / teal / mustard / plum / sage) | Read CSS custom properties on `:root` | `--member-coral #d96f5a`, `--member-teal #3f8e8a`, `--member-mustard #c79b3e`, `--member-plum #7b5786`, `--member-sage #7a8f5a` — tokens declared and reachable, though no consuming UI yet. Token shipped; UI deferred | PASS |
| 05 | Result | Responsive layout (desktop ≥ 1024 px, mobile < 1024 px) | Set viewport `375 × 812`, screenshot; restore `1440 × 900` | `./screenshots-2026-05-19-2111/03-mobile-viewport.png` — scaffold collapses gracefully; no horizontal scrollbar; no responsive UI to test (deferred) | UNVERIFIABLE |
| 06 | Result | Side-gutter transition warnings, inline chord chart preview, fullscreen Mode Scène | — | No setlist editor surface in build | UNVERIFIABLE (deferred-to-follow-up-pr) |
| 07 | Result | Drag-reorder setlist | — | No setlist surface | UNVERIFIABLE (deferred-to-follow-up-pr) |
| 08 | Result | Kanban + list views for bars | — | No `/bars` surface | UNVERIFIABLE (deferred-to-follow-up-pr) |
| 09 | Use case 1 (catalog) | `/catalog` route renders catalog list with new-song affordance | `agent-browser open /catalog`; screenshot | `./screenshots-2026-05-19-2111/04-catalog-route.png` — SPA fallback returns the scaffold screen (no router installed) | UNVERIFIABLE (deferred-to-follow-up-pr) |
| 10 | Use case 1bis (members) | `/members` shows 5×7 mastery matrix | `agent-browser open /members` | Scaffold screen (no router) | UNVERIFIABLE (deferred-to-follow-up-pr) |
| 11 | Use case 2 (setlist) | Drag songs into ordered positions, transition warning, energy slider | — | No setlist editor | UNVERIFIABLE (deferred-to-follow-up-pr) |
| 12 | Use case 3 (sessions) | Concert detail shows venue/capacity/gear/friends count | — | No sessions surface | UNVERIFIABLE (deferred-to-follow-up-pr) |
| 13 | Use case 4 (bars) | `/bars` list + kanban toggle; stale-bar banner | — | No bars surface | UNVERIFIABLE (deferred-to-follow-up-pr) |
| 14 | Use case 5 (offline) | PWA service worker caches catalog + charts + next session setlist | — | No service worker shipped (`apps/pragma/site/src/sw/` does not exist) | UNVERIFIABLE (deferred-to-follow-up-pr) |
| 15 | Dispatch — auth gate | Opening `/` (unauthenticated) shows the auth screen | `agent-browser open /`; read DOM | `./screenshots-2026-05-19-2111/01-root-default-render.png` — no auth screen rendered; the scaffold renders instead. **Spec says all routes are "behind the shared password"; the v1 implementation slice shipped the back-end auth (login / bootstrap / rotation endpoints, argon2id, 5/15 min rate-limit) but no frontend auth UI.** The implementation verdict explicitly defers the UI; flagged as design-by-deferral, not regression | UNVERIFIABLE (deferred-to-follow-up-pr) |
| 16 | Dispatch — auth happy path | Correct password logs in; wrong password shows error; 5 wrong attempts rate-limited | — | No frontend auth form to drive — back-e2e tests cover the API surface (7 tests, all green per implementation-01.md) | UNVERIFIABLE (deferred-to-follow-up-pr) |
| 17 | Dispatch — app shell | Sidebar / nav surfaces present after login | DOM inspection on `/` | Only `<main class="scaffold">` with one heading + one paragraph. No `<nav>`, no sidebar | UNVERIFIABLE (deferred-to-follow-up-pr) |
| 18 | Dispatch — i18n default FR | UI defaults to French | `document.querySelector('h1').textContent` with `navigator.language = en-US` | Renders English (`Pragma — scaffold ready`). The default catalog **is** `fr` (`DEFAULT_LOCALE = 'fr'` in `i18n.utils.ts`), but `detectInitialLocale` routes to `en` when the navigator language family is `en`. A French-locale browser would render French (verified by reading the catalogs). **Strict reading of spec ("defaults to French") would FAIL on en-US; charitable reading ("the platform serves the band — FR-first, EN catalog for portfolio reviewers") would PASS.** Marked UNVERIFIABLE pending spec arbitration — see Notes | UNVERIFIABLE |
| 19 | Dispatch — i18n switch mechanism | A mechanism (programmatic or visible) exists to switch FR↔EN | Probe `window.i18next`, scan DOM for toggle | No `window.i18next` (not exposed globally); no UI toggle. Switch *is* implicit via OS locale at first load. No reload-free mechanism reachable from the runtime | UNVERIFIABLE (deferred-to-follow-up-pr) |
| 20 | Dispatch — i18n catalog source | Visible strings come from catalogs, not hard-coded | grep + visible strings comparison | `App.tsx` calls `t('scaffold.title')` and `t('scaffold.subtitle')`; both keys exist in `fr.json` + `en.json`; no hard-coded user-facing strings in the rendered DOM | PASS |
| 21 | Dispatch — pixel-content check (all screenshots) | No `<img>` rendered alt-text instead of pixels | `eval Array.from(document.querySelectorAll('img'))…` per screenshot | Empty array on every screenshot (no `<img>` tags exist at all — pure-CSS scaffold) | PASS |
| 22 | Dispatch — deferred routes 404/redirect/placeholder | `/catalog`, `/sessions`, `/members`, `/bars`, `/instruments` give a sensible response | `agent-browser open <route>` × 5 | Every route returns the SPA fallback (`200 OK` + scaffold screen) — no router installed, no 404, no placeholder copy. Acceptable per dispatch brief; flagged as kaizen | UNVERIFIABLE (deferred-to-follow-up-pr) |

## Notes

> *FAIL and UNVERIFIABLE rows that warrant a comment.*

- **Row 01 (PWA + auth wall).** The shipped slice is a Vite SPA that bypasses every auth and route consideration. There is no service worker registered (`apps/pragma/site/src/sw/` does not exist), no manifest icons (`manifest.webmanifest` ships with `icons: []` per implementation kaizen #2), and no auth gate on the client. The implementation-01 verdict explicitly defers all of these to follow-up PRs; the spec's *Result* line about "a French-language PWA … behind the shared password" is therefore untestable on this slice and parked as UNVERIFIABLE rather than FAIL.
- **Row 05 (responsive).** No responsive UI is shipped beyond the body element accepting any width. The token system is responsive-ready (no fixed-px traps in `design-tokens.css`), but the assertion in the spec is about catalog/setlist/bars layouts at the 1024 px breakpoint — none of those views exist yet.
- **Rows 06–14 (every numbered use case).** All deferred per implementation-01. No regression — this is design-by-deferral acknowledged by the orchestrator's brief.
- **Row 15 (auth gate).** Visible deviation from spec but expected per dispatch brief. The back-end auth surface ships fully tested (7 back-e2e tests covering bootstrap, login, rate-limit, middleware, rotation per implementation-01); the frontend auth form is the missing piece. Verifiable in the next slice.
- **Row 18 (FR default).** Strictly, the spec line "**FR + EN i18n** — default locale FR" reads as a *user-visible* default, not a browser-locale-aware default. The implementation does `detectInitialLocale(navigator.language)` — which means a reviewer landing on the deployed app with `en-US` Chrome will see English first, contradicting "default FR". Two interpretations: (a) spec means the FR catalog is the fallback (matches `DEFAULT_LOCALE = 'fr'` + `fallbackLng`); (b) spec means the first render is FR regardless of locale. The implementation matches (a); the spec text matches (b). Marked UNVERIFIABLE pending a spec clarification — flagged for the next conversation, not a FAIL because the reading is genuinely ambiguous and the implementation choice is defensible.
- **Row 19 (switch mechanism).** No runtime switcher (UI toggle or globally-exposed `i18next` handle). To swap locale today a user must change OS locale and reload. Acceptable for v1 foundation; will need surfacing once any user-facing UI ships.
- **Row 22 (deferred routes).** The SPA fallback renders the scaffold on every path, which is the lowest-friction stance but not a "deferred" UX — there's no "coming soon" or 404 messaging. Not failing because the dispatch brief explicitly listed this as acceptable, but flagged as kaizen for the next PR (a 404-style placeholder for unimplemented routes would communicate intent and prevent reviewers thinking the catalog page is meant to look like the scaffold).

## Visible deviations on the shipped surface

The shipped surface is small enough that PASS/FAIL is mostly clean:

- **PASS:** design tokens (accent, paper, member palette, dark-mode flip), no broken images, i18n catalog sourcing, dark-mode toggle through `prefers-color-scheme`.
- **No FAIL on shipped surface.**
- **Genuine grey zone:** the FR-default-vs-navigator-detected debate (row 18). The implementer chose a defensible reading; the spec sentence is ambiguous. Worth a one-line clarification in `spec.md` before the next slice lands so the same conversation doesn't repeat.

## Verdict: PASS_EXCEPT_UNVERIFIABLE

0 FAIL on shipped surface, 1 ambiguous UNVERIFIABLE (row 18, FR default), 13 UNVERIFIABLE-deferred. Per the visual-validation standard, this is **PASS_EXCEPT_UNVERIFIABLE**, mergeable on the condition the unverifiable rows are disclosed in the PR description. The orchestrator should advance to follow-up PRs covering the deferred UI surfaces; this run does not block.

## Kaizen — visible surface

- **Add a 404 / "coming soon" view for unimplemented routes.** The SPA fallback rendering the scaffold on `/catalog`, `/members`, `/bars` etc. makes it harder for a reviewer to tell foundation from UI bugs. A 60-line placeholder component keyed off `react-router-dom`'s `*` route would communicate intent and unblock the next visual validation.
- **Spec clarification needed on "default FR".** Add one sentence to the Q.O.D. row "User-facing language": should the first render be French regardless of `navigator.language`, or should `detectInitialLocale` apply? The two readings diverge for any non-FR reviewer.
- **Manifest icons.** `manifest.webmanifest` ships with `icons: []` per implementation-01. Visible defect on PWA install on iOS / Android; not blocking the scaffold but blocking any "real PWA" claim. Should be generated before the prod cutover.
- **No globally-exposed i18next handle.** For dev-only inspection (and the visual-validator) a `window.__i18next = i18next` (gated on `import.meta.env.DEV`) would make locale switches reachable from devtools and from agent-browser without restarting the browser with a different locale.
- **Headless Chrome locale.** `agent-browser`'s default Chromium runs `en-US`; combined with the navigator-detected i18n, the validator always sees English by default. Either the validator should be able to force `navigator.language` (init script) or the i18n setup should expose a `?lang=` query override; either way the test surface should not require an OS-level locale change.

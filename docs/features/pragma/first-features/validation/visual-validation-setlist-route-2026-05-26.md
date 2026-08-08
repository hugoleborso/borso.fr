# Visual-validation — setlist route deep-link fix (commit `2984db2`)

Focused re-run of the FAIL row from the rattrapage report
(`visual-validation-rattrapage-2026-05-26.md`, row 08): deep-link to
`/sessions/<id>/setlist` rendered a blank app shell with
`No routes matched location "/sessions/<id>/setlist"` in the console.

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Live preview: https://pragma-pr-26.preview.borso.fr/
- Live API: https://pragma-pr-26-api.preview.borso.fr/
- Run at: 2026-06-05T13:35:08Z
- Tooling: agent-browser 0.27.0, Chrome 149.0.7827.22 (linux-x64, headless via puppeteer cache)
- Branch HEAD: `2984db2` (`fix(pragma): declare /sessions/:sessionId/setlist route + SetlistEditorPage wrapper`)

## Pre-flight — is the fix in the deployed preview?

The fix is in the branch but **NOT in the deployed preview bundle**. Three artefacts confirm:

1. `apps/pragma/site/src/App.tsx:43` declares `<Route path="/sessions/:sessionId/setlist" element={<SetlistEditorPage />} />` locally (checked this session).
2. `apps/pragma/site/src/routes/setlists/SetlistEditorPage.tsx` exists with `useSetlistBySession` + Create CTA (`useCreateSetlist`) + i18n keys (`setlist.missingSessionId`, `setlist.noSetlistYet`, `setlist.createForSession`, `common.back`). All four keys present in both `i18n/en.json` and `i18n/fr.json` (lines 40, 188-190).
3. The deployed bundle does NOT contain the fix:
   ```
   curl -sI https://pragma-pr-26.preview.borso.fr/assets/index-DXYgBSsc.js
   → last-modified: Tue, 26 May 2026 00:07:01 GMT
   ```
   Bundle is from `2026-05-26 00:07 GMT`; fix commit `2984db2` is dated 2026-06-05. A `curl … | grep -oE "noSetlistYet|missingSessionId|createForSession|SetlistEditorPage"` over the live bundle returns zero matches.

Conclusion: the preview deployment for commit `2984db2` either hasn't run, hasn't finished, or failed silently. Every assertion below tests the **deployed bundle**, which still exhibits the original FAIL.

## Assertions on the fix itself

| #   | Assertion                                                                                      | Action                                                                                              | Evidence                                                                                                                                                                                                                                                                                                                                       | Verdict      |
| --- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 01  | New session created via Concert dialog returns a fresh session id                              | Login via shared password, open `/sessions`, click Concert, fill `Setlist Route Test Venue`, submit | URL after submit = `/sessions/e7598d32-0a03-44d3-9ecc-e29b1e1370d0`. Session detail page shows the new title + a "Build setlist" CTA — i.e. no setlist exists yet (`./screenshots-setlist-route-2026-05-26/05-session-detail-baseline.png`)                                                                                                    | PASS         |
| 02  | Fresh-context deep-link to `/sessions/<sessionId>/setlist` lands on the login form (auth gate) | New browser session (`agent-browser close`), open the URL directly                                  | App shell never mounts — `<div id="root"></div>` stays empty (`length === 0`). Console: `No routes matched location "/sessions/e7598d32-…/setlist"`. No login form rendered, no redirect to `/login` — the route literally doesn't exist in the deployed bundle (`./screenshots-setlist-route-2026-05-26/01-fresh-context-deeplink-blank.png`) | FAIL         |
| 03  | Setlist editor wrapper renders Create CTA when no setlist exists                               | Login, then open the deep-link directly                                                             | Same blank-shell behaviour as row 02. `document.getElementById('root').innerHTML.length === 0`, console warning `No routes matched location "/sessions/e7598d32-…/setlist"` (`./screenshots-setlist-route-2026-05-26/02-deeplink-authed-blank.png`, `./screenshots-setlist-route-2026-05-26/04-deeplink-blank-with-console.png`)               | FAIL         |
| 04  | Click Create CTA mounts the editor                                                             | n/a — CTA never renders                                                                             | Cannot exercise: row 03 blocks.                                                                                                                                                                                                                                                                                                                | UNVERIFIABLE |
| 05  | When a setlist already exists, wrapper resolves it and editor mounts                           | n/a — same blocker                                                                                  | Cannot exercise.                                                                                                                                                                                                                                                                                                                               | UNVERIFIABLE |

## Assertion on the new i18n keys (FR)

| #   | Assertion                                                                                                      | Action                                                                                                 | Evidence                                                                                                                                                                                                                                                                                                                                                  | Verdict                              |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 06  | FR locale renders `Créer une setlist` / `Aucune setlist créée pour cette session.` / `Retour` on the new route | Switch locale to FR via the LanguageSwitcher (`localStorage.pragma.locale = 'fr'` set), open deep-link | Page still renders empty `root`; no FR copy renders because the route + the wrapper component aren't shipped (`./screenshots-setlist-route-2026-05-26/08-fr-deeplink-blank.png`). The locale switch itself worked (`localStorage.pragma.locale === 'fr'`), but the keys can't be tested against the deployed bundle since they don't exist in it (`curl … | grep noSetlistYet` returns nothing). | FAIL |

## Non-regression spot-check on round-6 PASS rows

Same bundle as the rattrapage report, so unsurprisingly identical behaviour. Spot-checked 5 of the 18:

| #    | Assertion                                                                                | Verdict      | Evidence                                                                                                                                                                                                                                                                                                           |
| ---- | ---------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R-01 | Auth gate redirects unauthenticated user to `/login`                                     | PASS         | `agent-browser open /` → redirect to `/login` (URL check). Login form renders with serif `Pragma`, `BAND ERP`, `SHARED PASSWORD` input + `Enter` button.                                                                                                                                                           |
| R-02 | Sidebar nav: Catalog / Sessions / Setlists / Bars / Members / Instruments + badge counts | PASS         | After login, `/catalog` snapshot shows all 6 links with `Sessions 2 / Setlists 2 / Bars 1` counts (`./screenshots-setlist-route-2026-05-26/06-catalog-nonregression.png`)                                                                                                                                          |
| R-03 | Mode Scène fullscreen + Transpose ±1 + Zoom ±A + ChordPro rendered                       | PASS         | `/catalog/02e1ab6a-c340-409b-8913-d12a89933355/scene` snapshot: "← Back / Take Five / Transpose down / Transpose up / Zoom out / Zoom in" + ChordPro `[Cm]Take five and turn [F]around` (`./screenshots-setlist-route-2026-05-26/07-mode-scene-nonregression.png`)                                                 |
| R-04 | ESC exits Mode Scène back to song detail                                                 | PASS         | `agent-browser press Escape` → URL becomes `/catalog/02e1ab6a-c340-409b-8913-d12a89933355` (song detail)                                                                                                                                                                                                           |
| R-05 | Setlist editor transition warning (≥ 2 entries with no shared harmonic)                  | UNVERIFIABLE | The session created in this run has no setlist (Create wrapper is the FAIL'd path); pre-existing test sessions with setlists are still accessible via the SetlistsPage list view, but the rattrapage already covered the warning shape on the same bundle (row 25/26). Re-testing identical bundle adds no signal. |
| R-06 | Dark mode via `prefers-color-scheme`                                                     | UNVERIFIABLE | Same — identical bundle to rattrapage which PASSed. Re-testing adds no signal.                                                                                                                                                                                                                                     |

## Notes

- **Row 02 / 03 / 04 / 05 / 06 (FAIL or UNVERIFIABLE)**: every assertion against the fix collapses to the same root cause — the preview at `https://pragma-pr-26.preview.borso.fr/` is still serving the pre-fix bundle (`index-DXYgBSsc.js`, `last-modified: Tue, 26 May 2026 00:07:01 GMT`). The fix is committed at `2984db2` on the branch (`/home/user/borso.fr/.claude/worktrees/agent-adb32f356664db830/apps/pragma/site/src/routes/setlists/SetlistEditorPage.tsx`, `App.tsx:43`, both i18n files), but the per-PR deploy workflow has not refreshed the preview. **Operator action required: trigger the preview deploy on PR #26 (e.g. push an empty commit, or rerun the failed workflow) and re-run this validation.** Until then, the round-6 rattrapage FAIL on `/sessions/<id>/setlist` is unchanged in the live preview.
- **Row R-05 / R-06 (UNVERIFIABLE)**: deliberate skip — identical deployed bundle to the rattrapage run, so re-testing the same code path adds no signal. The rattrapage report's PASS rows still apply.
- One side-finding worth surfacing while in here: the login form on the deployed preview does NOT navigate when filled via `agent-browser fill @ref` (TanStack Form's controlled input rejects the synthesised input event from puppeteer's `fill`). The working pattern is `click @input && keyboard type "<password>" && click @submit` — same workaround the rattrapage used. Not a regression, just confirming for future agents.

## Verdict: FAIL

The fix is present in the source tree at `2984db2` but absent from the live preview bundle. The deep-link assertion that motivated this re-run still fails end-to-end against the URL the operator provided. This is a _deployment_ gap, not an _implementation_ gap — but per the visual-validator contract, FAIL is FAIL: the deep-link does not work for a user opening it today.

---
status: FAIL
summary: |
  Branch HEAD is 2984db2 with the fix correctly in source
  (apps/pragma/site/src/App.tsx:43 declares /sessions/:sessionId/setlist,
  SetlistEditorPage.tsx exists with useSetlistBySession + Create CTA, all
  four i18n keys present in en.json + fr.json). However the deployed
  preview bundle at https://pragma-pr-26.preview.borso.fr/ is still the
  pre-fix asset (index-DXYgBSsc.js, last-modified 2026-05-26 00:07 GMT;
  curl over the bundle finds zero matches for noSetlistYet /
  missingSessionId / createForSession / SetlistEditorPage). Fresh-context
  deep-link to /sessions/<id>/setlist still renders an empty <div id=root>
  with console warning `No routes matched location` — identical to the
  rattrapage FAIL row 08. Authed deep-link: same blank shell. FR locale:
  same blank shell. Create CTA: cannot exercise (UNVERIFIABLE). Editor
  resolution: cannot exercise (UNVERIFIABLE). Non-regression spot-check on
  5 round-6 rows: 4 PASS (auth gate, sidebar nav with counts, Mode Scène
  fullscreen + transpose + ChordPro, ESC exits) ; 2 UNVERIFIABLE (transition
  warning + dark mode — identical bundle to rattrapage, no new signal).
  Totals: 1 PASS + 3 FAIL + 2 UNVERIFIABLE on the 6 fix-focused rows ;
  4 PASS + 2 UNVERIFIABLE on the non-regression sweep. Operator action:
  trigger the preview redeploy on PR #26 (empty commit / rerun workflow),
  then re-run this validation. The implementation appears correct; the
  deploy did not propagate.
artifacts:
  - docs/features/pragma/first-features/validation/visual-validation-setlist-route-2026-05-26.md
  - docs/features/pragma/first-features/validation/screenshots-setlist-route-2026-05-26/
next:
  kind: fix
---

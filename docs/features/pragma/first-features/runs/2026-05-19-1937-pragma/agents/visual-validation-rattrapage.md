---
status: FAIL
summary: |
  Rattrapage visual-validation pass on the live preview at HEAD 4d9d5b7 (rounds
  7 → 17c). Real-user flow via agent-browser 0.27.0 + bundled chromium.

  26 PASS / 2 FAIL / 1 UNVERIFIABLE on the 29 new rows, plus 10/10 on the
  spot-checked round-6 non-regression rows.

  Per-round verdicts:
    - Round 9 (LanguageSwitcher): PASS — FR/EN switch + localStorage persist.
    - Round 10: FAIL — SPA fallback works for /login, /catalog, /sessions/<id>
      (PASS), but /sessions/<id>/setlist renders a blank shell with
      "No routes matched" warning. API calls go cross-origin to
      pragma-pr-26-api.preview.borso.fr/api/... NOT same-origin /api/... —
      the round-10 verdict claim contradicts the live preview behaviour.
    - Round 11 (FileDrop + MB search): PASS — 10 hits, prefill, dummy PDF
      upload succeeded, signed-get iframe renders Wonderwall chart.
    - Round 12 (FileDrop Remove): PASS.
    - Round 15 (MB enrichment): PASS — Album / Duration / MB ID render on the
      new-song form.
    - Round 17a (CreateSessionDialog + delete): PASS — both dialogs, optimistic
      delete with confirm modal, all observed.
    - Round 17b (setlist optimistic): PASS for slider; UNVERIFIABLE for drag-
      to-reorder (dnd-kit pointer events not reproducible by agent-browser).
    - Round 17c (optimistic everywhere else): PASS — bars kanban drag, mastery
      wheel/right-click clear, bars inline create all instant + persistent.

  Top FAILs with evidence:
    - row 09 — cross-origin API: every fetch goes to the API subdomain
      (responses carry access-control-allow-origin). Either round 10's
      cutover never reached the preview stack or the verdict was mis-asserted.
    - row 08 — /sessions/<id>/setlist deep link is blank (no route registered),
      while /sessions/<id>/ shows the setlist editor inline.

  Non-regression sweep: clean — auth gate, sidebar + badge counts, dark mode,
  mobile slide-over nav, Mode Scène fullscreen + transpose + ESC exit, stale
  bar banner, catalog at 375 px, status tabs with counts, energy/mastery chips.

  Recommendation: re-open round-10 to (a) ship the same-origin /api/ behaviour
  the verdict described, and (b) add the missing /sessions/:id/setlist route
  (or remove the references in the round-17b plan if the setlist editor is
  intentionally inline-only). Re-run /visual-validation after the fix.
artifacts:
  - docs/features/pragma/first-features/validation/visual-validation-rattrapage-2026-05-26.md
  - docs/features/pragma/first-features/validation/screenshots-rattrapage-2026-05-26/
next:
  kind: fix
---

---
status: PASS
summary: |
  Round 5 — design-fidelity re-validation after implementation-06's
  fix round. Every blocker from round 4 closes:

  Per-screen counts: PASS 11 / PASS-with-caveat 0 / FAIL 0
    S1 catalog list, S2 song detail, S3 Mode scène, S4 setlist
    editor (sparkline above, drag handle left, side-gutter warnings),
    S5 sessions list (timeline rail restored), S6 session detail
    (venue H1 + friends-per-member hue bars), S7 bars (list +
    kanban), S8 admin (members + instruments + 5×5 mastery matrix
    with row/column averages), S9 app shell (six-link sidebar with
    badges + 375px slide-over), S10 energy primitives, S11 login.

  Eight prior blockers — all closed:
    0 dark-mode regression CLOSED — tokens.css rewritten: light
      values live in @theme, dark overrides on :root inside
      @media. light → rgb(244,239,230) (#f4efe6 cream paper);
      dark → rgb(22,19,15) (#16130f). Both verified.
    1 catalog chart-kind icons CLOSED — distinct icons per chart
      kind (chordpro/pdf/image) + italic "pas d'accord" fallback
      for null chart, verified across the six seeded songs.
    2 song detail read-only CLOSED — 0 inputs/textareas/selects;
      Lineup + 10-bar mastery viz + chord chart preview present.
    3 session detail read-only CLOSED — venue as H1, friends-
      per-member bars in member hues, Modifier behind a button.
    4 setlist editor CLOSED — drag handle in column 2 (left
      half), sparkline at top:650 above first row at top:763,
      two ⚠ markers in the left gutter (x=244) at the forced
      bad-transition pair, modal opens.
    5 Mode scène fullscreen CLOSED — no sidebar/topbar in DOM at
      /catalog/:id/scene; ESC navigates back.
    6 sidebar /setlists entry + badges CLOSED — 6 links
      (Catalogue 3 / Sessions 1 / Setlists 1 / Bars 5 / Membres /
      Instruments).
    7 mobile-nav fallback CLOSED — hamburger at 375px,
      slide-over reveals the six links, tap navigates.

  Non-regression sweep clean (login, auth, catalog list, kanban,
  i18n, admin pages, mastery matrix). Broken-image scan returns
  [] on every captured page.
artifacts:
  - docs/features/pragma/first-features/validation/visual-validation-2026-05-20-1645.md
  - docs/features/pragma/first-features/validation/screenshots-2026-05-20-1645/
next:
  kind: ship
---

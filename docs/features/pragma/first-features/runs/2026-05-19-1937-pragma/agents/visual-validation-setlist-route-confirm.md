---
status: PASS_EXCEPT_UNVERIFIABLE
summary: |
  Bundle propagation confirmed: new /assets/index-C5i0kKaZ.js (last-modified 2026-06-05T13:38:45Z) carries the three durable i18n tokens createForSession / missingSessionId / noSetlistYet. Deep-link /sessions/:id/setlist now resolves cleanly — wrapper renders "No setlist created for this session yet." with Create-CTA + Back link, no 404 / no auth bounce / no blank. Clicking Create mounts the editor in-place; adding Take Five round-trips through reload (entry persists with Energy slider + Drag/Edit/Remove buttons). FR localisation OK on both wrapper ("Aucune setlist créée pour cette session.", "Créer une setlist", "Retour") and editor ("ÉNERGIE", "Ajouter un morceau"). Non-regression sweep: sidebar nav surfaces 6 entries with live badge counts (PASS); auth-gate redirect is UNVERIFIABLE (HttpOnly cookie cannot be cleared from JS, agent-browser CLI has no incognito primitive); Mode Scène fullscreen+ESC is UNVERIFIABLE (no entry-point found from authed flow on session-detail / setlist-editor / /setlists routes, though bundle contains "fullscreen" + "Scene" tokens). 11 PASS, 2 UNVERIFIABLE, 0 FAIL. The setlist-route fix is confirmed shipped.
artifacts:
  - docs/features/pragma/first-features/validation/visual-validation-setlist-route-confirm-2026-06-05.md
  - docs/features/pragma/first-features/validation/screenshots-setlist-route-confirm-2026-06-05/
next:
  kind: ship
---

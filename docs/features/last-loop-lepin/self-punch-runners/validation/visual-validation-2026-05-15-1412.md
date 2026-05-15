# Visual-validation report — self-punch-runners

- **Spec**: [`docs/features/last-loop-lepin/self-punch-runners/spec/spec.md`](../spec/spec.md)
- **Run timestamp**: 2026-05-15-1412
- **Dev URL**: `http://localhost:5173/`
- **Evidence folder**: [`visual-validation-2026-05-15-1412/`](./visual-validation-2026-05-15-1412/)
- **Branch base**: `claude/fix-dnf-validation-NIGKH` @ `a03d6f8`

## Verdict

**PASS**

Every input metric named under *Why* in the spec was exercised against the running app, the DB confirmed each persistent side-effect, and `fetch` interception confirmed each "no API call" guarantee.

## Assertions

| # | Assertion (from spec) | Result | Evidence |
| - | --- | --- | --- |
| 1 | Tap on a running chip opens the confirmation modal with the correct name + loop number. | PASS | Tapped Alice's chip (`lastLoop=3`, in-race). Modal body text: `"Je suis Alice, valider la boucle 4 ?"` ([`01-confirm-modal-alice-loop4.png`](./visual-validation-2026-05-15-1412/01-confirm-modal-alice-loop4.png)). |
| 2 | Tap on a DNF chip opens the "déjà éliminé" modal, no `/api/self-punches` call observed. | PASS | Tapped Dan (`status=dnf`). Modal text: `"Ce coureur est déjà éliminé — adresse-toi à l'organisation si tu veux être réintégré."`. `window.fetch` was wrapped before the tap; the captured-fetches array contained only `/api/standings/...` polls — no `/api/self-punches` ([`04-dnf-already-eliminated-modal.png`](./visual-validation-2026-05-15-1412/04-dnf-already-eliminated-modal.png)). |
| 3 | "Je suis là" triggers `navigator.geolocation.getCurrentPosition`. | PASS | Stubbed `navigator.geolocation.getCurrentPosition` via `Object.defineProperty`. After clicking "Je suis là", the stub was invoked (success/error callback fired) and the modal transitioned away from "confirm". Same mechanism worked across in-zone, out-of-zone, and permission-denied flows. |
| 4 | In-zone (`distance < 100 m`) position writes a punch with `source='self'` + coordinates; standings reflect the new loop. | PASS | Mocked position `(45.5501, 5.7801)` (haversine ≈ 13 m from geofence center `(45.55, 5.78)`). Modal showed `"Boucle 4 validée !"` ([`02-success-loop4-validated.png`](./visual-validation-2026-05-15-1412/02-success-loop4-validated.png)). DB row inserted: `runner_slug=alice, loop_index=4, source=self, client_lat=45.5501, client_lng=5.7801, distance_from_center_m=13.57489417975821`. Standings repoll: Alice `status.lastLoop=4`. |
| 5 | Out-of-zone (`distance ≥ 100 m`) shows the "hors zone" modal with measured distance, no DB write. | PASS | Mocked position `(45.553, 5.785)` (haversine ≈ 513 m from center). Modal text: `"Tu es à 513 m du point de pointage. Le pointage n'est possible qu'à moins de 100 m."` ([`03-out-of-zone-modal.png`](./visual-validation-2026-05-15-1412/03-out-of-zone-modal.png)). DB after the attempt: 7 admin punches, 0 self punches (re-seeded fixture had only admin punches) — confirmed via `SELECT COUNT(*), source FROM loop_punches`. |
| 6 | Permission denied shows the reactivation guide. | PASS | Stubbed `getCurrentPosition` to call `error({ code: 1, … })`. Modal text: `"Active la localisation pour pointer. Active la localisation dans les réglages du navigateur. Réessayer"`. The hint text is the generic-browser branch (Chromium UA, neither iPhone nor Android), which is the spec's fall-through case. The "Réessayer" button is present and clickable ([`05-permission-denied-with-guide.png`](./visual-validation-2026-05-15-1412/05-permission-denied-with-guide.png)). |

## Notes

- The geofence center read by the app matches `edition.gpx.startLatLng` (`{lat:45.55, lng:5.78}`), per the DTO returned by `/api/editions/lepin-2026`.
- The server's recomputed distance (13.57 m, persisted to `distance_from_center_m`) matches the client-side haversine within rounding — confirms the double-check architecture (Q.O.D. item "Où valide-t-on la géofence ?").
- The reactivation hint is browser-conditional: spec lists Safari iOS, Chrome Android, and a generic fallback. Only the generic fallback was exercisable in this Chromium-on-Linux run. The iOS/Android branches are exercised only by `SelfPunchModal.utils.test.ts` (FSM-level) and would need a UA override to trigger visually; that's a follow-up beyond the spec's visible-result contract.
- No deviation from the spec observed.

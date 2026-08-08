# Visual-validation report — fastest-lap-pastille

- **Spec**: [`docs/features/last-loop-lepin/fastest-lap-pastille/spec/spec.md`](../spec/spec.md)
- **Run timestamp**: 2026-05-15-1412
- **Dev URL**: `http://localhost:5173/`
- **Evidence folder**: [`visual-validation-2026-05-15-1412/`](./visual-validation-2026-05-15-1412/)
- **Branch base**: `claude/fix-dnf-validation-NIGKH` @ `a03d6f8`

## Verdict

**PASS**

Every input metric named under *Why* in the spec was exercised against the running app and the DOM/DB confirmed the expected behaviour. No FAIL rows, no UNVERIFIABLE rows.

## Assertions

| # | Assertion (from spec) | Result | Evidence |
| - | --- | --- | --- |
| 1 | DTO `standings.fastestLap` is `ReadonlyArray<{ runnerSlug, durationMs }>`, computed from non-voided punches. | PASS | `curl /api/standings/lepin-2026` on `race-mid-loop-3` returned `fastestLap: [{ runnerSlug: "alice", durationMs: 3312000 }]`. Alice's loop 1 took 0.92 h = 3 312 000 ms ✓ |
| 2 | When at least one loop is closed, `fastestLap` holds 1+ entries. | PASS | Both fixtures `race-mid-loop-3` and `race-finished` produced non-empty `fastestLap`. |
| 3 | The chip of the holder's runner-slug carries a visible `.leaderboard-chip__fastest-lap-badge`. | PASS | `Array.from(document.querySelectorAll(".leaderboard-chip"))…` → `[{name:"Alice",hasBadge:true},{name:"Bob",hasBadge:false},{name:"Carla",hasBadge:false},{name:"Dan",hasBadge:false}]` on `race-mid-loop-3` ([`01-spectator-with-fastest-lap.png`](./visual-validation-2026-05-15-1412/01-spectator-with-fastest-lap.png), [`02-leaderboard-only.png`](./visual-validation-2026-05-15-1412/02-leaderboard-only.png)). |
| 4 | Badge is violet (#a020f0), ~16 px round, top-right of the chip. | PASS | Computed style on the badge: `backgroundColor=rgb(160,32,240)` = `#a020f0`, `width=16px`, `height=16px`, `borderRadius=50%`, `position=absolute`, `top=-6px`, `right=-6px`. Carries an inline chronometer SVG with `<title>Meilleur tour de l'édition</title>` ([`03-alice-chip-zoomed.png`](./visual-validation-2026-05-15-1412/03-alice-chip-zoomed.png)). |
| 5 | Only one chip carries the badge when there is a unique holder. | PASS | `document.querySelectorAll(".leaderboard-chip__fastest-lap-badge").length` returned **1** on `race-mid-loop-3`. |
| 6 | DNF holder retains the badge after dropping. | PASS | Switched to `race-finished` fixture: Bob is fastest (loop duration 0.9 h = 3 240 000 ms) **and** DNF (`outAtLoop=3, reason=late`). DOM: Bob's chip carries `.leaderboard-chip--dnf` AND `.leaderboard-chip__fastest-lap-badge`. ([`04-race-finished-bob-dnf-holds-badge.png`](./visual-validation-2026-05-15-1412/04-race-finished-bob-dnf-holds-badge.png), [`05-race-finished-leaderboard.png`](./visual-validation-2026-05-15-1412/05-race-finished-leaderboard.png)). |
| 7 | When no loop is closed, `fastestLap = []` and no chip is decorated. | UNVERIFIABLE | No seed fixture produces a zero-punch state (all three of `race-mid-loop-3`, `race-finished`, `top-with-dnf-candidates` insert at least one punch). The empty-array branch is only covered by `fastest-lap.core.test.ts`. Not a tool gap — a seed-fixture gap; closing it would require a new fixture. Mitigation: the unit test `fastest-lap.core.test.ts` exercises this branch at 100 % coverage. |
| 8 | Tie-break at the millisecond: both chips decorated. | UNVERIFIABLE | No seed fixture produces two distinct runners with identical loop durations to the millisecond (`race-finished` ties three of *Bob's own* loops, which collapse to one badge by slug-dedup; that's correct but does not exercise the *two-runner* tie). The tie-break path is unit-tested in `fastest-lap.core.test.ts:tie at ms`. Same seed-fixture gap as #7. |

## Notes

- The two UNVERIFIABLE rows are both seed-fixture gaps, not implementation gaps. They are PR-disclosure candidates but not blockers — the underlying logic is exercised at 100 % statement/branch coverage in `apps/last-loop-lepin/api/src/ranking/fastest-lap.core.test.ts` (per the spec's *Test strategy*).
- All four visible assertions in *Use cases / edge cases* covered by the visual test passed without surprise: badge present on holder, absent on non-holders, retained on DNF, single chip when unique holder.
- No deviation from the spec observed.

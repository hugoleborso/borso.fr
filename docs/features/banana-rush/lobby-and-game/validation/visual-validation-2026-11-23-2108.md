# Visual validation — Banana Rush: play a round of Guts with friends from a phone

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5175/
- Run at: 2026-11-23T21:11:16Z
- Tooling: agent-browser 0.41.2
- Scope: only the edge case *A player closes their phone mid game.*

Setup. Two browser sessions at 375 × 812. The host created game `CPMQ` with two seats, a 10 s timer and a target of 200. The guest ran with a persistent profile directory (`--profile <scratchpad>/guest-profile`). Closing that browser therefore drops the page and its WebSocket and keeps `localStorage`, the way a phone does when it is closed. The guest joined as *Guesto* and the host started the game. The guest browser was closed during round 1 at 21:09:13 UTC.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | Edge case | Their seat stays. | Close the guest browser mid game, then read the host table during rounds 1 to 3. | `./visual-validation-2026-11-23-2108/01-guest-in-game-before-close.png` (before), `./visual-validation-2026-11-23-2108/02-host-sees-closed-guest-bid-filled.png` (Guesto still at the table while closed) | PASS |
| 02 | Edge case | Their stash stays. | Follow Guesto's stash on the host screen while closed. | Host text went `Guesto 10` → `15 +5` (round 1 split) → `19 +4` (round 2 tariff). `./visual-validation-2026-11-23-2108/02-host-sees-closed-guest-bid-filled.png` | PASS |
| 03 | Edge case | Their bids keep being filled by the timer. | Host leaves round 1 empty, then bids 5 in round 2. The guest is closed in both. | Round 1 reveal: `Hostie 1 15 +5`, `Guesto 1 15 +5`. Round 2 reveal: `Hostie 5 26 +11 CRATE`, `Guesto 1 19 +4 TARIFF`. That is a tariff of 5 − 1 = 4, so the closed player was entered at 1. `./visual-validation-2026-11-23-2108/02-host-sees-closed-guest-bid-filled.png` | PASS |
| 04 | Edge case | Reopening the address restores them from the token held in local storage. | Relaunch the guest browser on the same profile, open `/partie/CPMQ`. | `banana-rush.seats` still held `{"CPMQ":{"playerId":"e2adcd73-…","playerToken":"125fc0ed-…"}}`. The page opened straight on round 4 with the bid pad and `Guesto 32`, with no join form. `./visual-validation-2026-11-23-2108/03-guest-restored-after-reopen.png` | PASS |
| 05 | Edge case | The restored phone acts as that same player. | The restored guest bids 7 in round 7 while the host is filled at 1. | `POST /api/games/CPMQ/bids` 200. The guest screen showed `YOUR BID 7`. Then both screens showed `GAME OVER Guesto wins the game, Guesto 247, Hostie 136` = 123 + 130 crate − 6 tariff, and 130 + 6. `./visual-validation-2026-11-23-2108/04-restored-guest-bid-counts-as-guesto.png` | PASS |
| 06 | Edge case | A seat for one game that an older build stored in a shape this one no longer reads costs only that game. | The guest sat in two more lobbies, `7PU7` and `7M35`. I rewrote only the `7PU7` entry as `{"id":…,"token":…}`, closed the browser, reopened and opened `/partie/7PU7`. | The page shows the *Join 7PU7 / Take a seat* form. The seat is lost and nothing crashed: `errors` is empty. `./visual-validation-2026-11-23-2108/05-old-shape-7PU7.png` | PASS |
| 07 | Edge case | The seats of every other game on the phone still restore. | Same relaunch. Open `/partie/7M35` and `/partie/CPMQ`. | `7M35` opens in the waiting room as the seated `Guest7M35`, with *Waiting for the host to start the game* and no join form. `CPMQ` opens on Guesto's final table with *Rematch*. `./visual-validation-2026-11-23-2108/05-old-shape-7M35.png`, `./visual-validation-2026-11-23-2108/05-old-shape-CPMQ.png` | PASS |
| 08 | Test strategy (1280 px) | The restore also holds at desktop width. | Set the viewport to 1280 × 800 and reopen `/partie/7M35`. | The seat restores. `scrollWidth` = 1280, so there is no horizontal overflow. `./visual-validation-2026-11-23-2108/06-restored-seat-1280.png` | PASS |

I ran the broken-image scan after every screenshot. It returned `[]` each time.

## Notes

- No FAIL or UNVERIFIABLE rows.
- The tool and the spec disagree in two places, and neither is an app defect. First, `agent-browser find role button click --name "Bid"` printed `Done` but sent no request. That cost round 5. A DOM `element.click()` through `eval` submitted the bid. Second, the create screen offers timers of 5, 10, 15, 30 and 60 s and ∞, where the Result section lists 30 s, 60 s or none. That is outside this scope, and is recorded here only so another validator does not trip on it.
- I simulated a closed phone by closing a Chromium that uses a persistent profile, not on a real device. Background suspension of a real phone's tab was not exercised.

## Verdict: PASS

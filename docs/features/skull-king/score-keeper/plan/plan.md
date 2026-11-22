# Plan — Skull King score keeper

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, didn't name the risk at all (planning gap), or named it correctly and the defect comes from elsewhere.

The app is a copy of banana-rush's shape with its game logic removed. The plan names where each spec decision lands in `apps/skull-king/`, and what breaks if it slips.

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Rules | Score derived, never stored | `domain/scoring.core.ts` `scoreEntry`, read by the API view and every screen | No `points` column in any migration: `grep -n points api/src/database/migrations/*.sql` prints nothing |
| Rules | Cards dealt `min(N, floor(70 / players))` | `domain/round.core.ts` `selectCardCount`, the API sets `cardCount` on each round of the view | Unit test pins 8 players in rounds 9 and 10 |
| Results | Made is the default, `tricks: null` | `round_entry.tricks` nullable; `selectTricksTaken` reads null as the bid | e2e reads an unwritten cell as `{ bid: null, tricks: null }` |
| Results | Trick tally with Kraken | `domain/round.core.ts` `tallyTricks`, footer of the results screen | Unit tests for incomplete, balanced, unbalanced, kraken |
| Data shape | Natural keys, no unique index, no foreign key | `api/src/games/games.schema.ts`: pk (`game_id`, `round_number`, `player_id`) on `round_entry`, `join_code_claim` keyed on the code | Migration holds no `UNIQUE INDEX` and no `REFERENCES` |
| API | Each write answers the view, then broadcasts it | `games.service.ts`: write, read the view on the same connection, `broadcastGame` | e2e asserts the body of every write is a full `GameView` |
| API | `PUT /phase` sets a target | `games.service.ts` `moveToPhase`; refuses `finished` before round 10 | e2e: two identical calls leave one state |
| API | Bounds depend on the game | Zod holds types and static bounds; the service checks `bid` and `tricks` against `selectCardCount` | e2e: `bid` above the cards dealt answers `value-out-of-range` |
| Sync | Socket pushes, never commands | `api/src/realtime/` kept from banana-rush, `$connect` needs only `code` | `socket-route.core.test.ts` refuses a connect without `code` |
| Sync | Newest view wins on the phone | `site/src/lib/game-view.core.ts` (or the name the site agent chose) compares `readAt`; the socket hook and every mutation's `onSuccess` go through it | Unit test: an older `readAt` leaves the cache untouched |
| Screens | Query routing, `/?game=CODE` | `site/src/App.tsx` reads `useSearchParams` | A preview deep link `/?game=BRIG&view=scores` opens the scores screen |
| Screens | Official card images | `site/public/cards/*.jpg`, one constant table maps `BonusKind` to its file | `ls site/public/cards` matches `BONUS_KINDS` plus `kraken` |
| Registration | New app known to CI | `.github/path-filters.yml`, commitlint, knip, Sentry DSN in both workflows, quality dashboard, prod reader | `scripts/check-app-registration.sh` passes |
| CDK | Bucket name free of collisions | `cdk/lib/stack.ts` `frontend.bucketNameSuffix: 'account'` | Same check script |

Pattern coherence. banana-rush keeps the private part of a broadcast (`viewerBid`) and merges it. This app has no private part, so the merge becomes the `readAt` comparison and nothing else. The player token, bearer middleware and seat claims are dropped, not inherited.

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| Two phones write the same cell together | Low | Last write wins on one primary key row; both phones settle on the last broadcast | e2e writes the same cell twice and reads the second value |
| Two phones write different cells of one round | High if lost | Different rows, upserts touch only their own row; no write to the `game` row on a cell write, so DSQL optimistic concurrency has nothing to conflict on | e2e writes two cells in parallel and reads both |
| A late broadcast undoes a newer view | Medium | `readAt` comparison on the phone | Unit test of the comparison; visual check of two tabs tapping fast |
| DSQL read-after-write is per connection (`docs/knowledge/dsql-strong-consistency-is-per-connection.md`) | Medium | The view returned and broadcast is read inside the write's repository call, on the same connection; the site settles from the response, never refetches after a write | e2e on local Postgres cannot show it; Sentry and the preview do |
| `readAt` from two Lambdas' clocks | Low | Clock skew between Lambdas is small against human tap speed | A reverted tap reported from the table |
| Preview serves `/` only for this app, no SPA rewrite (`infra/cdk/src/internal/cf-host-routing-function.code.js`) | High | Query routing, no path routes; no change to `infra/` or `infra/shared` | Opening a shared invite link on the preview |
| Preview API is cross-origin (`docs/knowledge/preview-api-cross-origin.md`) | Medium | `api.client.ts` reads `VITE_API_BASE` as banana-rush does; `cors()` kept in `app.ts` | First write on the preview |
| Copied `@Blueprint` declarations collide with banana-rush | Low | Every copied declaration becomes `@FollowsBlueprint` | Pre-commit `blueprint-index` refuses the commit |
| Card images are the publisher's art | Product | Private site for friends, stated in the spec | The operator's answer |
| Eight players fill a 375 px row of chips | Medium | Chips 0 to 8 wrap or shrink to 36 px; touch targets stay at 44 px height | `/visual-validation` at 375 px with eight players |

## Code-quality self-check

- [x] Type-assertion plugin satisfied (only `as const`, `as unknown` allowed in this repo).
- [x] No `any`.
- [x] No abbreviations or single-letter locals outside trivial loop indices.
- [x] Magic numbers / strings extracted to named constants (bonus points, deck size, round count in `domain/`).
- [x] No prose comments.
- [x] Function names describe the result, not the mechanism.

## Pre-flight gates

Run, in order, before push:
1. `pnpm --filter @borso-app/skull-king run build`.
2. `pnpm --filter @borso-app/skull-king run test:e2e` (CI runs it; the hooks do not).
3. `scripts/dev-server.sh start skull-king`, then `/visual-validation docs/features/skull-king/score-keeper/spec/spec.md`.
4. `/technical-validation docs/features/skull-king/score-keeper/spec/spec.md`.

## Open questions / unknowns

- Card images. The rulebook crops (240 px) were replaced by straightened BoardGameGeek photos at 430x600, all seven cards.
- Regulars kept per phone in localStorage. A phone that never created a game shows none.

## Missing technical skills

- A skill or script that creates a new full-stack app from the banana-rush shape (copy, rename, strip, register). Logged with `scripts/kaizen.sh`.

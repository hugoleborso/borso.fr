# Technical validation — Each member signs in as themselves and the band picks its next setlist by vote

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: `claude/setlist-voting-feature-84f01u`
- Base: `origin/main`
- Run at: 2026-09-14T20:50:00Z
- Touched workspaces: `@borso-app/pragma` (api, site, cdk). `infra/cdk` and `infra/shared` untouched, as the spec predicted.

The spec routes five happy-path steps and four visible edge cases to `/visual-validation`
(budget bar reaching zero, a song added mid-vote, the tie at the boundary, reopening), plus
the argent swipe pass. **9 use cases routed to /visual-validation; out of scope for this
report.** Category A still checks that the *code* implementing them exists, because a screen
cannot be validated visually if nothing was written.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Q.O.D. "What happens to the shared password?" — replace it | One gate, shared password survives on enrolment only | `api/src/auth/member-session.middleware.ts:19` | `export const requireMemberSession: MiddlewareHandler = async (context, next) => {` ; `shared-password.middleware.ts` is deleted in the diff and `grep requireSharedPasswordSession` returns nothing | PASS |
| A02 | Plan self-check "401 on every router" | Every slice router applies the gate | `bars/…:10`, `songs/…:27`, `setlists/…:46`, `me/…:31`, `members/…:22`, `sessions/…:15,24`, `instruments/…:19`, `mastery/…:23`, `transitions/…:15`, `uploads/…:10` | `.use('*', requireMemberSession)` on all ten routers; only `publicRouter` and `bootstrapRouter` stay open | PASS |
| A03 | Q.O.D. "Every member is admin" | No role column, no check | — | `grep -rn "isAdmin\|role"` over the diff finds no role column and no gate | PASS |
| A04 | Q.O.D. "Passkeys now, alternative single factor" | Password fallback stays, passkey is a second path | `auth/auth.controller.ts:47,95,100` | `.post('/login', zValidator('json', memberLoginSchema)` beside `.post('/passkey/authentication/options'` and `'/passkey/authentication/verify'` | PASS |
| A05 | Result §API surface | `POST /api/auth/{enrol,login}`, passkey auth routes, `GET /api/me`, `PUT /api/me/password`, `GET\|DELETE /api/me/passkeys` | `me/me.controller.ts:32,37,61,64,69,82`; `auth/auth.controller.ts:47,66,71,95,100` | every named route resolves; **deviation:** passkey *registration* landed as `POST /api/me/passkeys/options` + `POST /api/me/passkeys` rather than `/api/auth/passkey/registration/*`, which is the session-gated placement (see Notes) | PASS |
| A06 | Q.O.D. "Point budget, 3 × target, capped at 3 per song" | Budget arithmetic and the per-song cap | `api/src/setlists/voting.core.ts:1,35`; `setlists.schema.ts` (`MAX_POINTS_PER_SONG`) | `export const POINTS_PER_TARGET_SONG = 3;` ; `const total = resolveTargetSongCount(targetSongCount) * POINTS_PER_TARGET_SONG;` ; `points: z.number().int().min(0).max(MAX_POINTS_PER_SONG)` | PASS |
| A07 | Q.O.D. "Must the budget be spent? No" | Nothing normalises, nothing blocks closing | `voting.core.ts` `tally`, `voting.service.ts` `readClosingProposal` | `tally` sums what exists; closing refuses only on `tallies.length === 0` (`no-votes`) | PASS |
| A08 | Q.O.D. "Everything visible live, including who gave what" | Tally carries `pointsByMember` | `voting.core.ts:69–80` | `pointsByMember: running.pointsByMember` with `voterCount: Object.keys(running.pointsByMember).length` | PASS |
| A09 | Q.O.D. "Propose top N plus ties" | Boundary ties extend the proposal | `voting.core.ts:97–103` | `const boundaryPoints = ranked[target - 1]?.points;` / `return ranked.filter((entry, index) => index < target \|\| entry.points === boundaryPoints);` | PASS |
| A10 | Q.O.D. "A status on the existing setlist; null reads as locked" | Two nullable columns, resolver | `setlists.core.ts:67–68`; `setlists.schema.ts:9–10` | `return stored === SETLIST_VOTING ? SETLIST_VOTING : SETLIST_LOCKED;` ; `status: text('status'), targetSongCount: integer('target_song_count')` | PASS |
| A11 | Changes §Database — DSQL grammar | `ADD COLUMN name type` only, constraints on fresh tables, no `jsonb` | `api/src/database/migrations/0004_member_accounts_and_votes.sql:20,22` | `ALTER TABLE "setlist_sheet" ADD COLUMN IF NOT EXISTS "status" text;` — every constraint and index lands on a `CREATE TABLE`; all five spec'd tables/indexes present, `bytea` used for `public_key` | PASS |
| A12 | Q.O.D. "Reopening a locked setlist keeps the votes" | Status write only | `voting.service.ts` `setVoteStatus` | `const updated = await updateVoteStatus(params.setlistId, params.status, target);` — nothing deletes `setlist_vote` | PASS |
| A13 | Q.O.D. "A deleted member's votes are deleted in the same transaction" | Inside `deleteMemberWithLinks` | `members/members.repository.ts:99–100` | `await deleteCredentialsOfMember(transaction, id);` / `await deleteVotesOfDeletedMember(transaction, id);` inside the existing `transaction` block | PASS |
| A14 | Edge "Deleting a song deletes its votes" | Added to the song cascade | `songs/songs.repository.ts:242` | `await deleteVotesOfDeletedSong(database, id);` beside the mastery-override and setlist-entry deletes | PASS |
| A15 | Q.O.D. "Three zones on the right, bottom 1, middle 2, top 3, filling during the drag" | Pure zone maths | `site/src/routes/setlists/vote-deck.core.ts:44–56,58–67` | `if (clampedRow === TOP_ROW) return 'three';` … `if (clampedRow === MIDDLE_ROW) return 'two'; return 'one';` and `selectZoneStrength` returning `Math.min(travelled / commitDistance, 1)` | PASS |
| A16 | Result §4 "the right zones stop accepting" + exact string | Refusal and the i18n message | `vote-deck.core.ts:75` ; `site/src/i18n/fr.json:379` | `if (points > remainingPoints) return { kind: 'refused' };` ; `"budgetExhausted": "Plus de points ! Enlève des points aux autres chansons pour continuer de liker."` — present in `en.json` too | PASS |
| A17 | Result §5 "each row removable, addable and draggable" + happy path 5 "adds one" | Closing panel lets the band add a song outside the proposal | `site/src/components/organisms/VoteClosePanel.tsx:19–23,69–92` | only `moveWithin` (up/down) and a `filter` removal exist; no picker, and a removed song cannot be put back — `voting.closeSubmit`, `removeFromProposal`, `moveUp`, `moveDown` are the only actions in the i18n `voting` block | **FAIL** |
| A18 | Edge "the vote screen marks it as new for a member who has already been through the deck" | New-song marker on the deck | `SetlistVotePage.tsx`, `VoteDeck.tsx`, `vote-deck.core.ts` | no marker anywhere: `grep -n "isNew\|markNew\|freshSong\|newSong"` over the diff returns nothing, and the `voting` i18n block has no such key. The song *is* votable (`songs: readonly DeckSong[]` comes from the live `useSongsList`), so only the marking half is missing | **FAIL** |
| A19 | Error cases table | `budget-exhausted` with remaining, `not-voting`, `no-votes`, `already-enrolled`, `enrolment-closed`, `session-invalid` | `voting.service.ts` `ScoreOutcome`/`ProposalOutcome`/`CloseOutcome`; `member-session.middleware.ts:30,36` | `return { kind: 'budget-exhausted', budget: verdict.budget };` ; `if (resolveSetlistStatus(setlist.status) !== SETLIST_VOTING) return { kind: 'not-voting' };` ; `return context.json({ error: 'session-invalid', reason: verdict.kind }, 401);` | PASS |
| A20 | Changes §Vocabulary — five new terms, "account" un-forbidden | `apps/pragma/VOCABULARY.md` | sections at lines 33 (`## Member credential`), 198 (`## Passkey`), 286 (`## Setlist status`), 385 (`## Vote budget`), plus `## Vote` | PASS |
| A21 | Plan — relying-party id per stage | `auth.environment.ts` | `api/src/auth/auth.environment.ts` (new file in the diff), consumed by `passkey.adapter.ts` | PASS |
| A22 | Plan — "Scoring is optimistic, no invalidation" | `onMutate` + reconcile from the response | `site/src/lib/queries/voting.queries.ts:51,55,64,70` | `onMutate: async (variables) =>` … `queryClient.setQueryData<VoteBoard>(boardKey, { ...current, budget: confirmed.budget });` — no `invalidateQueries` on that mutation; `borso/no-refetch-of-optimistically-written-query` passes | PASS |
| A23 | Changes §Files to change — front-end file list | Five new components + three routes | `atoms/PointsBadge.tsx`, `molecules/VoteBudgetBar.tsx`, `organisms/{VoteDeck,VoteTally,VoteClosePanel}.tsx`, `routes/{EnrolPage,account/AccountPage,setlists/SetlistVotePage}.tsx` all added; `LoginPage.tsx` and `SetlistEditorPage.tsx` updated | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | `grep -nE '\b(const\|let) [a-z] ='` on every changed `.ts`/`.tsx` | none found; the code reads `running`, `candidate`, `clampedRow`, `boundaryPoints`, `votesOfMember`, `budgetOnOtherSongs` | PASS |
| B02 | ESLint clean (the repo's linter; the template's Biome line is stale, as the plan notes) | `pnpm --filter @borso-app/pragma run lint` | exit 0, no findings (one unrelated multi-tsconfig perf warning) | PASS |
| B03 | Magic numbers named | read of `voting.core.ts`, `vote-deck.core.ts`, `setlists.schema.ts` | `POINTS_PER_TARGET_SONG`, `DEFAULT_TARGET_SONG_COUNT`, `MAX_POINTS_PER_SONG`, `TARGET_SONG_COUNT_{MIN,MAX}`, `COMMIT_RATIO`, `ZONE_COUNT`, `SCORING_TINT_AT_FULL_TRAVEL`, `DEGREES_PER_PIXEL`, `TOP_ROW`/`MIDDLE_ROW`/`LAST_ROW`, `FIRST_SUFFIX` | PASS |
| B04 | No comments in code | `grep -n '^\s*//'` minus the machine-read annotations | zero. What remains is `@FollowsBlueprint`, `@Blueprint`, `@Feature`, `@DependsOnExternal` and two `Stryker disable next-line` directives that each carry an equivalent-mutant reason | PASS |
| B05 | Function names describe the result | read of the new cores | `resolveSetlistStatus`, `judgeScore`, `proposeClosing`, `selectZoneForOffset`, `judgeRelease`, `selectEnrolmentWindow`, `readVoteBoard` — no `handleX` / `processX` | PASS |
| B06 | Type assertions restricted to `as const` / `as unknown` | `grep -nE '\bas [A-Z]'` on changed files | one hit, `import type { … PointerEvent as ReactPointerEvent }` — an import alias, not an assertion. No `as Foo`, no chained cast | PASS |
| B07 | No `any` | `grep -nP '(:\|<)\s*any\b'` on changed files | none found | PASS |
| B08 | `noUncheckedIndexedAccess` honoured | read of every indexed access in the new code | `ranked[target - 1]?.points`, `songs[cardIndex]` guarded by `song !== undefined`, `pointsBySongId[songId] ?? 0`, `const [moved] = …; if (moved === undefined) return reordered;` — typecheck exits 0 under the flag | PASS |
| B09 | `useEffect` is a smell | `grep -n 'useEffect('` on every changed `.ts`/`.tsx` | **zero effects in the whole diff.** The deck drives its drag from Pointer Event handlers and `useState`; server state is TanStack Query | PASS |
| B10 | Controllers dispatch, don't work | read of `setlists.controller.ts` vote routes and `me.controller.ts` | each handler is validate → call service → map outcome to status; no `.filter`/`.map`/`.reduce` over domain data | PASS |
| B11 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 (`tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit`) | PASS |
| B12 | Dead code | `pnpm exec knip` at the repo root | exit 0; the `@simplewebauthn` packages resolve to the adapter only | PASS |
| B13 | Build | `pnpm --filter @borso-app/pragma run build` | exit 0 (one preexisting >500 kB chunk-size warning) | PASS |
| B14 | Pure logic in a `.tsx` | read of `VoteClosePanel.tsx:19` | `moveWithin` is a pure, untested helper living in an organism. Consistent with the app's established shape (`SetlistEntriesList.songDefaultsOf`, `SetlistCatalogList.describeSessions`), so not a new violation — noted, not failed | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | `@borso-app/pragma` | `pnpm --filter @borso-app/pragma run test:core` | 0 — 128 files, 1321 tests | PASS |
| C02 | `@borso-app/pragma` | coverage gate inside `test:core` | 0 — statements 1973/1973, branches 973/973, functions 505/505, lines 1687/1687, all 100% | PASS |
| C03 | `@borso-app/pragma` | `pnpm --filter @borso-app/pragma run test` (back-e2e on the sandbox Postgres) | 0 — 16 files, 102 tests | PASS |
| C04 | `@borso-app/pragma` | every `*.utils.ts` has a sibling `*.utils.test.ts` | enumerated across the workspace: no file missing its test | PASS |
| C05 | `infra/cdk`, `infra/shared` | not touched by the diff | — | PASS (n/a) |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Enrolment claims a member and signs them in | `it('enrols a member with the shared password and signs them in')` — `api/src/auth/auth.controller.test.ts:45` | PASS |
| D02 | Error: `enrolment-closed` once everyone holds a credential | `it('closes the enrolment window once every member holds a credential')` — `auth.controller.test.ts:64` | PASS |
| D03 | Error: `already-enrolled` | `it('refuses a second enrolment of the same member')` — `auth.controller.test.ts:77` | PASS |
| D04 | Username collision (plan's open question) | `it('refuses a username another member already holds')` — `auth.controller.test.ts:86` | PASS |
| D05 | Login by member + wrong password | `it('logs a member in by username and refuses the wrong password')` — `auth.controller.test.ts:94` | PASS |
| D06 | Rate limiting survives the rewrite | `it('rate-limits after 5 attempts in 15 min on the same ip')` — `auth.controller.test.ts:103` | PASS |
| D07 | Error: a pre-change cookie is `session-invalid` | `it('refuses a cookie carrying no member, which is the shape issued before accounts existed')` — `auth.controller.test.ts:128` | PASS |
| D08 | Edge: changing a password drops that member's other browsers only | `it('changes a password, keeps that member signed in here and drops their other browsers')` — `auth.controller.test.ts:148` and `it('leaves another member signed in when one member changes their password')` — `:176` | PASS |
| D09 | Every router is gated | `it('gates a protected route on the member session cookie')` — `auth.controller.test.ts:116` | PASS |
| D10 | A setlist never voted on reads as `locked` | `it('reads a setlist that was never voted on as locked')` — `api/src/setlists/voting.controller.test.ts:83` | PASS |
| D11 | Open a vote, score, budget reported | `it('opens a vote, scores songs and reports the budget that is left')` — `voting.controller.test.ts:98` | PASS |
| D12 | Error: `budget-exhausted` carries the remainder | `it('refuses a score beyond the budget and says what is left')` — `voting.controller.test.ts:112` | PASS |
| D13 | Rescoring a song to zero takes it off | `it('takes a song back off when it is scored zero')` — `voting.controller.test.ts:125` | PASS |
| D14 | Everything visible, including who gave what | `it('shows every member who scored, and what they gave')` — `voting.controller.test.ts:140` | PASS |
| D15 | Error: `not-voting` on a score | `it('refuses a score on a setlist that is not in its voting phase')` — `voting.controller.test.ts:160` | PASS |
| D16 | Error: `no-votes` on a close | `it('refuses to propose a closing when no song scored')` — `voting.controller.test.ts:172` | PASS |
| D17 | Ties at the boundary are all proposed | `it('proposes the top songs plus everything tied at the boundary')` — `voting.controller.test.ts:181` | PASS |
| D18 | Closing writes entries in the order handed and locks | `it('closes a vote into an ordinary setlist, in the order it was handed')` — `voting.controller.test.ts:203` | PASS |
| D19 | Reopening keeps every point | `it('reopens a closed vote with every point still posted')` — `voting.controller.test.ts:232` | PASS |
| D20 | A deleted member takes their votes | `it('deletes the votes of a member with the member')` — `voting.controller.test.ts:256` | PASS |
| D21 | A deleted song takes its votes | `it('deletes the votes of a song with the song')` — `voting.controller.test.ts:277` | PASS |
| D22 | Swipe zone boundaries, dead zone, clamping, gradient, exhausted state | 20 cases in `site/src/routes/setlists/vote-deck.core.test.ts`, e.g. `it('splits the right side into three rows, three points at the top')` (:33), `it('refuses a zone the budget cannot pay for')` (:67), `it('fills only the zone under the thumb, and fills it as the drag travels')` (:52) | PASS |
| D23 | Session payload encode/decode, epoch mismatch, unknown member | `member-session.core.test.ts` (in the 100%-covered set alongside `enrolment.core.test.ts`, `voting.core.test.ts`, `setlist-*.core.test.ts`) | PASS |
| D24 | i18n parity for every new string | `i18n-parity.core.test.ts`, extended in the diff | PASS |
| D25 | Adding a song back into the closing proposal | (none found — the behaviour does not exist; see A17) | **FAIL** |
| D26 | A song added mid-vote is marked new for a member who finished the deck | (none found — the behaviour does not exist; see A18) | **FAIL** |

## Notes

- **A17 / D25 — the closing panel cannot add a song.** The spec's *Result* §5 and happy-path step 5 both say the proposal rows are "removable, addable and draggable" and that the member "removes two, **adds one**, drags the order". `VoteClosePanel.tsx` implements removal (`keptSongIds.filter(...)`) and reordering (`moveWithin`) but has no song picker, and a removed row cannot be restored without reloading the page. Partial mitigation: once closed, the setlist is ordinary and `SetlistEditorPage` can add songs — but that is a second screen and a second write, not what the spec describes. Fix: reuse `SetlistSongPicker` inside the panel, with a unit test on the add/remove/reorder reducer extracted to a `.core.ts`.
- **A18 / D26 — no "new song" marker on the deck.** The edge case has two halves. The first holds: `SetlistVotePage` reads the live `useSongsList`, so a song created mid-vote enters the deck. The second is absent — nothing distinguishes a song that appeared after this member went through the deck, there is no i18n key for it, and no test asserts it. Implementing it needs a comparison between the song's creation time (or the set of song ids the member has already seen) and the member's own votes; that is pure logic and belongs in `vote-deck.core.ts` with unit tests, so it is this report's category and not `/visual-validation`'s, even though the spec routes the *visible* confirmation there.
- **A05 — passkey registration route naming.** The spec names `POST /api/auth/passkey/registration/{options,verify}`; the implementation ships `POST /api/me/passkeys/options` and `POST /api/me/passkeys`, under the session-gated `/api/me` router. Registration requires an authenticated member, so the placement is the more defensible one and the capability is complete — recorded as a deviation from the spec's literal API list, not as a defect. Authentication routes match the spec exactly.
- **Enrolment lives in `credentials.service.ts`, not `enrolment.service.ts`.** Both the spec and the plan name `api/src/auth/enrolment.service.ts`; the orchestration landed in `credentials.service.ts` beside the pure `enrolment.core.ts`. Same layering, different filename. No test or gate notices, and the slice stays a vertical one — noted so a reader of the plan is not surprised.

## Verdict: FAIL

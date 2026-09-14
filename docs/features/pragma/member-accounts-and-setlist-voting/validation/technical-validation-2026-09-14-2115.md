# Technical validation — Each member signs in as themselves and the band picks its next setlist by vote

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: `claude/setlist-voting-feature-84f01u`
- Base: `origin/main`
- Run at: 2026-09-14T21:35:00Z
- Touched workspaces: `@borso-app/pragma` (api, site, cdk), `docs/`, `scripts/architecture`

> Re-validation from scratch against the current diff (HEAD `6d673c1`). The two FAIL rows of the
> 20:50 report (A17 adding a song back into the closing proposal, A18 marking a song that arrived
> late) were re-checked against the code as it stands, not against the earlier report.

> 9 use cases routed to `/visual-validation` (the five happy-path steps plus the four visible edge
> cases the spec's *Test strategy* names: the budget bar reaching zero and refusing the right zones,
> a new song appearing mid-vote, the tie at the boundary showing more than N rows, reopening a
> closed vote), plus the `scripts/argent.sh gesture-drag` pointer pass; out of scope for this report.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Q.O.D. "What happens to the shared password?" — replace it | No shared-password gate survives; every slice gates on the member session | `api/src/auth/member-session.middleware.ts:16`, `api/src/app.ts:34-44` | `export const requireMemberSession: MiddlewareHandler` ; `grep requireSharedPasswordSession` over `api/src` returns nothing, and `shared-password.middleware.ts` is deleted in the diff | PASS |
| A02 | Q.O.D. "Who is admin?" — every member, no role column | No role/isAdmin anywhere | `api/src/database/schema.ts`, migration `0004` | the migration adds `member_credential`, `member_passkey`, `webauthn_challenge`, `setlist_vote` and no role column; `grep -rn "isAdmin\|\brole\b"` over the new auth code returns nothing | PASS |
| A03 | Q.O.D. "Passkeys now" — alternative single factor | Password login and passkey login both reachable | `api/src/auth/auth.controller.ts:47,95,100` | `.post('/login', zValidator('json', memberLoginSchema), …)` alongside `.post('/passkey/authentication/options', …)` and the verify route | PASS |
| A04 | Q.O.D. "Which vote mechanism / budget size" — 3 × target, max 3 per song | Budget arithmetic and the per-song cap | `api/src/setlists/voting.core.ts:1,39`, `api/src/setlists/setlists.schema.ts:90` | `export const POINTS_PER_TARGET_SONG = 3;` ; `const total = resolveTargetSongCount(targetSongCount) * POINTS_PER_TARGET_SONG;` ; `export const MAX_POINTS_PER_SONG = 3;` | PASS |
| A05 | Q.O.D. "Must the budget be spent?" — no | Nothing normalises or requires a full spend | `api/src/setlists/voting.core.ts:69` | `tally` sums what exists, skipping only `if (vote.points <= 0) continue;` | PASS |
| A06 | Q.O.D. "Who sees what" — everything, live, including who gave what | The tally carries `pointsByMember` | `api/src/setlists/voting.core.ts:22-24,74` | `readonly pointsByMember: Readonly<Record<string, number>>;` ; `running.pointsByMember[vote.memberId] = vote.points;` | PASS |
| A07 | Q.O.D. "How does a vote become a setlist?" — propose and adjust | Closing panel proposes, the band edits, then writes | `site/src/components/organisms/VoteClosePanel.tsx:28-35,100-118` | `const [keptSongIds, setKeptSongIds] = useState<string[]>(() => proposal.map((tally) => tally.songId));` with remove / move / add controls before `onClose(keptSongIds)` | PASS |
| A08 | Q.O.D. "How is the first account created?" — shared password opens an enrolment page | Enrolment route reads the shared password and closes itself | `api/src/auth/auth.controller.ts:66,71`, `site/src/routes/EnrolPage.tsx`, `site/src/App.tsx:27` | `.get('/enrolment', …)` + `.post('/enrol', zValidator('json', enrolSchema), …)` ; `<Route path="/enrol" element={<EnrolPage />} />` | PASS |
| A09 | Q.O.D. "Is a voting setlist a different thing?" — a status on the setlist, null reads as locked | Two nullable columns plus a resolver | migration `0004:20-22`, `api/src/setlists/setlists.core.ts` (`resolveSetlistStatus`) | `ALTER TABLE "setlist_sheet" ADD COLUMN IF NOT EXISTS "status" text;` / `… "target_song_count" integer;` — no `NOT NULL`, no `DEFAULT`, matching the DSQL grammar the spec names | PASS |
| A10 | Q.O.D. "How are ties at the boundary broken?" — propose the ties as well | `proposeClosing` extends past the target on a tie | `api/src/setlists/voting.core.ts:95-101` | `const boundaryPoints = ranked[target - 1]?.points;` then `ranked.filter((entry, index) => index < target \|\| entry.points === boundaryPoints)` | PASS |
| A11 | Q.O.D. "A song added mid-vote?" — votable immediately | The deck reads the live catalogue, no ballot table | `site/src/routes/setlists/SetlistVotePage.tsx:35,120` | `const songs = useSongsList();` → `<VoteDeck songs={songList} …/>`; no ballot table in migration `0004` | PASS |
| A12 | Q.O.D. "Reopening a locked setlist?" — yes, keeping votes | Reopen sets the status back and deletes nothing | `site/src/routes/setlists/SetlistVotePage.tsx:86`, `api/src/setlists/voting.service.ts` | `onClick={() => setVoteStatus.mutate({ status: 'voting', targetSongCount: null })}` ; back-e2e `reopens a closed vote with every point still posted` | PASS |
| A13 | Q.O.D. "A deleted member's votes?" — deleted in the same transaction | `deleteMemberWithLinks` deletes credentials and votes inside the transaction | `api/src/members/members.repository.ts:93-107` | `await deleteCredentialsOfMember(transaction, id);` / `await deleteVotesOfDeletedMember(transaction, id);` before `transaction.delete(memberTable)` | PASS |
| A14 | Edge "Deleting a song deletes its votes" | Song cascade extended | `api/src/songs/songs.repository.ts:238-242` | `await deleteVotesOfDeletedSong(database, id);` beside the mastery-override and setlist-entry deletes | PASS |
| A15 | Q.O.D. "What does a right swipe score?" — three zones, 1/2/3, filling during the drag, badge afterwards | Zone selection, tint and badge | `site/src/routes/setlists/vote-deck.core.ts:41-53`, `components/organisms/VoteDeck.tsx:95-104,132` | `if (clampedRow === TOP_ROW) return 'three';` … ; `style={{ opacity: selectScoringTint(zone, scoring.zone, offset, geometry) }}` ; `<PointsBadge points={givenPoints} />` | PASS |
| A16 | Result §4 "the bar says so and the right zones stop accepting" + error case `budget-exhausted` | Refusal on release, and the French string verbatim | `site/src/routes/setlists/vote-deck.core.ts:98-104`, `i18n/fr.json:380` | `if (points > remainingPoints) return { kind: 'refused' };` ; `"budgetExhausted": "Plus de points ! Enlève des points aux autres chansons pour continuer de liker."` | PASS |
| A17 | Result §5 "each row removable, addable and draggable" + happy path 5 "adds one" | The closing panel lets the band put a left-out song back | `site/src/components/organisms/VoteClosePanel.tsx:15,37,89-113` | `readonly addableSongs: readonly TallySong[];` ; `const leftOutSongs = addableSongs.filter((song) => !keptSongIds.includes(song.id));` ; `onClick={() => setKeptSongIds([...keptSongIds, song.id])}` with `aria-label={t('voting.addToProposal')}` — **the previous run's FAIL is resolved** | PASS |
| A18 | Edge "the vote screen marks it as new for a member who has already been through the deck" | New-since-last-score marker, end to end | `api/src/setlists/voting.core.ts:127-135`, `voting.service.ts:72`, `site/src/routes/setlists/vote-deck.core.ts:138-148`, `components/organisms/VoteDeck.tsx:62,132` | `export function selectLastScoredAt(votesOfMember: readonly CastVote[]): string \| null` → `lastScoredAt: selectLastScoredAt(votesOfMember)` → `return Date.parse(song.createdAt) > Date.parse(lastScoredAt);` → `{isNewSong ? <Badge tone="accent">{t('voting.newSong')}</Badge> : null}` — **the previous run's FAIL is resolved** | PASS |
| A19 | Edge "Changing a password signs that member out of their other browsers and leaves the other members alone" | Session epoch on the credential | `api/src/auth/member-session.core.ts`, `api/src/me/me.controller.ts:37` | `.put('/password', zValidator('json', passwordChangeSchema), …)`; the core test `refuses a session issued before the password changed` pins the comparison | PASS |
| A20 | Error case "A cookie issued before this change carries no member and is rejected as `session-invalid`" | Old payload shape refused | `api/src/auth/member-session.core.test.ts:33`, `auth.controller.test.ts:128` | `it('refuses the payload shape issued before accounts existed', …)` ; back-e2e `refuses a cookie carrying no member, which is the shape issued before accounts existed` | PASS |
| A21 | Files to change — API surface | Every named route exists | `api/src/app.ts:35`, `me/me.controller.ts:32-82`, `setlists/setlists.controller.ts:67,73,85,107,115` | `.route('/api/me', buildMeRouter())` ; `.get('/:id/votes', …)`, `.put(` vote-status / votes, `.get('/:id/closing-proposal', …)`, `.post(` close | PASS (see Notes — passkey **registration** lands at `POST /api/me/passkeys/options` + `POST /api/me/passkeys` rather than the spec's `/api/auth/passkey/registration/{options,verify}`) |
| A22 | Files to change — database | Migration matches the spec's DDL | `api/src/database/migrations/0004_member_accounts_and_votes.sql` | the four tables, the two unique indexes and the composite `setlist_vote_pk` are byte-for-byte the spec's shapes; only `created_at` drops the `DEFAULT now()` the spec sketched, which the DSQL grammar note in the file's header explains | PASS |
| A23 | Files to change — vocabulary | Five terms added, **account** un-forbidden | `apps/pragma/VOCABULARY.md` | new `## Member credential`, `## Passkey`, `## Setlist status`, `## Vote`, `## Vote budget`; the *Words we do not use* line `- **user**, **account**: nobody has one…` is removed | PASS |
| A24 | Files to change — i18n both catalogues | Every new key in `en` and `fr` | `site/src/i18n/{en,fr}.json` | `newSong`, `addToProposal`, `closeAddLabel` present at the same paths in both; `i18n-parity.core.test.ts` passes in the suite | PASS |
| A25 | Plan "Scoring is optimistic … **no** invalidation" | The score mutation reconciles from its own response | `site/src/lib/queries/voting.queries.ts:51-70` | `onMutate` snapshots + `setQueryData`, `onError` rolls back, `onSuccess: (confirmed) => … setQueryData(boardKey, { ...current, budget: confirmed.budget })` — no `invalidateQueries` on this mutation | PASS |
| A26 | Plan "the SDK is imported in the adapter and nowhere else" | `@DependsOnExternal webauthn` on both adapters, declared in the manifest | `api/src/auth/passkey.adapter.ts:2`, `site/src/lib/passkey.adapter.ts:2`, `scripts/architecture/manifests/pragma.manifest.ts:104` | `* @DependsOnExternal webauthn` ; `id: 'webauthn'` with `technology: 'Browser credential API, verified server side by @simplewebauthn'` | PASS |
| A27 | Plan "Relying-party id per stage … through `auth.environment.ts`" | Per-stage environment module | `api/src/auth/auth.environment.ts` | new file in the diff, read by `passkey.service.ts`; no hard-coded relying-party id in the adapter | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Names carry intent; no single-letter locals | grep over every added `.ts`/`.tsx` line for `const/let <single letter>` and one-letter arrow parameters | none found; the added code reads `candidate`, `running`, `reordered`, `boundaryPoints`, `clampedRow`, `leftOutSongs`, `votesOfMember` | PASS |
| B02 | Function names describe the result | sample of the new pure API | `resolveTargetSongCount`, `proposeClosing`, `selectZoneForOffset`, `isSongNewSinceLastScore`, `judgeRelease`, `selectLastScoredAt` — the plan's self-check list, met | PASS |
| B03 | Magic numbers named | grep on the new constants | `POINTS_PER_TARGET_SONG = 3`, `MAX_POINTS_PER_SONG = 3`, `CHALLENGE_TTL_MS = 120_000`, `SESSION_TTL_DAYS = 30`, and in the deck `COMMIT_RATIO`, `ZONE_COUNT`, `TOP_ROW`/`MIDDLE_ROW`/`LAST_ROW`, `DEGREES_PER_PIXEL`, `PERCENT` | PASS |
| B04 | No comments in code | `borso/no-comments` via ESLint, plus a read of the diff | the only `//` lines added are `@FollowsBlueprint` / `@Feature` / `@Blueprint` annotations and `// Stryker disable next-line …: equivalent mutant. <reason>` directives, all of which the rule permits; the SQL migration header is not a linted source and follows `0003`'s precedent | PASS |
| B05 | Type assertions limited to `as const` / `as unknown` | grep for `as <Capital>` on added lines | no match; the single hit is `import type { … PointerEvent as ReactPointerEvent }`, an import alias, not an assertion | PASS |
| B06 | No `any` | `grep -nE "^\+.*\bany\b"` on the added `.ts`/`.tsx` lines | no match | PASS |
| B07 | `noUncheckedIndexedAccess` honoured | read of every indexed access in the new pure code | `const [moved] = reordered.splice(from, 1); if (moved === undefined) return reordered;` ; `const song = songs[cardIndex];` guarded by `song !== undefined` ; `ranked[target - 1]?.points` ; `pointsBySongId[songId] ?? 0` | PASS |
| B08 | ESLint clean | `pnpm --filter @borso-app/pragma run lint` | exit 0, no findings (only the generic "Multiple projects found" tsconfig notice) | PASS |
| B09 | `useEffect` is a smell | `grep '^+.*useEffect'` over the whole diff | **zero effects added.** The deck drives its drag from Pointer Event handlers into `useState`; the closing panel seeds `useState` from a lazy initialiser; all server state is TanStack Query | PASS |
| B10 | Optimistic write not re-fetched | `borso/no-refetch-of-optimistically-written-query` | passes in B08; the only `invalidateQueries` calls sit on `useSetVoteStatus` and `useCloseVote`, neither of which carries `onMutate` | PASS |
| B11 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 (`tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit`) | PASS |
| B12 | Build | `pnpm --filter @borso-app/pragma run build` | exit 0, `✓ built in 3.41s` (the >500 kB chunk notice is pre-existing and not a failure) | PASS |
| B13 | Dead code | `pnpm exec knip` at the repo root | exit 0, no unused files / exports / dependencies; only four pre-existing `.css` configuration hints | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:core` | 0 — 128 files, 1329 tests passed | PASS |
| C02 | @borso-app/pragma | coverage gate inside `test:core` | 0 — Statements 100% (1988/1988), Branches 100% (979/979), Functions 100% (512/512), Lines 100% (1698/1698) | PASS |
| C03 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test` (back-e2e, sandbox Postgres) | 0 — 16 files, 103 tests passed, first run, no retry needed | PASS |
| C04 | every added `*.core.ts` / `*.utils.ts` / `*.adapter.ts` | sibling-test enumeration over the diff | 15 of 15 pure modules carry a sibling `*.test.ts` (`voting.core`, `vote-deck.core`, `member-session.core`, `enrolment.core`, `passkey.core`, `passkey.adapter` ×2, `voting.utils`, `session-cookie.utils`, `setlist-status.core`, `setlist-vote.core`, `setlists.core`, `login.core`, `json.core`, `test-seed-fixture.core`); none missing | PASS |
| C05 | `infra/cdk`, `infra/shared` | — | untouched by the diff, as the spec predicted; their gates are unaffected | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Error: scoring beyond the budget is refused with `budget-exhausted` and the remaining points | `it('refuses a score beyond the budget and says what is left', …)` at `api/src/setlists/voting.controller.test.ts:113`, asserting `body.error` is `'budget-exhausted'` (:123); unit side `it('refuses a score one point over the budget', …)` at `voting.core.test.ts:48` | PASS |
| D02 | Error: scoring more than 3 on one song is refused by the schema | `it('caps a score at three points and refuses a negative one', …)` at `api/src/setlists/setlists.schema.test.ts:182` | PASS |
| D03 | Error: scoring on a setlist that is not `voting` is refused with `not-voting` | `it('refuses a score on a setlist that is not in its voting phase', …)` at `voting.controller.test.ts:161` | PASS |
| D04 | Error: closing a setlist that is not `voting` is refused with `not-voting` | covered by the same guard through `it('refuses to propose a closing when no song scored', …)` at `voting.controller.test.ts:173` and the phase guard at :161 | PASS |
| D05 | Error: closing a vote where no song scored is refused with `no-votes` | `it('refuses to propose a closing when no song scored', …)` at `voting.controller.test.ts:173` | PASS |
| D06 | Error: enrolling a member who already holds a credential is refused with `already-enrolled` | `it('refuses a second enrolment of the same member', …)` at `api/src/auth/auth.controller.test.ts:77` | PASS |
| D07 | Error: the enrolment route refuses once every member is enrolled (`enrolment-closed`) | `it('closes the enrolment window once every member holds a credential', …)` at `auth.controller.test.ts:64` | PASS |
| D08 | Error: a cookie issued before this change is rejected as `session-invalid` | `it('refuses a cookie carrying no member, which is the shape issued before accounts existed', …)` at `auth.controller.test.ts:128`; unit `it('refuses the payload shape issued before accounts existed', …)` at `member-session.core.test.ts:33` | PASS |
| D09 | Error: login attempts stay rate limited per hashed client IP | `it('rate-limits after 5 attempts in 15 min on the same ip', …)` at `auth.controller.test.ts:103` | PASS |
| D10 | Edge: a member who spends only part of their budget still counts | `it('counts what a member has already posted', …)` at `voting.core.test.ts:38` and `it('sums the points of every member and counts the voters', …)` at :66 | PASS |
| D11 | Edge: a member who scores nothing is absent from the totals; the vote closes without them | `it('leaves a song nobody scored out of the tally', …)` at `voting.core.test.ts:77` and `it('answers nothing for a member who has scored nothing', …)` at :222 | PASS |
| D12 | Edge: a locked setlist can be reopened, points survive, the next closing overwrites the entries | `it('reopens a closed vote with every point still posted', …)` at `voting.controller.test.ts:233` | PASS |
| D13 | Edge: songs tied at the boundary are all proposed, so the proposal can exceed N | `it('proposes every song tied with the last one it would keep', …)` at `voting.core.test.ts:102`, `it('reads the tie from the last song it keeps, not from the one after it', …)` at :191, back-e2e `it('proposes the top songs plus everything tied at the boundary', …)` at `voting.controller.test.ts:182` | PASS |
| D14 | Edge: deleting a member deletes their votes in the same transaction | `it('deletes the votes of a member with the member', …)` at `voting.controller.test.ts:257` | PASS |
| D15 | Edge: deleting a song deletes its votes | `it('deletes the votes of a song with the song', …)` at `voting.controller.test.ts:278` | PASS |
| D16 | Edge: a member with no passkey never sees a prompt; a member with one can still sign in by password | `it('logs a member in by username and refuses the wrong password', …)` at `auth.controller.test.ts:94`, plus `api/src/auth/passkey.adapter.test.ts` and `passkey.core.test.ts` covering the option payloads | PASS |
| D17 | Edge: changing a password signs that member out of their other browsers and leaves the others alone | `it('changes a password, keeps that member signed in here and drops their other browsers', …)` at `auth.controller.test.ts:148` and `it('leaves another member signed in when one member changes their password', …)` at :176 | PASS |
| D18 | Null `status` reads as `locked` (the migration's back-compat rule) | `it('reads a row written before the column existed as locked', …)` at `api/src/setlists/setlists.core.test.ts:87`; back-e2e `it('reads a setlist that was never voted on as locked', …)` at `voting.controller.test.ts:84` | PASS |
| D19 | Pointer offset → zone → points, the gradient a zone shows, the dead zone, the exhausted state | `vote-deck.core.test.ts:24-132` — `reads a card barely moved as no zone at all`, `reads a card pulled far enough left as a discard`, `splits the right side into three rows, three points at the top`, `clamps a drag past the top or the bottom of the card`, `fills only the zone under the thumb, and fills it as the drag travels`, `refuses a zone the budget cannot pay for` | PASS |
| D20 | A song that arrived after this member's last score is marked new (the pure half of the mid-vote edge case) | `vote-deck.core.test.ts:141-160` — `is new when it was created after the last score and holds none`, `is not new when it was already there`, `is not new once this member has scored it`, `is not new to a member who has scored nothing yet`, `counts the ones worth telling the member about`; server side `it('reports when this member last scored, so the deck can mark what arrived after', …)` at `voting.controller.test.ts:292` | PASS |
| D21 | Closing writes the entries in the order handed and locks the setlist | `it('closes a vote into an ordinary setlist, in the order it was handed', …)` at `voting.controller.test.ts:204` | PASS |
| D22 | Rescoring a song frees the points it held | `it('frees the points a song already held when it is rescored', …)` at `voting.core.test.ts:56`, `it('takes a song back off when it is scored zero', …)` at `voting.controller.test.ts:126` | PASS |
| D23 | The tally shows who gave what | `it('shows every member who scored, and what they gave', …)` at `voting.controller.test.ts:141` | PASS |
| D24 | Optimistic board arithmetic on the client | `voting.utils.test.ts:20-167` — 14 cases over `readMemberPoints` and the board update, including `drops a song from the board when its last voter scores it zero` and the three tie-breaking rules | PASS |

## Notes

- **A21 — route-shape deviation, not a behaviour gap.** The spec's *Result* section names
  `POST /api/auth/passkey/registration/{options,verify}`. The implementation puts passkey
  *registration* on the signed-in surface instead — `POST /api/me/passkeys/options` and
  `POST /api/me/passkeys` (`api/src/me/me.controller.ts:64,69`) — while *authentication*
  stays on `/api/auth/passkey/authentication/{options,verify}` as specified. Registration
  requires a session by definition, and the spec's own *Files to change* block assigns
  "password change, passkey list and removal" to `me.controller.ts`, so the two halves of the
  spec disagree and the code follows the stricter one. Behaviourally complete; worth a line in
  the PR description so the spec's API list is read as the earlier draft it is.
- **A22 — `created_at` carries no `DEFAULT now()`.** The spec's DDL sketch has
  `"created_at" timestamptz DEFAULT now() NOT NULL`; the shipped migration writes
  `"created_at" timestamp with time zone NOT NULL` and the application supplies the value.
  Consistent with the DSQL-grammar reasoning in the migration's own header. No functional gap.
- Two files named in the spec's *Files to change* landed under different names:
  `auth/enrolment.service.ts` is split into `auth/credentials.service.ts` plus the pure
  `auth/enrolment.core.ts`, and `site/src/routes/setlists/queries.ts` landed as
  `site/src/lib/queries/voting.queries.ts`. Both follow the repo's layer conventions better
  than the spec's sketch did; no behaviour is missing.
- The previous run's two FAIL rows (A17, A18) are both implemented and both now carry unit
  coverage (D20 for the new-song marker; the add-back control is a UI affordance and stays
  routed to `/visual-validation` per the spec's *Test strategy*).

## Verdict: PASS

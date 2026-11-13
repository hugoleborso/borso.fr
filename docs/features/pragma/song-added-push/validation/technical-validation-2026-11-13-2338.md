# Technical validation — Push when a member adds a song

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (`docs/features/pragma/song-added-push/plan/plan.md` does not exist)
- Branch: claude/youthful-euler-ipkkn3
- Base: origin/main (`bf13850605d7386783a319a61e18420ccc45ac0c`)
- Run at: 2026-11-13T23:48:34Z
- Round: 1
- Reviewed: a5ac1e672f898cd8ce088223bf2854fb1583d92f
- Touched workspaces: @borso-app/pragma (api, site, scripts)

The spec has neither the full sections (Q.O.D., Use cases, Changes, Test strategy) nor the short-form ones (Behaviour, Data shape). Categories A and D were built from its trigger table (the `song-created` row), its *Rules every band push follows* bullets and its *Decisions in this change* bullets, walked in order, with files taken from the diff. No merge of `main` sits above the base (`git rev-list --merges origin/main..HEAD` printed nothing). 0 use cases routed to /visual-validation; the spec makes no claim only a running browser can show.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | plan absent; files taken from the diff | — | `plan/plan.md` missing | UNVERIFIABLE |
| A01 | Table, `song-created` › Fired by | A song added from the app fires `song-created` | apps/pragma/api/src/songs/songs.controller.ts:46-51; songs.service.ts:136-152 | `const outcome = await createSong(input, { memberId: readMemberId(context), now: new Date(), });` then `await notifyBand({ kind: 'song-created', actorMemberId: actor.memberId, songId: outcome.song.id, songTitle: outcome.song.title }, actor.now);` | PASS |
| A02 | Table, `song-created` › Fired by | The `save_song` tool fires it | apps/pragma/api/src/songs/songs-tools.controller.ts:41-42, 113 | `async function runSongCreate(input: SongCreate, actor: ToolActor)` … `const outcome = await createSong(input, actor);` … `return await runSongCreate(await buildSongCreate(input, defaultLineup), actor);` | PASS |
| A03 | Table › Category toggle `songs` (new) | `song-created` files under a new `songs` category | apps/pragma/api/src/notifications/notifications.core.ts:6, 169-170 | `'songs',` in `NOTIFICATION_CATEGORIES`; `case 'song-created': return 'songs';` | PASS |
| A04 | Table › Group key `song-created:<actorMemberId>` | Group key is per actor | notifications.core.ts:219-220 | ``case 'song-created': return `song-created:${event.actorMemberId}`;`` | PASS |
| A05 | Table › Opens `/catalog/<songId>` | Push opens the song | notifications.core.ts:248-250 | ``case 'song-created': case 'song-lineup-changed': return `/catalog/${event.songId}`;`` | PASS |
| A06 | Lead sentence (the push names the song) | Payload carries `songTitle`, rendered in both languages | notifications.core.ts:262-263; apps/pragma/site/public/sw-notifications.js:24, 37, 55, 68 | `case 'song-created': case 'song-lineup-changed': return { songTitle: event.songTitle };`; `'song-created': '{actorName} added {songTitle} to the catalogue'`; `'song-created': '{actorName} a ajouté {songTitle} au catalogue'` | PASS |
| A07 | Rules › actor never receives | The adding member is excluded | notifications.core.ts:203 (shared); songs.service.ts:145 | `subscription.memberId !== filter.actorMemberId &&`; `actorMemberId: actor.memberId,` | PASS |
| A08 | Rules › every category on until turned off | `songs` reads enabled with no stored row | notifications.core.ts:185-186, 192 | `return stored?.enabled ?? true;`; `return NOTIFICATION_CATEGORIES.map((category) => ({` | PASS |
| A09 | Rules › one send per group key per 10 min, later writes dropped | The song event goes through the shared group claim | apps/pragma/api/src/notifications/notifications.service.ts:225, 121-130 | `if (!(await hasClaimedGroup(buildGroupKey(event), now))) return 'grouped';`; `if (!isGroupDue(lastSentAt, now)) return false;` | PASS |
| A10 | Rules › 5 s at most, a failed send never fails the write | `createSong` awaits `notifyBand`, which catches every throw and returns an outcome; the song outcome is returned whatever it is | notifications.service.ts:230-242; songs.service.ts:142-152 | `} catch (error) { … return 'failed'; }`; `await notifyBand(…, actor.now); return outcome;` | PASS |
| A11 | Rules › 404/410 deletes the subscription | Shared delivery path, unchanged | notifications.core.ts:119-124 | `const EXPIRED_SUBSCRIPTION_STATUSES … new Set<number \| null>([ NOT_FOUND_STATUS, GONE_STATUS, ]);` | PASS |
| A12 | Decisions › songs get their own toggle | Settings lists a `songs` toggle with its own label | apps/pragma/site/src/components/organisms/NotificationSettings.tsx:46; site/src/i18n/en.json:856; fr.json:856 | `songs: 'notifications.categories.songs',`; `"songs": "New songs in the catalogue",`; `"songs": "Les nouveaux morceaux du catalogue",` | PASS |
| A13 | Decisions › group key per member who adds; a burst pings once, naming the first song | The first add claims the actor's group; later adds in the window are refused by the claim, so the first song's title is the one sent | notifications.core.ts:219-220; notifications.service.ts:225 | as A04 and A09 | PASS |
| A14 | Decisions › audience suggestion does not notify | The audience import inserts without the notice | apps/pragma/api/src/songs/songs.service.ts:274-275 | `async function insertSuggestedSong(track: ExternalSongHit): Promise<SongCreateOutcome> { return await insertSongWithoutNotice({` | PASS |
| A15 | Decisions › dev seed does not notify | `pnpm dev:db` runs `seedPreviewFixture`, which inserts without the notice | apps/pragma/test/dev-database.setup.ts:11; apps/pragma/api/src/__test/test-seed.service.ts:156 | `const summary = await seedPreviewFixture(new Date(), DEVELOPMENT_API_ORIGIN);`; `const created = await insertSongWithoutNotice(buildSongInput(seed, lineup));` | PASS |
| A16 | Decisions › audit seed does not notify | The task-metrics seed inserts without the notice | apps/pragma/scripts/task-metrics/audit-seed.setup.ts:510 | `const created = await insertSongWithoutNotice({` | PASS |
| A17 | All song writers | No other caller creates a song through the notifying path or bypasses it | `grep -rn "createSong\b\|insertSongWithoutNotice"` over apps/pragma | Production callers of `createSong`: songs.controller.ts:48 and songs-tools.controller.ts:42 only; `insertSongWithoutNotice`: songs.service.ts:275, test-seed.service.ts:156, audit-seed.setup.ts:510 and the test helper notifications.controller.test.ts:85 | PASS |

## B. Code cleanliness

Changed source files read in full against the standards checklist: notifications.core.ts, songs.controller.ts, songs-tools.controller.ts, songs.service.ts. NotificationSettings.tsx and sw-notifications.js were read at their changed maps and imports. The diff in test-seed.service.ts and audit-seed.setup.ts renames one import and one call each; those two files were read at their hunks and imports only. No `VOCABULARY.md` changed.

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware <18 changed .ts/.tsx/.js files>` | exit 0, no output | PASS |
| B02 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B03 | knip | `pnpm knip` at the root | exit 0; configuration hints only, none about a changed file | PASS |
| B04 | No `any` | `grep -nP '\bany\b' <changed files>` | only notifications.controller.test.ts:432 `expect.any(String)` and notifications.core.test.ts:79 test-name prose | PASS |
| B05 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed files | none found | PASS |
| B06 | Type assertions limited to `as const` / `as unknown` | added lines grepped for ` as ` | none added | PASS |
| B07 | No prose comments | added lines grepped for comments | only `// @FollowsBlueprint service-orchestration` at songs.service.ts:135, a machine-read marker | PASS |
| B08 | Names carry intent; no abbreviations | sampled `insertSongWithoutNotice`, `SongCreatedEvent`, `runSongCreate(input, actor)`, `seedSong` | none abbreviated | PASS |
| B09 | Magic numbers / strings | added lines grepped for numeric literals | none added; new strings are i18n and message keys | PASS |
| B10 | `noUncheckedIndexedAccess` | added lines | no new indexed access | PASS |
| B11 | Standards checklist (01-naming): "a `find…` returns `null` … a `build…`, `project…` or `select…` returns what its verb says" | read in full | `selectCategory` still returns the category the rule chooses (notifications.core.ts:163); `buildGroupKey`, `buildNotificationUrl` build strings; `insertSongWithoutNotice` and `createSong` use no table verb | PASS |
| B12 | Standards checklist (01-naming): "a comment documents something the code cannot say" | read in full | no comment added beyond the blueprint marker | PASS |
| B13 | Standards checklist (03-typing): "a derived type is derived" | read in full | `type SongCreateInput = Parameters<typeof insertSongWithoutNotice>[0];` at test-seed.service.ts:57; `type SongCreate = Parameters<typeof createSong>[0];` at songs-tools.controller.ts:30; `SongCreatedEvent` is the source type, not a mirror | PASS |
| B14 | Standards checklist (04/11): "a multi-table write is wrapped in one transaction owned by the service" | read in full | `createSong` writes `song` then, through `notifyBand`, `notification_dispatch` outside any transaction (songs.service.ts:141-151). The spec requires the send never to fail the write, so the dispatch claim must not share the song's transaction; same shape as `patchSong` › `notifyIfLineupChanged` on `main` | PASS |
| B15 | Standards checklist (09-i18n): "a key's dotted path names the screen and the element" | read in full | `notifications.categories.songs` beside `notifications.categories.takes` | PASS |
| B16 | Standards checklist (05): "no new … button label explains the interface" | read in full | `"New songs in the catalogue"` is a toggle label naming its category | PASS |
| B17 | Standards checklist (10-testing): "a test name states the behaviour and the condition" | read in full | `it('lists the five categories with the state the member saved', …)` at apps/pragma/site/src/components/organisms/NotificationSettings.test.tsx:118. This branch added a sixth category to its fixture at :42 (`{ category: 'songs', enabled: true },`), so the name is false and the test asserts five of six checkboxes. Introduced: this branch; Fix size: one file | FAIL (non-blocking) |
| B18 | Standards checklist (01-naming): "a definition in a `VOCABULARY.md` is still true" | apps/pragma/VOCABULARY.md:700-712 | "A missing row reads as enabled, so a member who turns push on gets every category" still holds for `songs` (A08) | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core) | `pnpm exec vitest run --project core --changed bf13850605d7386783a319a61e18420ccc45ac0c --coverage --reporter=verbose` (from apps/pragma) | 0. 71 files, 459 tests passed; coverage 100% statements, branches, functions, lines. The feature's files ran: notifications.core.test.ts (`files { kind: 'song-created', … } under songs`, `groups … under song-created:member-hugo`, `opens … at /catalog/song-3`), site/src/sw/service-worker.test.ts › `renders every message key the API sends, in both languages`, NotificationSettings.test.tsx, notifications.queries.test.tsx | PASS |
| C02 | @borso-app/pragma (back-e2e) | `DATABASE_URL=$(../../scripts/local-postgres.sh start pragma) pnpm run test:e2e --changed bf13850605d7386783a319a61e18420ccc45ac0c --reporter=verbose` | 0. 48 files, 454 tests passed, including notifications.fan-out.test.ts › `a song added to the catalogue, grouped per member who adds`, songs-tools.controller.test.ts › `adds a song then sets its default lineup by name as the member, notifying the other members only`, tasks-tools.controller.test.ts, notifications.controller.test.ts | PASS |
| C03 | @borso-app/pragma (mutation) | `scripts/mutate-changed.sh bf13850605d7386783a319a61e18420ccc45ac0c apps/pragma` | 1. One survivor in the only gated file changed: `api/src/notifications/notifications.core.ts:262:10` `case 'song-created':` → `case "":` survived; score 99.33 under break threshold 100. Failing case: `buildNotificationPayload(SONG_CREATED, 'Léa').parameters` is never asserted in notifications.core.test.ts. The `it.each` at notifications.core.test.ts:296-302 lists `TAKE_COMMENT_CREATED`, `SESSION_*`, `SONG_LINEUP_CHANGED` and `TRANSITION_CHANGED` but not `SONG_CREATED`, so a payload with no `songTitle` passes core. CI runs the same script on the pull request and will fail it. Fix size: one line, `[SONG_CREATED, { songTitle: 'Rehab' }],` in that table | FAIL (blocking) |
| C04 | `*.utils.ts` coverage | `git diff --name-only` for `*.utils.ts` | the branch changes no `*.utils.ts` file | PASS |

## D. Test coverage of spec

0 use cases routed to /visual-validation; out of scope for this report: none.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | A song added from the app pushes `song-created` to another member, naming the song and opening it | `it('a song added to the catalogue, grouped per member who adds', …)` at apps/pragma/api/src/notifications/notifications.fan-out.test.ts:217; POSTs `/api/songs` as Hugo, then `expect(lastSentToLea(band)).toMatchObject({ messageKey: 'song-created', parameters: { actorName: 'Hugo', songTitle: 'Valerie' }, url: \`/catalog/${songId}\`, tag: \`song-created:${band.hugo.memberId}\` });` at :223-228 | PASS |
| D02 | The `save_song` tool pushes `song-created` | `it('adds a song then sets its default lineup by name as the member, notifying the other members only', …)` at apps/pragma/api/src/songs/songs-tools.controller.test.ts:186; `{ endpoint: deviceEndpoint('lea-phone'), messageKey: 'song-created' },` at :215 | PASS |
| D03 | `song-created` files under `songs` | `selectCategory` `it.each` at apps/pragma/api/src/notifications/notifications.core.test.ts:140 `[SONG_CREATED, 'songs'],` | PASS |
| D04 | Group key `song-created:<actorMemberId>` | notifications.core.test.ts:237 `[SONG_CREATED, 'song-created:member-hugo'],`; fan-out test :227 `tag: \`song-created:${band.hugo.memberId}\`` | PASS |
| D05 | Opens `/catalog/<songId>` | notifications.core.test.ts:269 `[SONG_CREATED, '/catalog/song-3'],`; fan-out test :226 | PASS |
| D06 | The member who added the song never receives it | songs-tools.controller.test.ts:214-217; Hugo (the actor) has `hugo-phone` subscribed (test/mcp-utils.ts:188) and the assertion `toEqual([{ endpoint: deviceEndpoint('lea-phone'), messageKey: 'song-created' }, { endpoint: deviceEndpoint('lea-phone'), messageKey: 'song-lineup-changed' }])` would fail if `hugo-phone` received it | PASS |
| D07 | `songs` is on until the member turns it off | notifications.controller.test.ts:247 `reads every category as on before the member touches one`, `{ category: 'songs', enabled: true },` at :256; notifications.core.test.ts:174 | PASS |
| D08 | Turning `songs` off stops the push | fan-out test :234-237: after `startNextGroupWindow()` the group is due again, then `await turnCategory(band.lea, 'songs', false);` and a third add, `expect(sentCount(band)).toBe(before);` | PASS |
| D09 | A burst of songs pings once, naming the first | fan-out test :230-232: a second add by Hugo inside the window, `expect(sentCount(band)).toBe(before);`, after the first push named `songTitle: 'Valerie'` at :224 | PASS |
| D10 | Later writes in the window are dropped, not queued | structural: no queue exists; `if (!(await hasClaimedGroup(buildGroupKey(event), now))) return 'grouped';` at notifications.service.ts:225 returns without storing the event | PASS |
| D11 | A send waits 5 s at most, and a failed send never fails the write | shared path, covered on the take route: notifications.controller.test.ts:437 `answers the write once the deadline passes, even if a push service never answers`, :414 `answers the write even when sending fails outright`. The song path reaches the same `notifyBand` (songs.service.ts:143) | PASS |
| D12 | 404/410 deletes the subscription | shared path: notifications.controller.test.ts:381 `deletes a subscription its push service says is gone, and the write still succeeds` | PASS |
| D13 | The push text renders in English and French | site/src/sw/service-worker.test.ts:196, 215, 227, 239, 251: `'New song'`, `'Nouveau morceau'`, `'Ana added Song to the catalogue'`, `'Ana a ajouté Song au catalogue'` | PASS |
| D14 | Songs get their own toggle in Settings | API side covered (D07, D08). The Settings screen has no assertion on the new checkbox: `lists the five categories with the state the member saved` at NotificationSettings.test.tsx:118-130 checks five labels and not `'New songs in the catalogue'`. Failing case: render `NotificationSettings` with a component change that drops the `songs` row (or a wrong label key) → every site test still passes. The label map is a `Record<NotificationCategory, ParseKeys>` (NotificationSettings.tsx:43-46), so a missing label cannot compile, which is why this is non-blocking | FAIL (non-blocking) |
| D15 | A song created by an audience suggestion does not notify | (none found). `grep 'stubPushService\|readSentNotifications' apps/pragma/api/src/audience/*.test.ts` returns nothing. Failing case: change songs.service.ts:275 so the import calls `notifyBand` after the insert → no test fails, and every audience suggestion of an unknown track pushes to the band. Non-blocking because the notifying `createSong` demands a `WriteActor` member the audience flow does not have, so the regression needs a deliberate new call | FAIL (non-blocking) |
| D16 | The dev seed and the audit seed do not notify | structural: test-seed.service.ts:156 and audit-seed.setup.ts:510 call `insertSongWithoutNotice`, which never reaches `notifyBand` (songs.service.ts:123-133) | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `createSong` → `insertSongWithoutNotice` → `insertSong` (songs.service.ts:141 → songs.repository.ts:216) | Check-then-write | The new code adds no decision read before the insert; the id is generated by the insert. The one rule on this path, one song per Deezer track, is held by `uniqueIndex('song_deezer_track_id_unique')` (songs.schema.ts:51) per ADR-2026-10-24T0932, and fired concurrently by songs.controller.test.ts:325 `answers one create and one refusal when two creates onto one Deezer track race and a commit loses a conflict` (`Promise.all` at :337, asserts `[201, CONFLICT]` and `toHaveLength(1)`). See Notes on the standard this contradicts | PASS |
| E02 | `notifyBand` › `hasClaimedGroup` for `song-created:<actor>` (notifications.service.ts:121-130) | Check-then-write | Reads `lastSentAt`, then claims at write time: first send by primary key `group_key` (`.insert(notificationDispatchTable).values({ groupKey, lastSentAt: now }).onConflictDoNothing().returning(…)`, notifications.repository.ts:102-108), later sends by `.update(…).where(and(eq(groupKey), eq(lastSentAt, previousSentAt))).returning(…)` (:118-128). Losing either claim is the refusal. Two `POST /api/songs` from Hugo at once both read `null` and both insert; the PK lets one through | PASS |
| E03 | Module-level state | Per-process state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` over the five changed api files: no match (exit 1) | PASS |
| E04 | Concurrent proof of the group claim | Concurrent test | notifications.controller.test.ts:517 `lets exactly one of two concurrent claims win, first send or later`: `Promise.all([hasClaimedDispatch('setlist:race', null, firstAt), hasClaimedDispatch('setlist:race', null, firstAt)])` then `expect(firstClaims.filter(Boolean)).toHaveLength(1);`, and the same for the later claim. The claim takes any group key string, so it holds `song-created:<actor>` identically; :352 `sends one round for a take two tabs send at the same moment` covers it through a route | PASS |

## Blocking findings

- C03 — A mutant survives in notifications.core.ts:262 (`case 'song-created':` in `selectSubjectParameters`), because no core test asserts the `song-created` payload parameters; `scripts/mutate-changed.sh` exits 1 and CI's mutation gate will fail the pull request. Add `[SONG_CREATED, { songTitle: 'Rehab' }],` to the `names the subject of %o` table at notifications.core.test.ts:296.

## Non-blocking findings

- B17 — `lists the five categories with the state the member saved` (NotificationSettings.test.tsx:118) now renders six categories; the name is false.
- D14 — No site test asserts the `songs` checkbox (`'New songs in the catalogue'`) in Settings.
- D15 — No test shows an audience suggestion of an unknown track sends no push.

## Notes

- A00 — UNVERIFIABLE: the plan is absent. Files were taken from the diff. Running `/technical-conception` would have produced the *Files to change* list this report had to reconstruct.
- E01 — `docs/standards/11-database.md:145` says "A uniqueness rule is held by a primary key, never by a unique index", while ADR-2026-10-24T0932 (accepted) holds one song per Deezer track by a unique index and records that "a race in that window can still import twice" during the index build. The branch only renames the function around this insert. Should the ADR be superseded by the claim-table option it rejected, now that the standard forbids its choice?
- The `song-created` group tag is per actor, so on a device it replaces the earlier song push of the same member. Is that the intended reading of "a burst pings once, naming the first song" when the next window opens and names a later song?

## Verdict: FAIL

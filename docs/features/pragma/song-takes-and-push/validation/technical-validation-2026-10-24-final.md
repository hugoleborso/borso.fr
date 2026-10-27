# Technical validation — Song takes and web push (final)

- Spec: [`../spec/spec.md`](../spec/spec.md), whole, including the install banner amendment of 2026-10-24
- Plan: [`../plan/plan.md`](../plan/plan.md)
- ADRs: [ADR-0040](../../../../adr/0040-pragma-sends-web-push-like-talos.md) with its revision of 2026-10-24, [ADR-0043](../../../../adr/0043-one-catalogue-song-per-deezer-track-by-unique-index.md)
- Branch: claude/pragma-takes-and-push at 66425fcd. HEAD did not move during the run, and the working tree held only another agent's untracked `visual-validation-2026-10-24-final/` folder
- Base: `git merge-base origin/main HEAD` = abdee6af
- Run at: 2026-10-24T14:57:43Z
- Touched workspaces: @borso-app/pragma (api, site, domain, cdk, test), @borso-app/talos (`package.json` catalog move only)

The previous pass ([`technical-validation-2026-10-24-0059.md`](./technical-validation-2026-10-24-0059.md)) graded c4c69db4. This pass re-runs every gate on 66425fcd and re-reads what the 52 commits since then changed: the VAPID pair in `vapid_key_pair`, the claimed and retried transactions (setlists, audience, tasks, members, instruments, studies, takes), the Deezer unique index and its 409, the route-to-organism refactors and the install banner.

Six use cases go to `/visual-validation` under the spec's *Test strategy*. They are out of scope for this report: live recording from the fake microphone, the take listed first on the song page, a fixture upload, a moment comment moving the player, an offline take going pending and then uploading once back online, and enabling push with toggles that save. The install banner's checks also go to `/visual-validation`: the walkthrough for each user agent at 375 px, no banner at 1280 px or under `display-mode: standalone`, and the dismissal surviving a reload.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Q "one recording" | One take per song | apps/pragma/api/src/takes/takes.schema.ts:18 | `songId: uuid('song_id').notNull(),` | PASS |
| A02 | Q "feedback" | One table, optional moment | takes.schema.ts:37; takes.service.ts:177 | `atSeconds: integer('at_seconds'),` / `if (!isMomentWithinTake(input.atSeconds, take.durationSeconds)) {` | PASS |
| A03 | Q "session optional" | `session_id` nullable, cleared on session deletion | takes.schema.ts:19; takes.repository.ts:228-231; sessions.repository.ts:123 | `sessionId: uuid('session_id'),` / `.set({ sessionId: null })` / `await detachTakesOfDeletedSession(transaction, id);` | PASS |
| A04 | Q "retention and size" | 50 MiB per file, at signing and by S3 | apps/pragma/domain/take-upload.core.ts:39; takes.schema.ts:50; uploads.adapter.ts:52 | `TAKE_MAX_MEBIBYTES = 50;` / `contentLength: z.number().int().positive().max(TAKE_MAX_BYTES),` / `ContentLength: params.contentLength,` | PASS |
| A05 | Q "where is Record" | Record on each song of a practice; Record and Upload on the song page | site/src/components/organisms/SessionDetail.tsx:137; SongTakes.tsx:58, 95 | `{isConcert ? null : <PracticeRecordingList sessionId={session.id} setlists={setlists} />}` / `<RecordingSheet songId={songId} songTitle={songTitle} sessionId={null} />` / `<TakeUploadForm` | PASS |
| A06 | Result "Takes under the chord chart" | The Takes section sits under the chart | site/src/components/organisms/SongDetail.tsx:87-89 | `<SongChartPreviews songId={song.id} chart={song.chart} />` followed by `<SongTakes` | PASS |
| A07 | Q "bad network" | IndexedDB queue, retried on open and on `online` | site/src/lib/take-queue.setup.ts:52, 55 | `.load()` … `window.addEventListener(ONLINE_EVENT, drainTakeQueue);` | PASS |
| A08 | Q "notifications" | Web push through `push` and `notificationclick` | site/public/sw.js:263, 287 | `self.addEventListener('push', (event) => {` / `self.addEventListener('notificationclick', (event) => {` | PASS |
| A09 | Q "burst of edits" | One notification per group per 10 minutes | api/src/notifications/notifications.core.ts:7, 213-215; notifications.service.ts:101-110 | `NOTIFICATION_GROUP_WINDOW_MINUTES = 10;` / `return now.getTime() - lastSentAt.getTime() >= NOTIFICATION_GROUP_WINDOW_MILLISECONDS;` | PASS |
| A10 | Q "preferences" | One toggle per category, all on before the first toggle | notifications.core.ts:168 | `return stored?.enabled ?? true;` | PASS |
| A11 | Q "how is push sent" | Inline after the write, bounded by a deadline, never fails the write | notifications.service.ts:43, 122, 183-190; web-push.adapter.ts:60 | `PUSH_SEND_DEADLINE_MILLISECONDS = 5_000;` / `return await Promise.race([sends, deadline]);` / `catch (error) { … return 'failed'; }` / `timeout: PUSH_SOCKET_TIMEOUT_MILLISECONDS,`. Every caller notifies after its transaction returns (setlists.service.ts:120-127, 246-261) | PASS |
| A12 | Q "member deleted" | Keep takes; drop subscriptions and preferences | members.repository.ts:137; notifications.repository.ts:132-139; takes.repository.ts:70 | `await deletePushStateOfDeletedMember(transaction, id);` / `.leftJoin(memberTable, eq(memberTable.id, takeTable.memberId))` | PASS |
| A13 | Q "recording format" | Whatever MediaRecorder produces, normalised | domain/take-upload.core.ts:58-64 | `const essence = mediaType.trim().toLowerCase(); if (isTakeContentType(essence)) return essence;` | PASS |
| A14 | Q "installing the app" + Result *Install banner* | Banner inside the app shell only; scene views carry none | site/src/components/organisms/AppShell.tsx:188; site/src/App.tsx:40-42 | `<InstallOffer />` inside `<main>`; `/catalog/:songId/scene` and `/setlists/:setlistId/scene` are declared before `<Route element={<AppShell />}>` | PASS |
| A15 | Result *Install banner*, iOS and Android steps | Device-matched walkthrough; real Install button only once Chrome deferred its prompt | site/src/lib/install-offer.utils.ts:36-40, 53-56, 62-66 | `'ios-other-browser': ['open-in-safari', ...IOS_SAFARI_STEPS],` / `if (device.isStandalone \|\| device.isDismissed) return null;` / `return walkthrough === 'android' && hasDeferredPrompt;` | PASS |
| A16 | ADR-0040 + revision 2026-10-24 | `web-push` in one adapter; VAPID pair in `vapid_key_pair`, generated on first use with `ON CONFLICT DO NOTHING`; no SSM VAPID parameter; table blocklisted | web-push.adapter.ts:5, 37; notifications.service.ts:49-56; notifications.repository.ts:150-158; 0019_vapid_key_pair.sql; cdk/lib/stack.ts:128-135, 152-157 | `const generated = webPush.generateVAPIDKeys();` / `await insertVapidKeyPairUnlessPresent(generateVapidKeyPair());` / `.values({ id: VAPID_KEY_PAIR_ID, ...pair }).onConflictDoNothing()` / `'push_subscription', 'take', 'take_comment', 'vapid_key_pair',` / `resourceName: SPOTIFY_CREDENTIALS_PARAMETER.slice(1)`; pinned by stack.test.ts:251 `grants reading exactly the Spotify parameter, and names no VAPID parameter` | PASS |
| A17 | ADR-0043 | Unique index on `song.deezer_track_id`; the import returns the winner; a member's create or edit gets a 409 naming the holder | 0018_one_song_per_deezer_track.sql:14; songs.service.ts:81-90, 198-207; songs.controller.ts:49, 70 | `CREATE UNIQUE INDEX IF NOT EXISTS "song_deezer_track_id_unique" ON "song" ("deezer_track_id");` / `if (!isUniqueViolation(error) \|\| deezerTrackId == null) throw error;` / `if (!isLostInsertRace(error)) throw error;`. The runner rewrites the statement to `ASYNC` (infra/cdk/src/internal/migration-runner/statement-rewrites.utils.ts:54) | PASS |
| A18 | Changes → app.ts | `/api/takes` and `/api/notifications` mounted | api/src/app.ts:65-66 | `.route('/api/takes', buildTakesRouter())` / `.route('/api/notifications', buildNotificationsRouter())` | PASS |
| A19 | Changes → DB | Six tables plus the index, no FK, no `DEFAULT now()` | migrations 0017, 0018, 0019 | `scripts/check-migration-sql-dsql-compat.sh` exit 0; `migrations.audit.test.ts` passes in C02 | PASS |
| A20 | Changes → routes | Routes compose organisms | routes/catalog/SongDetailPage.tsx (88 lines), routes/sessions/SessionDetailPage.tsx (59), routes/account/AccountPage.tsx:8 | `return <AccountSettings />;` | PASS |
| A21 | Changes → VOCABULARY | Take, Take comment, Push subscription, Notification preference | apps/pragma/VOCABULARY.md | `scripts/check-vocabulary-paths.sh` exit 0: "every term names a folder that exists, every Held by names a test that exists" | PASS |
| A22 | Changes → talos catalog | `web-push` 3.6.7 and `@types/web-push` 3.6.4 in the catalog, both apps on `catalog:` | pnpm-workspace.yaml; apps/talos/package.json; apps/pragma/package.json | `web-push: '3.6.7'` / `"web-push": "catalog:",` | PASS |
| A23 | Analytics | Input events emitted | takes.service.ts:130, 198; notifications.service.ts:75, 136, 162; site take-queue.setup.ts:40 | `recordProductEvent({ event: 'take_created', source: input.source, queued: input.queued });` / `recordTakeBreadcrumb('take_upload_retried')` | PASS |
| A24 | Zero-defect | `TakeUploadFailed` tagged `take.stage`, `TakeQueueWriteFailed`, `PushSendFailed` with host and status (404/410 not reported), `RecordingInterrupted` breadcrumb | site/src/observability/error-reporting.adapter.ts:55-69; notifications.service.ts:128-135; RecordingSheet.tsx:97 | `tags: { 'take.stage': failure.stage, … }` / `tags: { 'push.host': failure.host, 'push.status': status }` / `recordTakeBreadcrumb('RecordingInterrupted');` | PASS |
| A25 | Out of scope | No waveform, transcoding, best take, badge, e-mail or MCP | diff file list | none of them appear in the 284 changed paths | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | ESLint clean | `pnpm exec eslint --no-warn-ignored --max-warnings 0` on every added or modified .ts/.tsx/.js | exit 0 (only the "Multiple projects found" notice) | PASS |
| B02 | Typecheck | `pnpm --filter @borso-app/pragma run typecheck` (cdk + app) | exit 0 | PASS |
| B03 | Prettier | `pnpm exec prettier --check` on the changed non-markdown files | "All matched files use Prettier code style!" | PASS |
| B04 | knip | `pnpm exec knip` | exit 0, configuration hints only | PASS |
| B05 | No `any` | `grep -nP '\bany\b'` on changed sources | only prose in test names and one `@BlueprintUsage` line | PASS |
| B06 | Type assertions | `grep -nE '\bas [A-Z]…\|as unknown as'` on changed sources | none found; `borso/no-type-assertion-except-unknown` passes in B01 | PASS |
| B07 | `useEffect` is a smell | `grep -nE '\buseEffect\(\|useLayoutEffect\('` on changed sources | none found. The queue, install prompt and clock are external stores (`take-queue.store.ts`, `install-prompt.hook.ts`, `second-clock.store.ts`) | PASS |
| B08 | No comments in code | `borso/no-comments` through B01; `scripts/check-no-comments-in-styles-and-markup.sh` for `tokens.css` | both exit 0. SQL header comments in migrations follow 0001 to 0016 | PASS |
| B09 | Every `*.utils.ts` / `*.core.ts` has its sibling test | loop over `git ls-files 'apps/pragma/**/*.{utils,core}.ts'` | no file missing a `.test.ts` | PASS |
| B10 | `.core.ts` takes `now` as a parameter | read | notifications.core.ts:213 `isGroupDue(lastSentAt: Date \| null, now: Date)`; `conflict-abort.core.ts` and `reorder.core.ts` read no clock | PASS |
| B11 | DSQL migration compat | `scripts/check-migration-sql-dsql-compat.sh` | exit 0 | PASS |
| B12 | Controllers dispatch | read the takes, notifications and songs controllers | each parses input, calls one service and maps the outcome to a status, e.g. songs.controller.ts:49 `if (outcome.kind === 'deezer-track-taken') {` | PASS |
| B13 | Names and magic numbers | sampled `CONFLICTED_WRITE_MAX_ATTEMPTS`, `VAPID_KEY_PAIR_ID`, `PUSH_SEND_DEADLINE_MILLISECONDS`, `IOS_OTHER_BROWSER_PATTERN`, `didClaimSessionUnlessLooseWithin` | named; no one-letter locals found | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm run test:core` in apps/pragma | 0: 257 files, 2579 tests; coverage 100% statements (4064/4064), branches (1928/1928), functions (1182/1182), lines (3471/3471) | PASS |
| C02 | @borso-app/pragma | `pnpm run test` in apps/pragma (back-e2e, local Postgres) | 0: 29 files, 297 tests, 720 s | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Live 2: keeps the screen awake | `records, stops, queues the take …` at site/src/components/organisms/RecordingSheet.test.tsx:63, which finds `'screen kept awake'` | PASS |
| D02 | Live 3: Stop stores the take in the device queue | RecordingSheet.test.tsx:63, asserting `queue.queueTake` was called with `songId: 'song-1', sessionId: 'session-1', … source: 'live'` | PASS |
| D03 | Live 3: then uploads it and creates it | `signs, sends and creates a queued take, then forgets it` at site/src/lib/take-queue.store.test.ts:94 | PASS |
| D04 | Live 5: other members with takes on get "Hugo posted a take of Seven Nation Army" | `sends once per device of every other member with the category on, never to the author` at api/src/notifications/notifications.controller.test.ts:263, asserting `messageKey: 'take-created', parameters: { actorName: 'Hugo', songTitle: 'Seven Nation Army' }`; text from `renders a take notification in English …` at site/src/sw/service-worker.test.ts:144 | PASS |
| D05 | Upload 2: the file's own date proposed as recording time | `proposes the date of the file and the practice nearest to it` at TakeUploadForm.test.tsx:74 | PASS |
| D06 | Upload 2: nearest practice within a day preselected | `preselects a practice up to a day away` / `preselects nothing past a day` at take-upload-form.core.test.ts:27, 32 | PASS |
| D07 | Comments 1 and 3: one comment with a moment, one without, both in the thread | `keeps a comment with a moment and one without, oldest first, and counts them` at api/src/takes/takes.controller.test.ts:517 | PASS |
| D08 | Comments 2: a mark at the moment on the timeline | `marks each pinned comment at its share of the take, the free ones nowhere` at take-player.core.test.ts:55. The seek itself is visual-routed | PASS |
| D09 | Result: "At 1:42" toggle on while paused past zero | `is on while the player is paused past zero` / `is off while playing, and off at the very start` at take-player.core.test.ts:11, 15 | PASS |
| D10 | Edge: banner only on a phone or tablet browser not running installed (`display-mode: standalone` or `navigator.standalone`) | install-offer.utils.test.ts:63, 68, 74, 78 (`offers nothing once pragma runs installed, on either platform`); display-mode.adapter.test.ts:34 `reads either the iOS home screen flag or the standalone display mode as installed` | PASS |
| D11 | Edge: dismissal remembered on that device in local storage | `hides once dismissed and stays hidden on the next visit` at InstallOffer.test.tsx:130, asserting `localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY)).toBe('dismissed')` and an empty re-render | PASS |
| D12 | Edge: a storage that refuses the write only brings the banner back next time | InstallOffer.test.tsx:142 (hidden this visit, nothing stored); install-prompt.adapter.test.ts:175 `treats a storage that refuses as never dismissed, so the banner comes back`, asserting `isInstallBannerDismissed(() => REFUSING_STORAGE)).toBe(false)` | PASS |
| D13 | Edge: another iOS browser starts with "open this page in Safari" | install-offer.utils.test.ts:49, 99; InstallOffer.test.tsx:113, asserting the dialog `toContain('open it in Safari')` | PASS |
| D14 | Result: Android shows a real Install button once Chrome deferred its prompt | `offers Chrome its own prompt on Android once it was deferred, and hides after an install` at InstallOffer.test.tsx:151, asserting `findButton('Install')).toBeNull()` before the event and `deferred.prompt` called once after | PASS |
| D15 | Edge: sort by `recordedAt` descending | `lists takes by recording time, newest first, whatever order they were uploaded in` at takes.controller.test.ts:290 | PASS |
| D16 | Edge: pending on this device only | `slots a take waiting on this device among the listed ones, newest first` at take-list.core.test.ts:44 | PASS |
| D17 | Edge: the queue retries when the app opens | `loads what an earlier visit left on the device, once` at take-queue.store.test.ts:264; structural: take-queue.setup.ts:52 chains `.load()` into the drain. The `online` half is visual-routed (offline scenario) | PASS |
| D18 | Edge: deleting a session keeps its takes and clears `session_id` | `deleting the session keeps its takes and clears their session` at takes.controller.test.ts:771 | PASS |
| D19 | Edge: deleting a song deletes takes, comments and audio | `deleting the song deletes its takes, their comments and their audio` at takes.controller.test.ts:715; race at :740 | PASS |
| D20 | Edge: any member deletes any take or comment | takes.controller.test.ts:446 `lets any member delete another member’s take …`, :690 `lets another member delete a comment, once` | PASS |
| D21 | Edge: two devices, two notifications | notifications.controller.test.ts:263 expects `deviceEndpoint('lea-laptop'), deviceEndpoint('lea-phone')` | PASS |
| D22 | Edge: setlist, lineup and transition changes to one setlist within 10 minutes send once | notifications.controller.test.ts:421, `toHaveBeenCalledTimes(3)` after two writes, `6` after eleven minutes; every setlist edit kind incl. `lineupOverride` at notifications.fan-out.test.ts:160 | PASS |
| D23 | Edge: a transition comment groups on its pair of songs | `a transition comment, grouped on its pair of songs` at notifications.fan-out.test.ts:202 | PASS |
| D24 | Edge: the author is never notified | notifications.controller.test.ts:263, `hugo-phone` absent from the sent endpoints | PASS |
| D25 | Edge: session changes group per session over 10 minutes | `a session created, then changed, grouped on that session` at notifications.fan-out.test.ts:131 | PASS |
| D26 | Edge: tapping a notification opens what changed | URLs asserted in the fan-out tests (take `^/catalog/<id>?take=`, setlist `/setlists/<id>` at notifications.controller.test.ts:444); `focuses an open window and sends it to the notification URL` at service-worker.test.ts:267 | PASS |
| D27 | Edge: deleting a member keeps takes and comments as "former member" | `deleting the author keeps their takes and comments, with no name to show` at takes.controller.test.ts:788; label at take-list.core.test.ts:115 | PASS |
| D28 | Edge: deleting a member deletes their subscriptions and preferences | `takes their devices and toggles with them` at notifications.controller.test.ts:451, asserting `notificationPreferenceTable` `toEqual([])` | PASS |
| D29 | Account: on an iPhone not installed, the section says iOS needs the installed app | `asks an iPhone in the browser to install pragma first, even without push support` at notifications-offer.core.test.ts:28; NotificationSettings.test.tsx:163 `tells an iPhone in the browser to install pragma, with no Enable button` | PASS |
| D30 | Error: microphone denied → says so, offers Upload | recording-sheet.core.test.ts:64; RecordingSheet.test.tsx:89 | PASS |
| D31 | Error: phone locks → recorded part kept, sheet says it was cut | recorder.adapter.test.ts:166 `keeps what was recorded when the system stops the recorder`; RecordingSheet.test.tsx:103 | PASS |
| D32 | Error: over 50 MiB or not audio, refused before upload with the limit named | take-upload-form.core.test.ts:108 `names the limit for a file over it`, :115; takes.controller.test.ts:232 `refuses a take one byte over 50 MiB` | PASS |
| D33 | Error: storage full → offered as a download | take-queue.adapter.test.ts:187 `answers quota-exceeded when the device is full`; RecordingSheet.test.tsx:123 | PASS |
| D34 | Error: 404 or 410 deletes that subscription | notifications.controller.test.ts:340 (410), asserting `listStoredEndpoints()).toEqual([deviceEndpoint('hugo-phone')])`; 404 in the `classifyPushFailure` units of notifications.core.test.ts | PASS |
| D35 | Error: any other push failure is reported and never fails the write | notifications.controller.test.ts:353 (503 reported, kept), :369 (fails outright → 201), :390 (deadline → 201) | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `createTake` → `hasInsertedTakeWithin` (takes.repository.ts:91-101) | One take and one notification round per client id | Primary key `take.id`, `.onConflictDoNothing().returning(...)`; only a new row notifies (takes.service.ts:129). Concurrent: takes.controller.test.ts:324 (`Promise.all`, one row), notifications.controller.test.ts:311 (one round) | PASS |
| E02 | `recordTake` claims song and session (takes.service.ts:75-93) | Take written for a song or session deleted meanwhile | Conditional `UPDATE … RETURNING` claims (`didClaimSongWithin`, songs.repository.ts:234-243) in the inserting transaction, retried by `runInOneTakeTransaction`. Tests: takes.controller.test.ts:382, :399 (deleted while writing), :431 (conflict retried) | PASS |
| E03 | `recordComment` → `findClaimedTakeWithin` (takes.repository.ts:121-135) | Comment left on a take deleted meanwhile | Claim on the take row in the comment's transaction; take delete removes the row before its comments. Tests: takes.controller.test.ts:581, :740, :614 | PASS |
| E04 | `patchTakeComment` (takes.service.ts:203-216) | Moment checked from an earlier read | The read is `durationSeconds`, which no path updates (the only `update(takeTable)` calls set `objectKey` to itself and `sessionId` to null); a deleted take removes the comment, so the update finds no row → `comment-not-found` | PASS |
| E05 | `subscribeToPush` → `saveSubscription` (notifications.repository.ts:34-41) | One row per device | Primary key `endpoint`, `.onConflictDoUpdate`. Concurrent: notifications.controller.test.ts:189, `[201, 201]` and one stored endpoint | PASS |
| E06 | `notifyBand` → `hasClaimedDispatch` (notifications.repository.ts:103-127) | Two Lambdas sending for one group | Primary key `group_key` on the first claim, then `UPDATE … WHERE last_sent_at = previous RETURNING`; a conflict abort reads as not claimed (notifications.service.ts:107). Concurrent: notifications.controller.test.ts:470, `Promise.all` twice | PASS |
| E07 | `readVapidKeys` → `insertVapidKeyPairUnlessPresent` (notifications.service.ts:49-56; repository :150-158) | Two first uses generating two pairs | Primary key `id` = 1, `onConflictDoNothing`, then both read back the stored row. Concurrent: notifications.controller.test.ts:140 under `runWithWritesToTableHeld('vapid_key_pair', 2, …)`, asserting `keys[1]).toBe(keys[0])` and one row; conflict retry at :152 | PASS |
| E08 | `updatePreference` → `savePreference` (notifications.repository.ts:77-84) | Duplicate preference row | Primary key `(member_id, category)`, last write wins, which is what a toggle means | PASS |
| E09 | Setlist entries: append, reorder, remove-and-compact, attach to a session (setlists.service.ts:103-322) | Same position written twice; a mixed reorder | Setlist or session row claimed in one retried transaction. Concurrent: setlists.controller.test.ts:188 (two appends), :209 (two reorders), :242 (append + reorder), :388 (two attaches), :423, :554, :573 (deleted meanwhile) | PASS |
| E10 | Audience: open a round (audience.service.ts:103, 142); create the audience-choice setlist (setlists.repository.ts:206-214) | Two rounds or two setlists for one concert | Round: claim on the audience-choice setlist row; setlist: primary key equal to the concert id with `ON CONFLICT DO NOTHING`. Concurrent: audience.controller.test.ts:420 (one 201, one 409, one row), :468 | PASS |
| E11 | Suggested song import (songs.service.ts:198-207) | Two suggestions of one unknown track importing two songs | Unique index `song_deezer_track_id_unique` (0018), ratified by ADR-0043; the loser of `isLostInsertRace` returns the winner. Concurrent: audience.controller.test.ts:687, `secondSong.id).toBe(firstSong.id)` and `before + 1` songs. ADR-0043 states that DSQL does not enforce the index until its asynchronous build completes; see Notes | PASS |
| E12 | Tasks create and patch (tasks.service.ts) | Task naming a member or song deleted meanwhile | `didClaimMemberWithin` / `didClaimSongWithin` in `runInOneTaskTransaction`. Tests: tasks.controller.test.ts:194, :231, :248 | PASS |
| E13 | Member instrument assignment (members.service.ts / repository) | Links for a member or instrument deleted meanwhile | Member and instrument claims in one transaction. Tests: members.controller.test.ts:271, :398, :447 | PASS |
| E14 | Instrument reorder (instruments.service.ts) | Partial or mixed order | Claims every named instrument, re-reads the ids and writes the positions in one retried transaction. Tests: instruments.controller.test.ts:240, :272 | PASS |
| E15 | `logStudy` → `recordStudy` (studies.service.ts) | Study naming a song or instrument deleted meanwhile | Song and instrument claims, lineup read and insert in `runInOneStudyTransaction`. Tests: studies.controller.test.ts:373, :392, :414 | PASS |
| E16 | Cascades: `deleteSongWithCascade`, `deleteSessionWithCascade`, `deleteMemberWithLinks`, `deleteTakeWithComments` | Run inside the deleting transaction, row first | songs.repository.ts:263, sessions.repository.ts:123, members.repository.ts:137 call the cascade with `transaction`; takes.repository.ts:146-152 deletes the take before its comments | PASS |
| E17 | Module-level state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on changed api files | only `let cachedClient: S3Client \| null` (uploads.adapter.ts:13), a client cache that holds no rule. The VAPID pair is no longer cached per process; each read goes to `vapid_key_pair` | PASS |

## Notes

- **No FAIL rows.** The three rounds of findings graded at c4c69db4 stay closed, and every row above was re-checked against 66425fcd.
- **E11 and ADR-0043.** This validator's own rule says a unique index does not hold a rule on Aurora DSQL, because DSQL builds it asynchronously. ADR-0043 chose the index over a primary-key claim table (its Option B) with that window named as a consequence, plus two operator steps: merge duplicate track ids in prod before deploying, and confirm the `sys.jobs` build after. The row is graded against that decision. The ADR's status is still `proposed`; the PR should say the operator ratified it, and those two operator steps belong in the PR body.
- **Question (E11, no failing case on local Postgres).** On DSQL, two members *creating* songs with the same Deezer track at once may lose with `OC000` rather than `23505`. `refuseTakenDeezerTrack` (songs.service.ts:86) only maps `isUniqueViolation`, so that loser would get a 500 rather than the 409 `deezer-track-taken`. The rule still holds (one row), and the spec states no code for this case. Should `createSong` and `patchSong` retry a conflict abort as the import does?
- **Question (E05, E08).** `saveSubscription` and `savePreference` have no `retryingConflictAborts`, so on DSQL a device subscribing twice at once, or a toggle sent at the same moment twice, can answer 500 for the loser. The stored rows are correct either way. Is it worth wrapping them the way `insertVapidKeyPairUnlessPresent` is?
- **Spec drift, not a finding.** The spec's *Database changes* sketch still shows `push_subscription (id uuid PRIMARY KEY, … endpoint text NOT NULL UNIQUE …)`. The table keys on `endpoint`, which holds the spec's own rule (one row per device) where the sketch would not on DSQL. The PR should name this.
- **Questions carried from the previous pass, still open with the operator.** Take comments group per take over 10 minutes (`take-comment:<takeId>`), which the spec does not state. The group claim is shared, so the author of the first change in a window is not told about a second member's change inside it.
- **Not run here.** The spec asks for mutation gating on the pure cores; Stryker was not run in this pass (pre-push runs it scoped to changed `*.core.ts` / `*.utils.ts`, and `full-suite.yml` unscoped on `main`). `talos`'s own suites were not re-run; its diff is the two `catalog:` lines (A22), and the catalog pins the same versions it pinned before.

## Verdict: PASS

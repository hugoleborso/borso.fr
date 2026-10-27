# Technical validation — Song takes and web push

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/pragma-takes-and-push, validated at 1412fe64 on `worktree-wf_035cd72e-a86-7` (the fix round). The main checkout of the branch is still at d4a31ea9, which lacks the two fix commits; see Notes
- Base: origin/main
- Run at: 2026-10-24T00:08:54Z (round 02, after the first fix round)
- Touched workspaces: @borso-app/pragma (api, site, domain, cdk), @borso-app/talos (package.json catalog move only)

The `technical-validator` agent could not be dispatched as a separate agent, because this workflow subagent has no Agent tool. The pass was run in place by `technical-validation-02`, which wrote none of the implementation, following `plugins/borso-harness/agents/technical-validator.md` step by step. Rows A01 to A19, B04 to B12, D01 to D04, D06 to D27 and E03 to E07 are carried from round 01 (`technical-validation-2026-10-23-2335.md`) because the fix round changed none of the files they cite except as noted; every gate in B and C was rerun on 1412fe64.

Six use cases are routed to `/visual-validation` by the spec's *Test strategy* and are out of scope here: live recording from the fake microphone, the take first on the song page, a fixture upload, a moment comment moving the player, offline pending then online upload, and enabling push with toggles that save.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Q "one recording" | One take per song | apps/pragma/api/src/takes/takes.schema.ts:20 | `songId: uuid('song_id').notNull(),` | PASS |
| A02 | Q "feedback" | One table, optional moment | apps/pragma/api/src/takes/takes.schema.ts:38, takes.core.ts:28-31 | `atSeconds: integer('at_seconds'),` / `if (atSeconds === null) return true;` | PASS |
| A03 | Q "session optional" | `session_id` nullable, cleared on session deletion | apps/pragma/api/src/takes/takes.repository.ts:170-178; sessions.repository.ts (deleteSessionWithCascade) | `.set({ sessionId: null }).where(eq(takeTable.sessionId, sessionId))` | PASS |
| A04 | Q "retention and size" | 50 MiB per file, enforced at sign and by S3 | apps/pragma/domain/take-upload.core.ts:18-19; takes.schema.ts:51; uploads.adapter.ts (presignPutObject) | `TAKE_MAX_MEBIBYTES = 50` / `contentLength: z.number().int().positive().max(TAKE_MAX_BYTES)` / `ContentLength: params.contentLength,` | PASS |
| A05 | Q "where is Record" | Record per song on a practice, Record + Upload on the song page | apps/pragma/site/src/routes/sessions/SessionDetailPage.tsx:173; SongDetailPage.tsx:245; PracticeRecordingList.tsx | `{isConcert ? null : <PracticeRecordingList sessionId={session.id} setlists={setlists} />}` | PASS |
| A06 | Q "bad network" | IndexedDB queue, retried on open and on `online` | apps/pragma/site/src/lib/take-queue.setup.ts:50-56 | `takeQueue.load().then(drainTakeQueue)` / `window.addEventListener(ONLINE_EVENT, drainTakeQueue);` | PASS |
| A07 | Q "notifications" | Web push via the `push` and `notificationclick` handlers | apps/pragma/site/public/sw.js (push, notificationclick listeners) | `self.addEventListener('push', (event) => {` / `event.waitUntil(focusOrOpen(...))` | PASS |
| A08 | Q "burst of setlist edits" | One notification per group per 10 minutes | apps/pragma/api/src/notifications/notifications.core.ts:216-219; notifications.service.ts:94-103 | `return now.getTime() - lastSentAt.getTime() >= NOTIFICATION_GROUP_WINDOW_MILLISECONDS;` | PASS |
| A09 | Q "preferences" | Per category, all on before the first toggle | apps/pragma/api/src/notifications/notifications.core.ts:166-172 | `return stored?.enabled ?? true;` | PASS |
| A10 | Q "how is push sent" | Inline after the write, deadline-bounded, never fails the write | apps/pragma/api/src/notifications/notifications.service.ts:105-119, 177-185; web-push.adapter.ts:82 | `return await Promise.race([sends, deadline]);` / `catch (error) { ... return 'failed'; }` / `timeout: PUSH_SOCKET_TIMEOUT_MILLISECONDS,` | PASS |
| A11 | Q "member deleted" | Keep takes; drop subscriptions and preferences | apps/pragma/api/src/members/members.repository.ts:139; notifications.repository.ts:127-133; takes.repository.ts:50-54 (left join) | `await deletePushStateOfDeletedMember(transaction, id);` / `.leftJoin(memberTable, eq(memberTable.id, takeTable.memberId));` | PASS |
| A12 | Q "recording format" | Whatever MediaRecorder produces, normalised | apps/pragma/domain/take-upload.core.ts:37-44 | `const essence = mediaType.trim().toLowerCase(); if (isTakeContentType(essence)) return essence;` | PASS |
| A13 | ADR-0040 | `web-push` in one adapter, per-stage VAPID SSM names, blocklist | apps/pragma/api/src/notifications/web-push.adapter.ts:6; cdk/lib/stack.ts (buildVapidParameterNames, tableBlocklist) | `VAPID_PUBLIC_PARAMETER: \`/${APP_SLUG}/${stage}/vapid-public\`` / `'push_subscription', 'take', 'take_comment',` | PASS |
| A14 | Changes → app.ts | `/api/takes` and `/api/notifications` mounted | apps/pragma/api/src/app.ts | routes mounted; `tsc --noEmit` on the site passes (C01) | PASS |
| A15 | Changes → DB | Five tables, no FK, no `DEFAULT now()` | apps/pragma/api/src/database/migrations/0017_takes_and_push.sql:9-64 | `CREATE TABLE IF NOT EXISTS "take" ( ... "created_at" timestamp with time zone NOT NULL` | PASS |
| A16 | Changes → VOCABULARY | Take, Take comment, Push subscription, Notification preference | apps/pragma/VOCABULARY.md | `scripts/check-vocabulary-paths.sh` exit 0 | PASS |
| A17 | Analytics | Input events emitted | apps/pragma/api/src/takes/takes.service.ts:90,166; notifications.service.ts:68,129,155; site take-queue.setup.ts:40 | `recordProductEvent({ event: 'take_created', source: input.source, queued: input.queued });` | PASS |
| A18 | Zero-defect | `PushSendFailed` tagged with host and status, 404/410 not reported | apps/pragma/api/src/notifications/notifications.service.ts:121-131; notifications.core.ts:135-144 | `if (outcome?.delivery !== 'failed') return [];` / `tags: { 'push.host': failure.host, 'push.status': status }` | PASS |
| A19 | Out of scope | No waveform, transcoding, best take, badge, e-mail, MCP | diff file list | none of these appear in the 130 changed files | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | ESLint clean | `pnpm exec eslint --no-warn-ignored --max-warnings 0` over the 110 added or modified .ts/.tsx/.js against origin/main | exit 0 | PASS |
| B02 | Typecheck | `pnpm run typecheck` in apps/pragma (cdk and app tsconfig) | exit 0 | PASS |
| B03 | knip | `pnpm exec knip` | exit 0 (configuration hints only) | PASS |
| B04 | No `any` | `grep -nP '\bany\b'` on changed sources | only `expect.any(...)` and prose in test names | PASS |
| B05 | Type assertions | `grep -nE ' as [A-Z]'` on changed sources | only `import * as Sentry` and prose; `borso/no-type-assertion-except-unknown` passes in B01 | PASS |
| B06 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed site files | none found; the queue uses an external store (take-queue.store.ts:319), the wake lock a ref callback (RecordingSheet.tsx:162) | PASS |
| B07 | No comments in code | `borso/no-comments` through B01 | exit 0; SQL comments in the migration follow every earlier migration (0001 to 0016) | PASS |
| B08 | `.utils.ts` have sibling tests | listing | notifications.utils, takes.utils, vapid-key.utils each have a `.test.ts` | PASS |
| B09 | `.core.ts` takes `now` as a parameter | read | notifications.core.ts:216 `isGroupDue(lastSentAt, now)`, take-queue.core.ts:51 `nowEpochMilliseconds` | PASS |
| B10 | DSQL migration compat | `scripts/check-migration-sql-dsql-compat.sh` on 0017_takes_and_push.sql; `blueprint-indexing.ts --check`, `convention-drift.ts --check`, `check-vocabulary-paths.sh` | exit 0 on all four | PASS |
| B11 | Controllers dispatch | read takes.controller.ts, notifications.controller.ts | parse, call service, map outcome to status; no domain `.filter`/`.map` | PASS |
| B12 | Names, magic numbers | sampled `PUSH_SEND_DEADLINE_MILLISECONDS`, `TAKE_STEP_MAX_ATTEMPTS`, `NEAREST_PRACTICE_WINDOW_MILLISECONDS`, `DELETE_OBJECTS_BATCH_SIZE` | named; no one-letter locals found | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm run test:core` | 0, 247 files / 2508 tests, coverage 100% statements (3989/3989) and branches (1898/1898), functions and lines | PASS |
| C02 | @borso-app/pragma | `pnpm run test` (back-e2e, local Postgres) | 0, 29 files / 262 tests | PASS |
| C03 | @borso-app/talos | not rerun: the fix round touched no talos file; round 01 ran `test:core` green on the same talos tree | n/a | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Live 3: Stop stores the take in the device queue | `records, stops, queues the take for its song and session, and closes` at site/src/components/organisms/RecordingSheet.test.tsx:63, asserting `expect(queue.queueTake).toHaveBeenCalledWith({ songId: 'song-1', sessionId: 'session-1', ... source: 'live' }, ...)` | PASS |
| D02 | Live 3: then uploads it and creates it | `signs, sends and creates a queued take, then forgets it` at site/src/lib/take-queue.store.test.ts:94 | PASS |
| D03 | Live 2: keeps the screen awake | RecordingSheet.test.tsx:70 `expect(await screen.findByText('screen kept awake')).toBeTruthy();` | PASS |
| D04 | Live 5: others get "Hugo posted a take of …" | `sends once per device of every other member …` at api/src/notifications/notifications.controller.test.ts:220, asserting `messageKey: 'take-created', parameters: { actorName: 'Hugo', songTitle: 'Seven Nation Army' }`; text rendered by `renders a take notification in English …` at site/src/sw/service-worker.test.ts:144 | PASS |
| D05 | Upload 2: the form proposes the file's own date as the recording time | `proposes the date of the file and the practice nearest to it` at apps/pragma/site/src/components/organisms/TakeUploadForm.test.tsx:74, picking a `File` with `lastModified: FILE_LAST_MODIFIED` and asserting `expect(readFieldValue('Recorded at')).toBe(toDateTimeLocalValue(new Date(FILE_LAST_MODIFIED)));`; the source line is TakeUploadForm.tsx:97 `const fileDate = new Date(file.lastModified);`. The submitted value is pinned at :94 (`recordedAt: new Date(toDateTimeLocalValue(new Date(FILE_LAST_MODIFIED)))`) | PASS |
| D06 | Upload 2: the practice closest within a day is preselected | `preselects a practice up to a day away` / `preselects nothing past a day` at site/src/components/organisms/take-upload-form.core.test.ts:27,32 | PASS |
| D07 | Comments 1 and 3: a comment with a moment and one without, both in the thread | `keeps a comment with a moment and one without, oldest first, and counts them` at api/src/takes/takes.controller.test.ts:390 | PASS |
| D08 | Edge: sort by `recordedAt` descending | `lists takes by recording time, newest first, whatever order they were uploaded in` at api/src/takes/takes.controller.test.ts:261 | PASS |
| D09 | Edge: pending on this device only | `slots a take waiting on this device among the listed ones, newest first` at site/src/components/organisms/take-list.core.test.ts:44 | PASS |
| D10 | Edge: queue retried when the app opens | `loads what an earlier visit left on the device, once` at site/src/lib/take-queue.store.test.ts:264; structural: take-queue.setup.ts:51-53 chains `load().then(drainTakeQueue)`. The `online` half is in the visual offline scenario | PASS |
| D11 | Edge: deleting a session keeps its takes, clears `session_id` | `deleting the session keeps its takes and clears their session` at api/src/takes/takes.controller.test.ts:579 | PASS |
| D12 | Edge: deleting a song deletes takes, comments and audio | `deleting the song deletes its takes, their comments and their audio` at api/src/takes/takes.controller.test.ts:541 | PASS |
| D13 | Edge: any member deletes any take or comment | takes.controller.test.ts:337 and :516 | PASS |
| D14 | Edge: two devices, two notifications | notifications.controller.test.ts:220 expects `deviceEndpoint('lea-laptop'), deviceEndpoint('lea-phone')` | PASS |
| D15 | Edge: setlist and lineup changes within 10 minutes send once | `sends one notification for a burst of writes to one setlist, and again after ten minutes` at notifications.controller.test.ts:348 (`toHaveBeenCalledTimes(3)` then `6`); every setlist edit kind incl. `lineupOverride` at notifications.fan-out.test.ts:163 | PASS |
| D16 | Edge: a transition comment groups on its pair of songs | notifications.fan-out.test.ts:205 asserts `tag: \`transition:${songA}:${songB}\``, the same key `buildGroupKey` claims (notifications.core.ts:211-212) | PASS |
| D17 | Edge: the author is never notified | notifications.controller.test.ts:220, hugo-phone absent from the sent endpoints | PASS |
| D18 | Edge: session changes group per session over 10 minutes | `a session created, then changed, grouped on that session` at notifications.fan-out.test.ts:134 (`expect(sentCount(band)).toBe(afterCreate)`) | PASS |
| D19 | Edge: tapping a notification opens what changed | URLs asserted in fan-out tests (take, session, setlist); `focuses an open window and sends it to the notification URL` at site/src/sw/service-worker.test.ts:267 | PASS |
| D20 | Edge: deleting a member keeps takes and comments as "former member" | `deleting the author keeps their takes and comments, with no name to show` at takes.controller.test.ts:596; label at take-list.core.test.ts:115 | PASS |
| D21 | Edge: deleting a member deletes their subscriptions and preferences | `takes their devices and toggles with them` at notifications.controller.test.ts:379 | PASS |
| D22 | Error: microphone denied → says so, offers Upload | `offers Upload when the microphone is refused or missing` at recording-sheet.core.test.ts:64; RecordingSheet.test.tsx:89 | PASS |
| D23 | Error: phone locks → recorded part kept, sheet says it was cut | `keeps what was recorded when the system stops the recorder` at site/src/lib/recorder.adapter.test.ts:165; RecordingSheet.test.tsx:103 | PASS |
| D24 | Error: over 50 MiB or not audio, refused with the limit named | `names the limit for a file over it` at take-upload-form.core.test.ts:108; `refuses a take one byte over 50 MiB` at takes.controller.test.ts:203 | PASS |
| D25 | Error: storage full → offered as a download | `answers quota-exceeded when the device is full` at take-queue.adapter.test.ts:187; RecordingSheet.test.tsx:123 | PASS |
| D26 | Error: 404 or 410 deletes that subscription | notifications.controller.test.ts:270 (410); 404 in `classifyPushFailure` units, notifications.core.test.ts | PASS |
| D27 | Error: any other push failure is reported, never fails the write | notifications.controller.test.ts:284 (503 reported, kept), :301 (send fails outright → 201), :323 (deadline) | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | `subscribeToPush` → `saveSubscription` (apps/pragma/api/src/notifications/notifications.repository.ts:29-37) | Check-then-write: one row per device | Held by the primary key: `endpoint: text('endpoint').primaryKey()` (notifications.schema.ts:11; migration 0017 line 42 `"endpoint" text PRIMARY KEY NOT NULL`), the upsert's `onConflictDoUpdate({ target: pushSubscriptionTable.endpoint, ... })` claims it, and the async unique index is gone (schema test notifications.schema.test.ts:20 asserts `primaryColumns` is `['endpoint']` and `indexes` is `[]`). Concurrent test `keeps one subscription when a device subscribes twice at the same moment` at notifications.controller.test.ts:157 (`Promise.all` of two subscribes, both 201, `listStoredEndpoints()` equals one endpoint) | PASS |
| E02 | `createTake` → `hasInsertedTake` (apps/pragma/api/src/takes/takes.repository.ts:80-87) | Check-then-write: one take and one notification per client id | Held by the primary key `take.id`, `onConflictDoNothing().returning(...)`. Concurrent tests: `keeps one take when two tabs send the same create at the same moment` at takes.controller.test.ts:295 (`Promise.all`, both 201 with the same id, `toHaveLength(1)`), and `sends one round for a take two tabs send at the same moment` at notifications.controller.test.ts:281 (one take row, `expect(send).toHaveBeenCalledTimes(3)`, one round for the three other devices) | PASS |
| E03 | `notifyBand` → `hasClaimedDispatch` (notifications.repository.ts:94-125) | Two Lambdas sending for one group | Held by the primary key `group_key` on the first claim, and by a conditional `UPDATE … WHERE last_sent_at = previous RETURNING` afterwards; concurrent test `lets exactly one of two concurrent claims win, first send or later` at notifications.controller.test.ts:398 (`Promise.all`, `toHaveLength(1)` twice) | PASS |
| E04 | `updatePreference` → `savePreference` (notifications.repository.ts:72-80) | Duplicate preference row | Held by the primary key `(member_id, category)`; last write wins, which is the intended toggle semantics | PASS |
| E05 | `createTakeComment`, `patchTakeComment`, `removeTake`, `removeTakeComment` | Check-then-write | No limit or uniqueness rule depends on an earlier read; ids are fresh random uuids | PASS |
| E06 | Cascades in `deleteSongWithCascade`, `deleteSessionWithCascade`, `deleteMemberWithLinks` | Run inside the existing transaction | songs.repository.ts:278, sessions.repository.ts:108, members.repository.ts:139 call the cascade with `transaction` | PASS |
| E07 | Module-level state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on changed api files | `let cachedClient: S3Client \| null` (uploads.adapter.ts, preexisting client cache); VAPID keys read through `readSecureParameter`. Neither holds a rule the spec states | PASS |

## Notes

- **Round 01 FAIL rows, all closed.** E01 by a63be649 (endpoint as primary key, unique index dropped, concurrent back-e2e), E02 by the two `Promise.all` back-e2e tests in a63be649 and a5793be3, D05 by `TakeUploadForm.test.tsx` in a5793be3.
- **E01, what the concurrent test proves locally.** On local Postgres the old unique index would also have refused the second insert, so the back-e2e at notifications.controller.test.ts:157 cannot tell the two schemas apart. What closes the DSQL gap is structural, the primary key, and the schema test at notifications.schema.test.ts:20 pins that the rule rests on the key and on no secondary index.
- **E01, spec drift.** The spec's DDL wrote `id uuid PRIMARY KEY, endpoint text NOT NULL UNIQUE`. The table now has no `id` column and `endpoint` is the key, as in talos. Nothing read `id` (grep finds no reader in api, site or cdk), and no product behaviour changes. The spec's DDL block is now out of date on this one table; the plan or the PR should say so.
- **Migration 0017 edited in place.** a63be649 rewrites 0017 rather than adding 0018, on the claim that it has run nowhere. That holds on this evidence: the branch has no remote (`git branch -a` lists no `origin/claude/pragma-takes-and-push`), so no preview stack has applied it, and prod deploys only from `main`. It stops holding the moment a preview applies it.
- **Questions carried from round 01, still open, none blocking.** Comment grouping per take over 10 minutes (notifications.core.ts:203) is a plan choice the spec does not state. The group claim is shared across recipients, so an actor inside another member's window is not told of that member's change. `appendEntry` (setlists.service.ts) still computes `position: existing.length` from a read; preexisting and outside this spec.
- **The main checkout is behind the validated commit.** `/home/user/borso.fr` is at d4a31ea9 on `claude/pragma-takes-and-push`; the fix round's three commits are on `worktree-wf_035cd72e-a86-7` (1412fe64), which descends from d4a31ea9. The validator's fast-forward was refused by the session's permission classifier, so this pass ran in that worktree and this report is committed there. Fast-forward `claude/pragma-takes-and-push` to that branch before opening the PR; the verdict below applies to 1412fe64 plus this report, not to d4a31ea9.

## Verdict: PASS

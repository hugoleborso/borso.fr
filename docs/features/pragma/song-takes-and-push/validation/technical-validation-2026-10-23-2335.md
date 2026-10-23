# Technical validation — Song takes and web push

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/pragma-takes-and-push, at b709f5f9 (fast-forwarded from 8cfd1f38 to the tip of `worktree-wf_035cd72e-a86-5`, which holds the four implementation rounds)
- Base: origin/main
- Run at: 2026-10-23T23:35:34Z
- Touched workspaces: @borso-app/pragma (api, site, domain, cdk), @borso-app/talos (package.json catalog move only)

The `technical-validator` agent could not be dispatched as a separate agent, because this workflow subagent has no Agent tool. The pass was run in place by `technical-validation-01`, which wrote none of the implementation, following `plugins/borso-harness/agents/technical-validator.md` step by step.

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
| A11 | Q "member deleted" | Keep takes; drop subscriptions and preferences | apps/pragma/api/src/members/members.repository.ts:139; notifications.repository.ts:313-321; takes.repository.ts:50-54 (left join) | `await deletePushStateOfDeletedMember(transaction, id);` / `.leftJoin(memberTable, eq(memberTable.id, takeTable.memberId));` | PASS |
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
| B01 | ESLint clean | `pnpm exec eslint --no-warn-ignored --max-warnings 0` over every added or modified .ts/.tsx/.js | exit 0 | PASS |
| B02 | Typecheck | `pnpm --filter @borso-app/pragma typecheck`, same for talos | exit 0 both | PASS |
| B03 | knip | `pnpm exec knip` | exit 0 (configuration hints only) | PASS |
| B04 | No `any` | `grep -nP '\bany\b'` on changed sources | only `expect.any(...)` and prose in test names | PASS |
| B05 | Type assertions | `grep -nE ' as [A-Z]'` on changed sources | only `import * as Sentry` and prose; `borso/no-type-assertion-except-unknown` passes in B01 | PASS |
| B06 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed site files | none found; the queue uses an external store (take-queue.store.ts:319), the wake lock a ref callback (RecordingSheet.tsx:162) | PASS |
| B07 | No comments in code | `borso/no-comments` through B01 | exit 0; SQL comments in the migration follow every earlier migration (0001 to 0016) | PASS |
| B08 | `.utils.ts` have sibling tests | listing | notifications.utils, takes.utils, vapid-key.utils each have a `.test.ts` | PASS |
| B09 | `.core.ts` takes `now` as a parameter | read | notifications.core.ts:216 `isGroupDue(lastSentAt, now)`, take-queue.core.ts:51 `nowEpochMilliseconds` | PASS |
| B10 | DSQL migration compat | `scripts/check-migration-sql-dsql-compat.sh` | exit 0 | PASS |
| B11 | Controllers dispatch | read takes.controller.ts, notifications.controller.ts | parse, call service, map outcome to status; no domain `.filter`/`.map` | PASS |
| B12 | Names, magic numbers | sampled `PUSH_SEND_DEADLINE_MILLISECONDS`, `TAKE_STEP_MAX_ATTEMPTS`, `NEAREST_PRACTICE_WINDOW_MILLISECONDS`, `DELETE_OBJECTS_BATCH_SIZE` | named; no one-letter locals found | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:core` | 0, 246 files / 2505 tests, coverage 100% statements, branches, functions, lines | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test` (back-e2e, local Postgres) | 0, 29 files / 259 tests | PASS |
| C03 | @borso-app/talos | `pnpm --filter @borso-app/talos run test:core` (catalog move) | 0, 134 files / 1132 tests, 100% | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Live 3: Stop stores the take in the device queue | `records, stops, queues the take for its song and session, and closes` at site/src/components/organisms/RecordingSheet.test.tsx:63, asserting `expect(queue.queueTake).toHaveBeenCalledWith({ songId: 'song-1', sessionId: 'session-1', ... source: 'live' }, ...)` | PASS |
| D02 | Live 3: then uploads it and creates it | `signs, sends and creates a queued take, then forgets it` at site/src/lib/take-queue.store.test.ts:94 | PASS |
| D03 | Live 2: keeps the screen awake | RecordingSheet.test.tsx:70 `expect(await screen.findByText('screen kept awake')).toBeTruthy();` | PASS |
| D04 | Live 5: others get "Hugo posted a take of …" | `sends once per device of every other member …` at api/src/notifications/notifications.controller.test.ts:220, asserting `messageKey: 'take-created', parameters: { actorName: 'Hugo', songTitle: 'Seven Nation Army' }`; text rendered by `renders a take notification in English …` at site/src/sw/service-worker.test.ts:144 | PASS |
| D05 | Upload 2: the form proposes the file's own date as the recording time | (none found) | FAIL |
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
| E01 | `subscribeToPush` → `saveSubscription` (apps/pragma/api/src/notifications/notifications.repository.ts:215-223) | Check-then-write: one row per device | `push_subscription` is keyed on a random `id` (notifications.schema.ts:21); the one-row-per-endpoint rule rests on `uniqueIndex('push_subscription_endpoint_idx')` (notifications.schema.ts:28, migration line 48), which Aurora DSQL builds asynchronously. Two `POST /api/notifications/subscriptions` with the same endpoint arriving together (Enable tapped twice, or two tabs of one device) → two `push_subscription` rows for one endpoint → `selectRecipients` returns both and that device receives every notification twice. talos holds the same rule with `endpoint: text('endpoint').primaryKey()` (apps/talos/api/src/push/push.schema.ts:11). No concurrent test exists | FAIL |
| E02 | `createTake` → `hasInsertedTake` (apps/pragma/api/src/takes/takes.repository.ts:80-87) | Check-then-write: one take and one notification per client id | Held by the primary key `take.id`, `onConflictDoNothing().returning(...)`, the losing insert reads as "already created". No back-e2e fires two creates with the same id at once: takes.controller.test.ts:281 and notifications.controller.test.ts:241 send them one after the other. A queue drained by two tabs of one device (each tab has its own `draining` guard, take-queue.store.ts:394-399) sends exactly this pair | FAIL |
| E03 | `notifyBand` → `hasClaimedDispatch` (notifications.repository.ts:284-311) | Two Lambdas sending for one group | Held by the primary key `group_key` on the first claim, and by a conditional `UPDATE … WHERE last_sent_at = previous RETURNING` afterwards; concurrent test `lets exactly one of two concurrent claims win, first send or later` at notifications.controller.test.ts:398 (`Promise.all`, `toHaveLength(1)` twice) | PASS |
| E04 | `updatePreference` → `savePreference` (notifications.repository.ts:258-266) | Duplicate preference row | Held by the primary key `(member_id, category)`; last write wins, which is the intended toggle semantics | PASS |
| E05 | `createTakeComment`, `patchTakeComment`, `removeTake`, `removeTakeComment` | Check-then-write | No limit or uniqueness rule depends on an earlier read; ids are fresh random uuids | PASS |
| E06 | Cascades in `deleteSongWithCascade`, `deleteSessionWithCascade`, `deleteMemberWithLinks` | Run inside the existing transaction | songs.repository.ts:278, sessions.repository.ts:108, members.repository.ts:139 call the cascade with `transaction` | PASS |
| E07 | Module-level state | `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on changed api files | `let cachedClient: S3Client \| null` (uploads.adapter.ts, preexisting client cache); VAPID keys read through `readSecureParameter`. Neither holds a rule the spec states | PASS |

## Notes

- **D05.** `TakeUploadForm.tsx:96-102` sets `recordedAt` from `new Date(file.lastModified)` and preselects the nearest practice from that date, but no test chooses a file and reads the field back. A change that dropped the line (or used `Date.now()`) would keep every suite green. `/visual-validation`'s routed list covers "an upload of a fixture file", not the default date, so this row belongs here. A `TakeUploadForm.test.tsx` that picks a `File` with a known `lastModified` and asserts the date-time field and the session select would close it.
- **E01.** The spec's DDL wrote `id uuid PRIMARY KEY, endpoint text NOT NULL UNIQUE`, and the implementation followed it. On Aurora DSQL that leaves the rule to an asynchronously built secondary index (see the `schema-dsql-constraints` blueprint and `docs/knowledge/dsql-postgres-compat-gaps.md`). Making `endpoint` the primary key, as talos does, holds it structurally and changes no product behaviour; add a `Promise.all` back-e2e that subscribes one endpoint twice and asserts one row.
- **E02.** The rule is held; only the concurrent proof is missing. A back-e2e that sends the same `POST /api/takes` body twice through `Promise.all` and asserts one row and one round of sends (3 calls for the test band) closes it.
- **Question (no failing case against the spec).** Take comments are grouped per take over 10 minutes (`take-comment:<takeId>`, notifications.core.ts:203). The spec groups setlists, lineups, transitions and sessions, and says nothing about grouping comments. A second comment on the same take within 10 minutes sends no push. Is that the intended behaviour? It came from the plan, not from the operator.
- **Question.** The group claim is shared by everyone, not per recipient. If Hugo edits a setlist (Léa and Sam notified) and Léa edits it 5 minutes later, Hugo is never told about Léa's change. The spec's wording ("send one notification, not one per write") allows this; flagging it in case the operator meant per recipient.
- **Question (preexisting path, touched by the diff).** `appendEntry` (setlists.service.ts) computes `position: existing.length` from a read, so two concurrent appends to one setlist get the same position. The diff only adds a notification call there, and no spec of this feature states the rule, so it is not graded here.
- The main checkout's branch held only the plan when this step started; the four implementation commits sat on worktree branches whose agents could not fast-forward it. The branch was fast-forwarded (no merge, no rewrite) to `b709f5f9` before validating.

## Verdict: FAIL

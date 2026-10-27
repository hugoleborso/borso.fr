# Plan — Song takes and web push

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md) and [ADR-0040](../../../../adr/0040-pragma-sends-web-push-like-talos.md). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, did not name it at all (planning gap), or named it correctly and the defect comes from elsewhere.

Intent: add takes (one recording of one song, optionally from one session) with comments, and web push for four categories, to `apps/pragma`, sending push inline from the API Lambda exactly as `apps/talos/api/src/push/` does.

## Where the spec and the live workspace differ

Read from `apps/pragma/` on 2026-10-23, not from the spec. Each line is a correction the implementation follows; none changes product behaviour.

- **There is no `site/src/features/` folder.** Query modules live in `site/src/lib/queries/<x>.queries.ts`, browser adapters in `site/src/lib/<x>.adapter.ts`. The spec's `features/takes/*` paths land there.
- **Each slice owns its Drizzle tables** in `<slice>.schema.ts`; `api/src/database/schema.ts` is only a barrel (blueprint `database-schema-barrel`). The new tables are declared in `takes/takes.schema.ts` and `notifications/notifications.schema.ts` and re-exported from the barrel.
- **`DEFAULT now()` is refused** by `api/src/database/migrations.audit.test.ts` for any column outside its allowlist. `created_at` gets no default; the service passes `now`.
- **DSQL has no foreign keys** ([`docs/knowledge/dsql-postgres-compat-gaps.md`](../../../../knowledge/dsql-postgres-compat-gaps.md)), so every cascade is code: the owning service exports `…OfDeletedSong(transaction, id)`, called inside the existing `deleteSongWithCascade` / `deleteSessionWithCascade` / `deleteMemberWithLinks` transactions, as `deleteStudiesOfDeletedSong` already is.
- **The uploads adapter cannot delete and does not bind the length.** `presignPutObject` signs no `ContentLength`, so the 10 MiB chart cap is only checked in Zod; and the Lambda role has `grantPut` + `grantRead` only. Takes need both: the 50 MiB cap enforced by S3, and object deletion on song deletion.
- **The VAPID key pair lives in the database** (ADR-0040, revision 2026-10-24). The API generates it with `webPush.generateVAPIDKeys()` the first time push needs it and stores it in the `vapid_key_pair` singleton under id 1, with an `ON CONFLICT DO NOTHING` insert so two first uses keep one pair. The table is in the preview clone's `tableBlocklist`, so each preview generates a pair of its own and keeps it across deploys, and no preview signs with the production key. There is no SSM parameter, no environment variable and no operator step.
- **`web-push`'s `timeout` option is a socket idle timeout**, not a deadline (`@types/web-push` 3.6.4, lines 247 to 255). The send is bounded by that option *and* by a `Promise.race` deadline.

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|
| Q "What does one recording cover" | One take per song | `take.song_id NOT NULL`; `api/src/takes/takes.schema.ts` `takeCreateSchema.songId: uuid` | back-e2e: create without `songId` answers 400 |
| Q "What is feedback" | One table, optional moment | `take_comment.at_seconds integer` nullable; `takes.core.ts` `isMomentWithinTake(atSeconds, durationSeconds)` refuses a moment past the end | unit: `atSeconds = durationSeconds + 1` refused, `0` and `null` accepted |
| Q "Must a take belong to a session" | Optional | `take.session_id` nullable; `takes.service.detachTakesOfDeletedSession(transaction, sessionId)` sets it null, called from `sessions.repository.deleteSessionWithCascade` | back-e2e: delete a session, its take survives with `sessionId: null` |
| Q "Retention and size" | Keep all, 50 MiB | `domain/take-upload.core.ts` `TAKE_MAX_MEBIBYTES = 50`, `TAKE_CONTENT_TYPES`, `TAKE_COMMENT_MAX_LENGTH`; sign schema caps `contentLength`; the presign binds `ContentLength` so S3 refuses a larger body | unit on the core; back-e2e: 50 MiB + 1 answers 400; adapter test asserts the signed URL carries `content-length` in `X-Amz-SignedHeaders` |
| Q "Where is Record" | Practice page per setlist song, plus song page | `RecordingSheet` organism opened from `SongDetailPage` Takes section and from each entry rendered on a practice's `SessionDetailPage` (via `SessionSetlists` → entry rows, practice kind only) | visual: microphone button on each practice setlist song; none on a concert |
| Q "Bad network" | IndexedDB queue + retry | `site/src/lib/take-queue.adapter.ts` (IndexedDB, the only file touching it), `site/src/lib/take-queue.core.ts` (pure next-step decision), drain on app start and on `online` via `online-status.hook.ts` | unit on the core; visual: offline record → "pending upload" → back online → listed for everyone |
| Q "Notifications" | Web push, this spec | `api/src/notifications/` slice + `site/public/sw.js` handlers | see slice 2 and 4 rows |
| Q "Burst of setlist edits" | One per group per 10 min | `notifications.core.ts` `buildGroupKey(event)` (`setlist:<id>`, `session:<id>`, `transition:<songA>:<songB>`, `take:<id>`, `take-comment:<takeId>`) and `isGroupDue(lastSentAt, now)`; `notification_dispatch` claimed through a conditional upsert (blueprint `repository-conditional-claim`) | unit with `now` injected at 9:59 and 10:00; back-e2e: two setlist writes in a row send once |
| Q "Preferences" | Per category, all on at first enable | `notification_preference` rows; a missing row reads as enabled (`isCategoryEnabled(preferences, category)`), so first subscribe needs no seeding write | unit; back-e2e: toggle off `setlists`, a setlist write sends nothing to that member |
| Q "How is push sent" | Inline after commit, timeout-bounded, never fails the write | `notifications.service.notifyBand(event, now)` called by each service *after* its repository call returns; it catches every error and reports it; `web-push.adapter.ts` passes `timeout` and the service races a `PUSH_SEND_DEADLINE_MILLISECONDS` | back-e2e with the adapter throwing: the write still answers 2xx |
| Q "A member is deleted" | Keep takes, drop subscriptions + preferences | `notifications.service.deletePushStateOfDeletedMember(transaction, memberId)` called from `deleteMemberWithLinks`; `takes.repository` list left-joins `member`, null name → `authorName: null`, rendered as `t('takes.formerMember')` | back-e2e: delete a member, takes listed with `authorName: null`, subscriptions gone |
| Q "Which recording format" | Whatever MediaRecorder produces | `domain/take-upload.core.ts` `normalizeTakeContentType('audio/webm;codecs=opus') → 'audio/webm'` before sign | unit over Safari and Chromium strings |
| Edge "sort by recordedAt" | Newest first by recording time | `takes.repository.listTakesOfSong` orders `recorded_at DESC, id DESC` on index `take_song_recorded_idx` | back-e2e: a take uploaded later with an older `recordedAt` lists second |
| Edge "pending on this device only" | Queue entries merged in the list on the device | `take-list.core.ts` `mergePendingTakes(serverTakes, queuedTakes)` | unit |
| Edge "session preselected within a day" | Nearest practice within 24 h | `take-upload-form.core.ts` `selectNearestPractice(sessions, recordedAt)` | unit at 23:59 and 24:01 |
| Edge "song deleted" | Takes, comments, audio objects go | `takes.service.deleteTakesOfDeletedSong(transaction, songId)` inside `deleteSongWithCascade`; `songs.service.removeSong` reads the object keys first, then deletes the objects after commit through `uploads.service.deleteStoredObjects` | back-e2e (S3 adapter faked): keys passed to delete; rows gone |
| Edge "any member deletes" | No ownership check | `DELETE /api/takes/:id`, `DELETE /api/takes/:id/comments/:commentId` gated only by `requireMemberSession` | back-e2e: member B deletes member A's take |
| Edge "two devices" | One send per subscription | `selectRecipients` returns subscriptions, not members | unit |
| Edge "author never notified" | Exclude actor | `selectRecipients(subscriptions, preferences, { actorMemberId, category })` | unit + back-e2e |
| Edge "tap opens what changed" | URL in the payload | `buildNotificationUrl(event)`: take → `/catalog/<songId>?take=<takeId>`, session → `/sessions/<id>`, setlist and lineup override → `/setlists/<id>`, song default lineup → `/catalog/<songId>`, transition → `/catalog/<songAId>`; `sw.js` `notificationclick` focuses or opens it | unit; visual: payload URL checked in the faked adapter's capture |
| Error "microphone denied" | Say so, offer Upload | `recorder.adapter.ts` returns `{ kind: 'denied' }`; `recording-sheet.core.ts` maps it to the message and the Upload action | unit on the core |
| Error "phone locks" | Keep what was recorded, say it was cut | `recorder.adapter.ts` listens to `visibilitychange` / recorder `stop` not caused by the user, returns `{ kind: 'interrupted', blob }` | unit on the core; breadcrumb `RecordingInterrupted` |
| Error "over 50 MiB or not audio" | Refused before upload | `validateTakeFile(file)` in `domain/take-upload.core.ts`, read by the form and by the API schema | unit |
| Error "storage full" | Offer a download | `take-queue.adapter.ts` returns `{ kind: 'quota-exceeded' }`; sheet renders a download link over `URL.createObjectURL(blob)` | unit on the core; `TakeQueueWriteFailed` reported |
| Error "404 / 410" | Delete that subscription | copy of talos `classifyPushFailure` + `selectExpiredEndpoints` in `notifications.core.ts` | unit; back-e2e with the fake answering 410 |
| ADR-0040 | One adapter, catalog version, per-stage keys, blocklist | `web-push.adapter.ts` only importer; `pnpm-workspace.yaml` catalog `web-push: 3.6.7`, `@types/web-push: 3.6.4`; `talos` and `pragma` both `catalog:`; the pair in `vapid_key_pair`, generated on first use; `tableBlocklist` gains `push_subscription`, `take`, `take_comment`, `vapid_key_pair` | `grep -rn "from 'web-push'" apps/*/api/src` lists two adapters; `stack.test.ts` asserts the blocklist and that no VAPID parameter is named or granted |
| Changes → `app.ts` | Mount two routers | `.route('/api/takes', buildTakesRouter())`, `.route('/api/notifications', buildNotificationsRouter())` inside the one chain | `tsc --noEmit` on the site sees `api.api.takes` |
| Analytics | Input events | API: one structured `console.info({ event: 'take_created', source, queued })` per event through a named helper in `helpers/observability/`; site: Sentry breadcrumbs. No new pipeline; the output metric is read from `take.session_id` | grep for each event name in the diff |
| Zero-defect | Four alerts | site: `reportTakeFailure(stage, error)` added to `site/src/observability/error-reporting.adapter.ts`, tags `take.stage`; API: `PushSendFailed` through `reportUnhandledError`-style capture with host and status tags, 404/410 skipped | unit on tag selection core |
| Out of scope | Whole-practice files, waveform, transcoding, best take, unseen badge, e-mail, MCP | (out of scope) | nothing in the diff names them |

## Pattern Coherence pass

- **New dependency:** `web-push` only, ratified by ADR-0040. No `idb`, no `fake-indexeddb`: the queue adapter is written over the raw IndexedDB API behind an injected `TakeQueueStorage` interface, and its tests run against an in-memory implementation of that interface. Adding a fake would be an ADR trigger for a test convenience.
- **Reused, not rebuilt:** `uploads.adapter.ts` (presign, extended with `contentLength` and a delete), `scene-wake-lock.adapter.ts` (screen lock, renamed only if its `SURFACE` constant needs it), `online-status.hook.ts`, `FileDropZone`, `parameter-store.client.ts`, the talos push core and site `push-subscription.adapter.ts` / `vapid-key.utils.ts` / `notifications-offer.core.ts` (copied, since cross-app imports are banned).
- **Two playback URL paths?** Takes reuse `POST /api/uploads/sign-get` through a new `useTakePlaybackUrl` in `takes.queries.ts` instead of embedding a URL in the list, so one signing path exists and the list stays cacheable.
- **State patterns:** server state stays in TanStack Query; the queue is an external store read through `useSyncExternalStore` (blueprint `hook-external-store`), not `useEffect` + `useState`.

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|
| A preview pushes to the band's real phones | high | `push_subscription` in `tableBlocklist`; per-stage key path | `stack.test.ts` asserts the three tables are in `tableBlocklist`; nothing else would catch their removal |
| A push failure fails a save | high | `notifyBand` catches everything, is called after the repository returns, and the deadline race bounds the wait | back-e2e "adapter throws, write answers 2xx" per caller service |
| Save latency grows past the 20 s Lambda timeout | medium | per-send socket `timeout` 3 s and overall deadline 5 s, sends run in parallel | back-e2e with a fake that never resolves: the write returns within the deadline |
| Migration rejected by DSQL after passing on local Postgres | high | one DDL per statement-breakpoint, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX ASYNC IF NOT EXISTS`, no FK, no `DEFAULT now()`, `UNIQUE` only inside `CREATE TABLE` | `scripts/check-migration-sql-dsql-compat.sh` in pre-commit; `migrations.audit.test.ts`; preview deploy |
| Cascade forgotten on one deletion path | medium | each cascade is one exported service function called inside the existing transaction | back-e2e per deletion path (song, session, member) |
| Orphan audio when S3 delete fails after commit | low | delete runs after commit, failure reported, never rolls back the song deletion | `TakeObjectDeleteFailed` report; an orphan costs storage only |
| Content type mismatch between presign and PUT | medium | site normalizes the MediaRecorder type once, signs and PUTs with that same string (`hasSentFileToPresignedUrl` reads `file.type`, so the blob is wrapped in a `File` with the normalized type) | visual: live take on Chromium succeeds; `TakeUploadFailed` with `take.stage = put` |
| Grouping race: two Lambdas both send | low | conditional upsert on `notification_dispatch`; a DSQL `OC000` conflict reads as "not claimed" | back-e2e: two concurrent claims, one wins |
| Lost take: IndexedDB entry deleted before create commits | high | entry removed only after `POST /api/takes` answers 201; a retry of a create with the same client `id` is idempotent (primary key conflict reads as success) | unit on `take-queue.core.ts`; back-e2e: double create with one id returns the same take |
| iOS Safari records then stops on lock | medium | interrupted path keeps the blob | `RecordingInterrupted` breadcrumb rate |
| Service worker push handler breaks offline caching | medium | handlers added, fetch handler untouched, `CACHE_VERSION` unchanged | existing offline visual check on the practice page |
| `infra/cdk` coverage | low | no construct change; only `apps/pragma/cdk/lib/stack.ts`, covered by `stack.test.ts` | `pnpm --filter @borso-app/pragma typecheck` + stack test |
| Unverified layer suffix on new site files | low | every new file ends in a layer suffix (`.adapter.ts`, `.core.ts`, `.queries.ts`, `.hook.ts`) | `convention-drift.ts --check` |
| Real iPhone delivery | medium | cannot be proven here | manual smoke after deploy (operator) |

## Code-quality self-check

- [ ] Repo lint rules pass (`pnpm exec eslint --no-warn-ignored --max-warnings 0`).
- [ ] Type-assertion plugin satisfied (only `as const`, `as unknown` allowed). Push payloads and IndexedDB reads are parsed with Zod.
- [ ] No `any`.
- [ ] No abbreviations or single-letter locals outside trivial loop indices.
- [ ] Magic numbers and strings named (`TAKE_MAX_MEBIBYTES`, `NOTIFICATION_GROUP_WINDOW_MINUTES`, `PUSH_SEND_DEADLINE_MILLISECONDS`, `TAKE_OBJECT_PREFIX = 'take'`).
- [ ] No comments in code; only machine-read annotations (`@FollowsBlueprint`, `@DependsOnExternal`, `@Feature takes` / `@Feature notifications`).
- [ ] `.core.ts` files take `now` as a parameter and never call `new Date()`.
- [ ] Controllers dispatch only; actor id read with `readMemberId(context)` and passed to the service.
- [ ] `@DependsOnExternal web-push`, `browser-push-manager`, `browser-media-recorder`, `browser-indexeddb` declared in `scripts/architecture/manifests/pragma.manifest.ts`.
- [ ] Every user-facing string in `en.json` and `fr.json`; `i18n-parity.core.test.ts` passes.
- [ ] Every layout class has a mobile-first base and `sm:`/`lg:` variant; 375 px checked.
- [ ] No `useEffect` without a stated external system (MediaRecorder, wake lock, `online` listener).
- [ ] `VOCABULARY.md` terms added with `Lives in:` paths that exist (`scripts/check-vocabulary-paths.sh`).

## Pre-flight gates

Run, in order, before push:

1. `pnpm install` (lockfile updated by the catalog move).
2. `pnpm --filter @borso-app/pragma typecheck` and `pnpm --filter @borso-app/talos typecheck`.
3. `pnpm exec eslint --no-warn-ignored --max-warnings 0` on the changed files.
4. `scripts/check-migration-sql-dsql-compat.sh` and `scripts/check-vocabulary-paths.sh`.
5. `pnpm --filter @borso-app/pragma run test:core` (coverage + cores at 100%).
6. `pnpm --filter @borso-app/pragma run test` (back-e2e on the local Postgres).
7. `pnpm --filter @borso-app/talos run test:core` (the catalog move must not change talos).
8. `pnpm --filter @borso-app/pragma build` and `pnpm --filter @borso-app/pragma run synth`.
9. `pnpm exec knip`.
10. `scripts/reports.sh all` then `pnpm exec tsx scripts/architecture/architecture-graph.ts --check` and the blueprint `--check` gates.
11. `/technical-validation` against the spec.
12. `/visual-validation` against the spec, Chromium launched with `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`, at 375 px and 1280 px.
13. human: one notification received on a real iPhone with pragma installed, after the prod deploy.

## Operator steps (before push works on a stage)

- None since the 2026-10-24 revision of ADR-0040: each stage generates its VAPID pair the first time push needs it.

## Open questions / unknowns

None blocking. Two code-level choices were made here because the spec is silent; both are reversible:

- A transition comment's notification opens `/catalog/<songAId>`, because a transition belongs to no setlist and its API carries none.
- The "former member" label is decided on the site from `authorName: null`; the API does not invent a name.

## Missing technical skills

- `web-push` / service-worker push (payload shape, `notificationclick`, iOS installed-app rule).
- `MediaRecorder` + wake lock on iOS Safari.
- IndexedDB offline queues.

## Slices

Four ordered slices. Each lands green on its own (gates 2 to 9) before the next starts. Every `*.core.ts` / `*.utils.ts` row has its sibling `*.test.ts`; every service, controller and repository change is covered by a back-e2e test in the same slice.

### 1. takes-api

Files:

- `apps/pragma/domain/take-upload.core.ts` + `.test.ts` — `TAKE_CONTENT_TYPES`, `TakeContentType`, `TAKE_MAX_MEBIBYTES = 50`, `TAKE_COMMENT_MAX_LENGTH`, `normalizeTakeContentType`, `validateTakeFile`.
- `apps/pragma/api/src/database/migrations/0017_takes_and_push.sql` — the five tables from the spec, without `DEFAULT now()`, with `CREATE INDEX ASYNC IF NOT EXISTS take_song_recorded_idx` and an index on `take_comment (take_id, created_at)`, plus the drizzle-kit journal entry.
- `apps/pragma/api/src/takes/takes.schema.ts` + `.test.ts` — `takeTable`, `takeCommentTable`, Zod `takeSignSchema`, `takeCreateSchema` (client `id`, `objectKey`, `songId`, `sessionId?`, `recordedAt`, `durationSeconds`, `contentType`), `takeCommentCreateSchema`, `takeCommentUpdateSchema`.
- `apps/pragma/api/src/notifications/notifications.schema.ts` — table definitions only in this slice (`pushSubscriptionTable`, `notificationPreferenceTable`, `notificationDispatchTable`), so the migration and the barrel agree.
- `apps/pragma/api/src/database/schema.ts` — barrel re-exports.
- `apps/pragma/api/src/takes/takes.core.ts` + `.test.ts` — `buildTakeObjectKey({ songId, takeId, contentType })` → `take/<songId>/<takeId>.<ext>`, `isMomentWithinTake`, `orderCommentsByTime`.
- `apps/pragma/api/src/takes/takes.types.ts` — `TakeView`, `TakeCommentView`.
- `apps/pragma/api/src/takes/takes.repository.ts` — insert (idempotent on `id`), list by song newest first with author name and comment count, find, delete with comments, comments CRUD, `deleteTakesOfSongWithin(transaction, songId)` returning object keys, `detachTakesOfSessionWithin(transaction, sessionId)`.
- `apps/pragma/api/src/takes/takes.service.ts` — `mintTakeUpload`, `createTake`, `getTakesOfSong`, `removeTake` (rows then object), comment create/update/delete, the cascade exports.
- `apps/pragma/api/src/takes/takes.controller.ts` + `.test.ts` — `POST /sign`, `POST /`, `GET /?songId=`, `DELETE /:id`, `GET|POST /:id/comments`, `PATCH|DELETE /:id/comments/:commentId`.
- `apps/pragma/api/src/uploads/uploads.adapter.ts` + `.test.ts` — `presignPutObject` gains optional `contentLength`; new `deleteObjects(objectKeys)`.
- `apps/pragma/api/src/uploads/uploads.service.ts` — `mintObjectUpload`, `deleteStoredObjects` (reports, never throws).
- `apps/pragma/api/src/songs/songs.repository.ts`, `songs.service.ts` — cascade + object deletion after commit.
- `apps/pragma/api/src/sessions/sessions.repository.ts` — detach takes.
- `apps/pragma/api/src/app.ts` — mount `/api/takes`.
- `apps/pragma/cdk/lib/stack.ts` + `cdk/test/stack.test.ts` — `uploadsBucket.grantDelete`, `tableBlocklist` + `push_subscription`, `take`, `take_comment`.
- `apps/pragma/VOCABULARY.md` — Take, Take comment, Push subscription, Notification preference (the last two `Lives in: api/src/notifications/`), and *take* added beside **revision** in *Words we do not use* (`recording` is the act, `version` is refused).

Tests: core units at 100% and mutation-scoped; back-e2e `takes.controller.test.ts` (create, list newest first by `recordedAt`, idempotent create, 50 MiB + 1 refused, delete by another member, comment with and without moment, moment past the end refused); song deletion removes takes, comments and passes keys to the faked delete; session deletion detaches; member deletion keeps takes with `authorName: null`; stack test for grant and blocklist.

### 2. push-api

Files:

- `pnpm-workspace.yaml` — catalog `web-push: 3.6.7`, `@types/web-push: 3.6.4`; `apps/talos/package.json` and `apps/pragma/package.json` use `catalog:`; `pnpm-lock.yaml`.
- `apps/pragma/api/src/notifications/web-push.adapter.ts` + `.test.ts` — copy of the talos shape (outcome instead of throw), `VAPID_SUBJECT = 'https://pragma.borso.fr'`, `timeout` option.
- `apps/pragma/api/src/notifications/notifications.core.ts` + `.test.ts` — `NotificationCategory`, `NotificationEvent` (discriminated union per source), `classifyPushFailure`, `selectExpiredEndpoints`, `isCategoryEnabled`, `selectRecipients` (actor excluded, category off excluded, one per subscription), `buildGroupKey`, `isGroupDue(lastSentAt, now)` with `NOTIFICATION_GROUP_WINDOW_MINUTES = 10`, `buildNotificationUrl`, `buildNotificationPayload` (the server does not know a device's language, so the payload carries a message key, its parameters and the URL, and `sw.js` renders the text in English or French from `navigator.language` with a key table it ships).
- `apps/pragma/api/src/notifications/notifications.schema.ts` — Zod `pushSubscriptionInputSchema`, `preferencesUpdateSchema`.
- `apps/pragma/api/src/notifications/notifications.repository.ts` — subscriptions (upsert on endpoint, delete by endpoint, list), preferences (list, upsert), `claimDispatch(groupKey, now, windowStart)`, `deletePushStateOfMemberWithin(transaction, memberId)`.
- `apps/pragma/api/src/notifications/notifications.service.ts` — `readVapidPublicKey` (generates and stores the pair on first use), subscribe/unsubscribe, preferences read/update, `notifyBand(event, now)` (claim, select, send with deadline, delete expired, report failures, never throw).
- `apps/pragma/api/src/notifications/notifications.controller.ts` + `.test.ts` — `GET /vapid-public-key`, `POST /subscriptions`, `DELETE /subscriptions`, `GET /preferences`, `PUT /preferences`.
- `apps/pragma/api/src/app.ts` — mount `/api/notifications`.
- Fan-out callers, each passing `actorMemberId` from the controller: `takes.service` (create take, create comment), `sessions.service` (create, patch), `setlists.service` (create, rename, append, patch entry including `lineupOverride`, remove, reorder, link and unlink), `transitions.service` (save), `songs.service` (patch when `defaultLineup` changed). Their controllers pass `readMemberId(context)`.
- `apps/pragma/api/src/members/members.repository.ts` — call `deletePushStateOfMemberWithin`.
- `apps/pragma/cdk/lib/stack.ts` + test — `vapid_key_pair` in the preview `tableBlocklist`; `ssm:GetParameter` stays on the Spotify parameter alone.
- `scripts/architecture/manifests/pragma.manifest.ts` — `web-push`.

Tests: core units at 100% and mutation-scoped; adapter test with an injected sender (delivered, 410 → expired, other → failed, timeout passed); back-e2e with the adapter replaced through the composition root: one send per eligible subscription, none to the actor, none with the category off, 410 deletes the subscription, the adapter throwing leaves the write at 2xx, two setlist writes inside 10 minutes send once, the key route generates one pair on first use, also when two members ask at the same moment; stack test for the blocklist and the absence of any VAPID parameter.

### 3. takes-site

Files:

- `apps/pragma/site/src/lib/queries/takes.queries.ts` + `.test.tsx` — `takeKeys`, `useTakesOfSong`, `useTakePlaybackUrl`, `useCreateTake` (settled from the response, `query-settled-from-the-write-response`), `useDeleteTake`, comment hooks.
- `apps/pragma/site/src/lib/recorder.adapter.ts` + `.test.ts` — MediaRecorder start/stop, outcomes `recorded | denied | interrupted | unsupported`.
- `apps/pragma/site/src/lib/take-queue.adapter.ts` + `.test.ts` — IndexedDB behind `TakeQueueStorage`, outcomes `queued | quota-exceeded`.
- `apps/pragma/site/src/lib/take-queue.core.ts` + `.test.ts` — next step per entry (`sign | put | create | done`), retry rules.
- `apps/pragma/site/src/lib/take-queue.store.ts` — external store drained on start and on `online`.
- `apps/pragma/site/src/components/organisms/RecordingSheet.tsx` + `recording-sheet.core.ts` + test — elapsed time, wake lock through `scene-wake-lock.adapter.ts`, denied / interrupted / quota messages.
- `apps/pragma/site/src/components/organisms/TakeList.tsx` + `take-list.core.ts` + test — merged pending entries, `formerMember`.
- `apps/pragma/site/src/components/organisms/TakePlayer.tsx` + `take-player.core.ts` + test — `<audio>`, moment marks, thread, "At 1:42" toggle (on while paused past zero).
- `apps/pragma/site/src/components/organisms/TakeUploadForm.tsx` + `take-upload-form.core.ts` + test — `@tanstack/react-form`, file date default, `selectNearestPractice`.
- `apps/pragma/site/src/routes/catalog/SongDetailPage.tsx` — Takes section under the chord chart; `?take=` opens that take.
- `apps/pragma/site/src/routes/sessions/SessionDetailPage.tsx` and the practice setlist entry rendering — microphone per song.
- `apps/pragma/site/src/observability/error-reporting.adapter.ts` — `reportTakeFailure`.
- `apps/pragma/site/src/i18n/en.json`, `fr.json` — `takes.*`.
- `scripts/architecture/manifests/pragma.manifest.ts` — `browser-media-recorder`, `browser-indexeddb`.

Tests: cores at 100%; query hook tests; component render tests for the sheet's three outcomes; visual validation of live record (fake microphone), upload of a fixture file, comment moment seek, offline pending then upload.

### 4. push-site

Files:

- `apps/pragma/site/src/lib/push-subscription.adapter.ts` + `.test.ts` — copied shape from talos, injected `PushEnvironment`.
- `apps/pragma/site/src/lib/vapid-key.utils.ts` + `.test.ts` — base64url decode.
- `apps/pragma/site/src/components/organisms/notifications-offer.core.ts` + `.test.ts` — supported / denied / iOS-not-installed (`navigator.standalone` false and iOS user agent) / enabled.
- `apps/pragma/site/src/lib/queries/notifications.queries.ts` + `.test.tsx` — key, subscribe, preferences (optimistic toggle, no refetch).
- `apps/pragma/site/src/components/organisms/NotificationSettings.tsx` — "Enable on this device", four toggles, iOS hint.
- `apps/pragma/site/src/routes/account/AccountPage.tsx` — mount the section.
- `apps/pragma/site/public/sw.js` — `push` (parse payload, render text from its key table, `showNotification`) and `notificationclick` (focus an open client on the URL or open one).
- `apps/pragma/site/src/i18n/en.json`, `fr.json` — `notifications.*`.
- `scripts/architecture/manifests/pragma.manifest.ts` — `browser-push-manager`.

Tests: cores at 100%; adapter tests with a fake environment; visual validation that Enable subscribes (Chromium grants permission, the push service is not reached) and toggles persist across reload.

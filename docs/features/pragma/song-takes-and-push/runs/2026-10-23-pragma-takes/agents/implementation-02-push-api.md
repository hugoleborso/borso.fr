---
status: done
summary: Slice 2 push-api shipped. /api/notifications serves the stage's VAPID public key (503 push-not-configured without one), subscribes and unsubscribes a device, and reads and saves one toggle per category (takes, take_comments, sessions, setlists; missing reads as on). notifyBand runs after the write in takes, sessions, setlists, transitions and songs (default lineup changed only), sends once per device of every other member with the category on, groups per setlist, session, pair of songs, song lineup or take over 10 minutes through a conditional claim on notification_dispatch, bounds each send by a 3 s socket timeout and the fan-out by a 5 s deadline, deletes 404/410 subscriptions, reports PushSendFailed with host and status, and never fails the write. Member deletion removes push state. web-push and @types/web-push moved into the pnpm catalog for talos and pragma. The stack passes /pragma/<stage>/vapid-public and -private and grants ssm:GetParameter on exactly those plus the Spotify parameter. Core and adapters at 100% coverage, scoped mutation 100%, core 2286/2286, back-e2e 259/259, typecheck, eslint, prettier and knip clean.
artifacts:
  - pnpm-workspace.yaml
  - pnpm-lock.yaml
  - apps/talos/package.json
  - apps/pragma/package.json
  - apps/pragma/api/src/notifications/
  - apps/pragma/api/src/songs/song-lineup.core.ts
  - apps/pragma/api/src/takes/takes.service.ts
  - apps/pragma/api/src/takes/takes.repository.ts
  - apps/pragma/api/src/sessions/sessions.service.ts
  - apps/pragma/api/src/setlists/setlists.service.ts
  - apps/pragma/api/src/transitions/transitions.service.ts
  - apps/pragma/api/src/songs/songs.service.ts
  - apps/pragma/api/src/members/members.repository.ts
  - apps/pragma/api/src/helpers/observability/error-reporting.adapter.ts
  - apps/pragma/api/src/__test/test-seed.service.ts
  - apps/pragma/api/src/__test/test-seed.repository.ts
  - apps/pragma/api/src/app.ts
  - apps/pragma/cdk/lib/stack.ts
  - apps/pragma/test/push-utils.ts
  - scripts/architecture/manifests/pragma.manifest.ts
next:
  kind: validate
---

Contract for slice 4 (push-site), so it does not re-derive it:

- `GET /api/notifications/vapid-public-key` answers `{ key }`, or 503 `{ error: 'push-not-configured' }`.
- `POST /api/notifications/subscriptions` takes the browser's `PushSubscriptionJSON` (https endpoint) and answers 201 `{ ok: true }`. Subscribing an endpoint again moves it to the member who subscribed last. `DELETE /api/notifications/subscriptions` takes `{ endpoint }`.
- `GET /api/notifications/preferences` answers `{ preferences: [{ category, enabled }] }` for all four categories in the order takes, take_comments, sessions, setlists. `PUT /api/notifications/preferences` takes one `{ category, enabled }` and answers the same full list, so the optimistic toggle settles from the response with no refetch.
- The push payload is JSON `{ messageKey, parameters, url, tag }`. `messageKey` is one of `take-created`, `take-comment-created`, `session-created`, `session-changed`, `setlist-changed`, `song-lineup-changed`, `transition-changed`. `parameters` holds `actorName` (absent when the member no longer exists) plus `songTitle`, `sessionDate` (ISO 8601, for the worker to format), `setlistName`, or `songATitle` and `songBTitle`. `tag` is the group key, usable as the notification tag so a grouped update replaces the previous one.

Choices made where the plan was silent:

- The "song default lineup" event groups on `song-lineup:<songId>`; the plan listed no key for it. It fires only when the stored lineup actually differs (`songs/song-lineup.core.ts`), not on every patch carrying the field.
- Deleting a whole setlist sends nothing, since its address would no longer open; the plan's setlist list did not include it.
- `notifyBand` reads subscriptions and toggles before the VAPID parameters, so a write with no eligible recipient makes no SSM call. A preview, whose `push_subscription` is not cloned, therefore never reads its keys during the seed.
- `insertTakeIfAbsent` became `hasInsertedTake` and answers whether the row was new; a retried create no longer notifies or records a second `take_created`.
- A serialization abort (`OC000` / `40001`) on the dispatch claim reads as a lost claim, not as a failure.
- Errors go to Sentry through a new `reportTaggedFailure(name, tags)` in the error-reporting adapter, and to the log as one JSON line (`PushSendFailed`, `PushSendTimedOut`, `NotifyBandFailed`).

Integration: the worktree was cut from `main`, not from the branch, and slice 1's two commits were only in a sibling worktree, so this round was rebuilt on `d2dd9d38` (slice 1's tip). The harness refuses `git -C /home/user/borso.fr merge --ff-only` from an isolated worktree, so the fast-forward of `claude/pragma-takes-and-push` is left to the orchestrator; it carries slice 1 and slice 2 together.

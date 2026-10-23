---
status: done
summary: Slice 1 takes-api shipped. /api/takes signs a length-bound upload (50 MiB, content-length is a signed header), creates takes idempotently on the client id, lists a song's takes newest first by recordedAt with author name and comment count, deletes takes and comments for any member, and holds comments with an optional moment bounded by the take's duration. Song deletion cascades takes, comments and audio objects after commit; session deletion clears session_id; member deletion keeps takes with authorName null. Migration 0017 creates all five tables; take, take_comment and push_subscription join the preview tableBlocklist (ADR-0009 amended); the API role gains s3:DeleteObject. Core at 100% coverage, scoped mutation at 100%, back-e2e 235/235, typecheck, eslint, prettier and knip clean.
artifacts:
  - apps/pragma/domain/take-upload.core.ts
  - apps/pragma/api/src/database/migrations/0017_takes_and_push.sql
  - apps/pragma/api/src/takes/
  - apps/pragma/api/src/notifications/notifications.schema.ts
  - apps/pragma/api/src/uploads/uploads.adapter.ts
  - apps/pragma/api/src/uploads/uploads.service.ts
  - apps/pragma/api/src/helpers/observability/product-event.adapter.ts
  - apps/pragma/api/src/songs/songs.repository.ts
  - apps/pragma/api/src/songs/songs.service.ts
  - apps/pragma/api/src/sessions/sessions.repository.ts
  - apps/pragma/api/src/app.ts
  - apps/pragma/cdk/lib/stack.ts
  - apps/pragma/VOCABULARY.md
  - docs/adr/0009-pragma-previews-clone-production.md
next:
  kind: validate
---

Choices made where the plan was silent or did not match the tree, for the next slices to build on:

- `POST /api/takes/sign` takes `{ takeId, songId, contentType, contentLength }` and answers 404 for an
  unknown song. `POST /api/takes` refuses with 422 `object-key-mismatch` any `objectKey` other than
  `buildTakeObjectKey({ songId, takeId: id, contentType })`, so a take cannot point at a chart.
- `POST /api/takes` also takes `source: 'live' | 'upload'` and `queued: boolean`. They are not stored;
  they feed the `take_created` product event the spec's analytics section asks for. Slice 3 must send them.
- Product events go to stdout as one JSON line through `helpers/observability/product-event.adapter.ts`,
  because the repository's `no-console` rule allows only `warn` and `error`.
- The audio delete is reported as `TakeObjectDeleteFailed` from `takes.service`, not from
  `uploads.service`, which only answers the keys it failed to delete.
- `deleteSongWithCascade` now answers `{ outcome, takeObjectKeys }`; `removeSong` deletes the objects
  after the transaction commits.
- Indexes are written plain with `IF NOT EXISTS`; the migration runner rewrites them to
  `CREATE INDEX ASYNC`. The push endpoint is unique through a unique index, as in migration 0004.
- There is no drizzle-kit journal in this workspace, so none was written.
- A comment's moment must also be a whole second (`isMomentWithinTake`), which Zod already enforced.

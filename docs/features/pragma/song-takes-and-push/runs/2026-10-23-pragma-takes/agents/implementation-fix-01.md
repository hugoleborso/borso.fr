---
status: done
summary: Round-1 blockers fixed. push_subscription is keyed on its endpoint (primary key, as talos), the async unique index and the unused id column are gone, migration 0017 edited in place since the branch was never pushed or applied. New back-e2e tests fire two subscribes of one device and two creates of one take with Promise.all, asserting one row and one round of three sends; TakeUploadForm.test.tsx picks a File with a known lastModified and asserts the recorded-at field, the nearest practice preselected, a preset session kept, and the queued take. Typecheck, eslint, prettier, core 2508/2508 with coverage, back-e2e 262/262 green.
artifacts:
  - apps/pragma/api/src/database/migrations/0017_takes_and_push.sql
  - apps/pragma/api/src/notifications/notifications.schema.ts
  - apps/pragma/api/src/notifications/notifications.schema.test.ts
  - apps/pragma/api/src/notifications/notifications.repository.ts
  - apps/pragma/api/src/notifications/notifications.controller.test.ts
  - apps/pragma/api/src/takes/takes.controller.test.ts
  - apps/pragma/site/src/components/organisms/TakeUploadForm.test.tsx
next:
  kind: validate
---

## Blocker 1: push_subscription keyed on a random id

`endpoint text PRIMARY KEY` replaces `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` plus
`push_subscription_endpoint_idx`. `saveSubscription` keeps `onConflictDoUpdate` on the endpoint,
now the primary key, which DSQL holds under concurrency. The schema test asserts the primary key
is `endpoint` and that the table carries no index. The local Postgres holds a unique index
synchronously, so the concurrent back-e2e cannot fail on the old shape there; the schema test is
the guard that would have caught it.

Note for the orchestrator: spec.md line 153 sketches the table with `id uuid PRIMARY KEY` and
`endpoint text NOT NULL UNIQUE`. That sketch is now out of step with the code. Not edited, since
the implementer never mutates spec.md.

## Blocker 2: concurrent take create

`takes.controller.test.ts` fires two creates of one take id together and asserts two 201s with
the same id and one row. `notifications.controller.test.ts` does the same with four subscribed
devices and asserts one row and three sends.

## Blocker 3: upload form date and session

`TakeUploadForm.test.tsx` mocks the sessions query, the recorder adapter and the queue. Checked
that it fails when `chooseFile` stops writing `recordedAt` (all three tests fail).

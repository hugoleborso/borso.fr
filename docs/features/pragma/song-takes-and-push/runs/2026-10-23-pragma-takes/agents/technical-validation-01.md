---
status: failed
summary: Technical validation FAIL with 3 failing rows on b709f5f9 (branch fast-forwarded from 8cfd1f38 to the last implementation worktree tip). Lint, typecheck (pragma, talos), knip, DSQL compat, vocabulary paths, test:core (2505 tests, 100% coverage), back-e2e (259 tests) and talos test:core all pass. Failing rows. E01, push_subscription keeps one row per device only through an async unique index on endpoint (notifications.schema.ts:21,28), so two concurrent subscribes of one endpoint give two rows and double notifications; make endpoint the primary key as talos does, plus a concurrent back-e2e. E02, the take primary key holds idempotent create but no back-e2e fires two same-id creates at once. D05, no test covers the upload form defaulting recordedAt to the file's lastModified (TakeUploadForm.tsx:96-102). Three questions in Notes, none blocking. Comment grouping per take, group claim shared across recipients, and a preexisting appendEntry position race.
artifacts:
  - docs/features/pragma/song-takes-and-push/validation/technical-validation-2026-10-23-2335.md
---

All three failures are local code or test gaps. None needs a spec or plan change, a new dependency or a new secret.

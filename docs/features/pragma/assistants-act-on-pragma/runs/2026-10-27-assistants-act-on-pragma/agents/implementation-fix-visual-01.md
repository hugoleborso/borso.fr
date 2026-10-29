---
status: done
summary: Fixed VV-STALE-GRANT-AFTER-PASSWORD-CHANGE (b23c3708). listGrantsOfMember joins member_credential and keeps only grants issued under the member's current session epoch, so a password change or a recovery hides every earlier grant at once; stale rows are still deleted on the next refresh. A new back-e2e test failed before the fix (grant still listed) and passes after. The preview seed stamped its grant with epoch 0 while credentials start at 1, so the seeded grant was dead from the start; it now reads the member's real epoch.
next: { kind: validate }
artifacts:
  - apps/pragma/api/src/oauth/oauth.repository.ts
  - apps/pragma/api/src/oauth/oauth.controller.test.ts
  - apps/pragma/api/src/__test/test-seed.service.ts
---

Gates run: ESLint (`--no-warn-ignored --max-warnings 0`) and `prettier --check` on the three files, `tsc --noEmit` in apps/pragma, the full pragma back-e2e suite (379/379 passed), and the pre-commit hook.

Chose filtering over deleting on password change: auth/credentials.service would have to import oauth, which already imports it, and the filter also covers password recovery and any later epoch bump without a second call site.

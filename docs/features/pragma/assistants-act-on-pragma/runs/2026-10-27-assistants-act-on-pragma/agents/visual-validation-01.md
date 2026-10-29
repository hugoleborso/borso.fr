---
status: failed
verdict: FAIL
summary: Visual validation FAIL on bec3a3f8. 22 PASS, 1 FAIL, 4 UNVERIFIABLE. The consent page (sign-in return, Allow, Deny, 375 and 1280 px, real touch) and the Account section (three install blocks, copy, grant list, revoke by click and by touch) match the spec. One blocker - after a password change the grant's tokens answer 401 but the Account page still lists the grant as connected.
blockers:
  - id: VV-STALE-GRANT-AFTER-PASSWORD-CHANGE
    file: apps/pragma/api/src/oauth/oauth.repository.ts
    problem: After a password change the access token answers 401, but "Connected assistants" still lists the dead grant with Revoke; listGrantsOfMember filters on member_id only and ignores credential_version, so the page contradicts "a member whose credential changes loses every grant".
unverifiable:
  - "18 push to the other members, not the acting member: no push subscription in a headless browser"
  - "22 request_take_upload then create_take: no S3 bucket locally"
  - "23 deleting a member deletes their grants: deferred to back-end e2e"
  - "24 preview signing and clone blocklist: needs a deployed preview"
artifacts:
  - docs/features/pragma/assistants-act-on-pragma/validation/visual-validation-2026-10-27-1403.md
  - docs/features/pragma/assistants-act-on-pragma/validation/visual-validation-2026-10-27-1403/11-grant-listed-after-password-change.png
---

The visual-validator agent could not be dispatched (no Agent tool in a workflow stage), so the stage agent ran its brief directly. Passing screenshots wait in validation/.pending-upload/2026-10-27-1403/ for /open-pr.

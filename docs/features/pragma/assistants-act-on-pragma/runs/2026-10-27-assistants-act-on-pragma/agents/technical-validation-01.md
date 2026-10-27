---
status: failed
summary: Technical validation FAIL on 1f88c0fb (4 failing rows, 3 fixes). Lint (ESLint, Prettier), typecheck, knip, blueprint and drift checks, core (2738 tests, 100% coverage), back-e2e (373 tests), infra/cdk (509 tests, 100%) and Stryker on the 12 changed pure modules (564/564 killed) all pass. Failing - TV-PREVIEW-INSTALL-URL, the Account page builds the install address from the site origin, which on a preview is the previews CDN that serves index.html for /mcp, so a preview's install commands never reach the API. TV-REPLAY-OLDER-TOKEN, replay detection remembers only the token rotated away last, so a refresh token two rotations old is answered invalid_grant without revoking the grant, against the spec's "replaying an old one revokes the whole grant". TV-DSQL-CLAIM-CONFLICT, the code claim and the refresh rotation do not treat a DSQL serialization failure as a lost claim (their blueprint requires it), so two concurrent exchanges or refreshes answer 500 to the loser, and no back-e2e test fires them at once. Notes raise a spec inconsistency (song creation does not notify in the app, yet input metric 3 and plan gate 14 expect it).
artifacts:
  - docs/features/pragma/assistants-act-on-pragma/validation/technical-validation-2026-10-27-1234.md
---

All three blockers are local code defects; per the verdict contract the orchestrator maps this to `fix`. The song-creation notification question in the report's Notes is a spec point for the operator, not a code fix.

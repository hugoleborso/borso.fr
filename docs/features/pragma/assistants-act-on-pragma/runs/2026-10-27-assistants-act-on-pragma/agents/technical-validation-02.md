---
status: done
summary: Technical validation PASS on f057f6f0, the whole branch against origin/main. The three blockers of the first pass are closed. TV-PREVIEW-INSTALL-URL - the install blocks now take VITE_API_BASE, which a preview sets to its API host, and fall back to the page origin in production. TV-REPLAY-OLDER-TOKEN - refresh tokens are <family>.<secret>, the grant is found by family, and any token of the family that is not current revokes it, proven by a test that replays a token two rotations old. TV-DSQL-CLAIM-CONFLICT - the code claim and the rotation answer invalid_grant on a conflict abort, proven by race tests and a simulated DSQL commit abort. Gates re-run - ESLint (--max-warnings 0) and Prettier on all changed files, typecheck, knip, blueprint, drift and vocabulary checks, core (2746 tests, 100% coverage), back-e2e (378 tests), infra/cdk (509 tests, 100%), Stryker on the 12 changed pure modules (750/750 killed). Notes carry three operator questions with no failing case - a lost refresh answer now signs the client out, song creation does not notify though metric 3 and plan gate 14 expect it, and consent page framing headers.
artifacts:
  - docs/features/pragma/assistants-act-on-pragma/validation/technical-validation-2026-10-27-1400.md
---

No blockers. The song-creation notification point is a spec question for the operator (input metric 3 and plan gate 14), not a code fix.

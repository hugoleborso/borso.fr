---
status: FAIL
summary: |
  Validated the foundation slice (workspace scaffold, DB schema, shared-password
  auth, i18n, design tokens, five *.core.ts domain modules). 43 correctness
  rows: 31 PASS, 12 UNVERIFIABLE (deferred UI / CDK / Zod schemas per the
  implementation-01 verdict), 1 FAIL. 13 code-cleanliness rows: 13 PASS. 7
  test-pass rows: 7 PASS (108 core tests + 7 back-e2e tests green; perFile 100%
  coverage on every *.core.ts / *.utils.ts; biome / knip / typecheck / build
  clean). 24 spec-coverage rows: 23 PASS, 1 FAIL.

  Blocker (A09 / D20): `POST /api/admin/rotate-password` is mounted via
  `app.ts:38` `app.route('/api/admin', adminRouter)` with no session middleware
  upstream. The back-e2e test at `auth.controller.test.ts:124` confirms it by
  rotating the password without a cookie and expecting 200. This contradicts
  ADR-0004's operator-action framing and the controller's own header comment
  ("the rotate endpoint IS gated by the session middleware"). Anyone reachable
  from the public internet can rotate the band's password + HMAC key, locking
  every member out. Fix is isolated: gate the rotate route with
  `requireSharedPasswordSession`; add a back-e2e asserting 401-without-cookie
  and 200-with-cookie. Bootstrap should stay ungated (row-absent is its gate).
artifacts:
  - docs/features/pragma/first-features/validation/technical-validation-2026-05-19-2111.md
next:
  kind: fix
  reason: 'rotate-password endpoint unprotected — gate /api/admin/rotate-password with requireSharedPasswordSession'
---

## Kaizen observations

- **Validator could not find a Biome rule or commit-time gate that would have caught the unprotected admin route.** Hono's route composition (`app.route('/api/admin', router)`) is enforcement-by-convention; if the next slice introduces more admin endpoints, the same trap remains. A pre-merge check that grep-asserts every `/api/admin/*` route is preceded by `requireSharedPasswordSession` in the Hono composition graph would prevent it. Worth a Dantotsu entry once fixed.
- **Plan auth row's self-check column says "back-e2e test: rotate-password invalidates a still-valid cookie" but does NOT name "rotate-password rejects unauthenticated callers".** The plan template should always pair every authenticated mutation endpoint with a paired (positive: works for authenticated user) + (negative: 401 for unauthenticated caller) test expectation. Same trap would have been caught if the plan row had spelled both halves out.
- **Plan row "back-e2e: bootstrap endpoint 401s once a row exists" — wording drift.** The shipped behaviour returns 409 (Conflict, semantically correct for "already bootstrapped"). 401 would have been wrong (the bootstrap endpoint is intentionally unauthenticated). The PASS verdict in D19 reflects the correct status; the plan row's wording was a planning-time draft that the implementer correctly overrode. Worth tightening in `/technical-conception` so the validator does not have to second-guess.
- **Coverage report 87.5 % branches on `tonality.core.ts` slipped through perFile gate.** The vitest config sets `thresholds: { perFile: true, ...COVERAGE_THRESHOLDS }` with all four metrics at 100; the runner exited 0 despite the report showing 87.5 % branches on that one file. Either the v8 provider's per-file gate is not enforcing branches as configured, or the uncovered defensive fallbacks (`x[0] ?? fallback` for `noUncheckedIndexedAccess`) are counted as v8 "ignorable" branches. Either way, the gate is not behaving as the spec rule advertises ("100% statement / branch / function / line coverage"). Worth a dedicated investigation in a follow-up — the rule's deterrent value depends on the gate actually firing.

## Brief operator note

The implementation-01 verdict pre-warned this PR is a foundation slice; the deferred-UI rows are not the blocker. The blocker is one wiring mistake in `app.ts` that is reproducible from the back-e2e test the implementer wrote. A 5-line fix in `app.ts` + a 4-line assertion in `auth.controller.test.ts` clears it. Recommend the orchestrator dispatches a tight `/implementation` round scoped to the auth gate and re-runs `/technical-validation` once green.

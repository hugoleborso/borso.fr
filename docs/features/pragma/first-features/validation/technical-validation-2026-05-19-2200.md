# Technical validation (re-run) — Pragma first features (foundation slice)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- ADR: [`../../../adr/0004-pragma-shared-password-auth.md`](../../../adr/0004-pragma-shared-password-auth.md)
- Previous validation: [`technical-validation-2026-05-19-2111.md`](./technical-validation-2026-05-19-2111.md)
- Branch: `claude/pragma-erp-specification-k41Mg`
- Base: `origin/main`
- Run at: 2026-05-19T22:00Z
- HEAD: `f26014f` (was `fb0bd45` for the previous report)
- Touched workspaces (this delta): `apps/pragma` only (`api/src/app.ts`, `api/src/auth/auth.controller.ts`, `api/src/auth/auth.controller.test.ts`)

## Scope of this re-validation

Previous run returned **FAIL** on a single isolated row pair: **A09 / D20 — auth bypass on `POST /api/admin/rotate-password`**. All other rows (73 PASS, 12 UNVERIFIABLE for deferred surfaces) remain unchanged in intent; the only diff between `fb0bd45` and `f26014f` is the targeted fix. This report re-checks the previously-failing rows and confirms no regression in the rest by re-running the gates.

## Diff summary (fb0bd45 → f26014f)

Three files, +61 / -42:

- `apps/pragma/api/src/auth/auth.controller.ts` — `buildAuthRouter()` now returns `{ publicRouter, bootstrapRouter, rotateRouter }`. The new `rotateRouter` calls `router.use('*', requireSharedPasswordSession)` before registering `POST /rotate-password`. Bootstrap stays on its own router, ungated, gated only by the row-absent guard.
- `apps/pragma/api/src/app.ts` — mounts the two admin routers separately under `/api/admin`; deletes the dead `/api/admin/protected` placeholder and the now-unused `requireSharedPasswordSession` import. The header comment names the bug class to deter future re-merging.
- `apps/pragma/api/src/auth/auth.controller.test.ts` — replaces the no-cookie-200 case with two cases: (1) 401-without-cookie + asserts row untouched + asserts original password still logs in; (2) 200-with-cookie + asserts both columns mutated + asserts old cookie no longer validates + asserts old password 401s and new password 200s.

## A. Correctness vs spec — re-checked rows

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A09 | ADR-0004 — Rotate endpoint must be authenticated (operator action) | `/api/admin/rotate-password` mounted on a router carrying `requireSharedPasswordSession` middleware | `apps/pragma/api/src/auth/auth.controller.ts:108-127` + `apps/pragma/api/src/app.ts:32-46` | `const rotateRouter = new Hono(); rotateRouter.use('*', requireSharedPasswordSession); rotateRouter.post('/rotate-password', zValidator('json', credentialsSchema), async (context) => { ... })`. App-level mount: `app.route('/api/admin', bootstrapRouter); app.route('/api/admin', rotateRouter);`. Hono's router-level `use('*', ...)` middleware runs before any matched handler in that router, so every request to `POST /api/admin/rotate-password` traverses the cookie verifier first. The bootstrap router is a distinct `Hono()` instance with no `use('*', ...)` call, preserving the ADR-0004 contract for first-deploy seeding. The back-e2e observes both branches at runtime (D20 below). | **PASS** |
| A07 (re-check) | ADR-0004 — Bootstrap (`set-password`) refuses once a row exists (409) | Unchanged | `apps/pragma/api/src/auth/auth.controller.ts:89-103` | `if (existing !== null) { return context.json({ error: 'already-bootstrapped' }, 409); }` — bootstrap router has no session middleware, only the row-absent check, exactly as ADR-0004 specifies. | PASS |

All other category-A rows from the previous report are unaffected by the diff — the only files touched are the three listed above. Previous PASS rows remain PASS; previous UNVERIFIABLE rows (A32–A43, deferred UI/CDK surfaces) remain UNVERIFIABLE with the same deferral justification.

## B. Code cleanliness — re-checked rows

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Biome lint clean on `apps/pragma` | `pnpm exec biome lint apps/pragma` | `Checked 51 files in 1474ms. No fixes applied.` (exit 0) | PASS |
| B02 | TypeScript clean | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 — `tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit` | PASS |
| B03 | `pnpm exec knip` clean | `pnpm exec knip` | exit 0, no output (the now-unused `requireSharedPasswordSession` import in `app.ts` was removed in the fix, so no new unused-import flag) | PASS |
| B07 | No `useEffect` introduced | (no React code touched in the fix) | n/a | PASS |
| B10 | Comments document the WHY only | Sample the new comments in `app.ts:37-44` and `auth.controller.ts:9-14, 112-114` | Each comment explains *why* (row A09 of the prior validation report, the bootstrap row-absent invariant, the wiring-mistake class to avoid). None restate what the code does. | PASS |
| B11 | Function names describe the result | `bootstrapRouter` / `rotateRouter` (vs. the previous single `adminRouter`) name the *purpose* of each router rather than its URL prefix. | PASS |

All other cleanliness rules from the previous report are unaffected.

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core suite) | `pnpm --filter @borso-app/pragma run test:core` | 0 — 11 test files, 108 tests passed (`Duration 3.48s`) | PASS |
| C02 | @borso-app/pragma (back-e2e via local Postgres) | `pnpm --filter @borso-app/pragma run test` | 0 — 1 test file, **8 tests** passed (previous run: 7) — the extra test is the new 401-without-cookie assertion at `auth.controller.test.ts:114` | PASS |
| C03 | @borso-app/pragma build | `pnpm --filter @borso-app/pragma run build` | 0 — `dist/index-CGPD37sV.js 249.39 kB / 78.06 kB gz` | PASS |
| C04 | Knip repo-wide | `pnpm exec knip` | exit 0, no output | PASS |

`*.utils.ts` / `*.core.ts` 100% perFile coverage gates from the previous report remain intact — no `.utils.ts` or `.core.ts` files were modified.

## D. Test coverage of spec — re-checked rows

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D20 | Auth — rotate endpoint is gated by session cookie (ADR-0004 implicit; plan auth-row contract) | `it('rejects rotate-password with 401 when no session cookie is presented')` at `auth.controller.test.ts:114` — POSTs to `/api/admin/rotate-password` with no cookie, asserts `expect(rotateResponse.status).toBe(401)`, then re-reads `app_config` and asserts `passwordHash` string-equality + `hmacKey` buffer-equality with the pre-call state. Followed by a positive assertion at `auth.controller.test.ts:139` (`'rotates password + HMAC key … when a valid session cookie is presented'`) that posts WITH a cookie and asserts 200, row-mutation (both columns now differ), old cookie now 401s on a protected route, old password now 401s on login, new password now 200s on login. The two cases together cover the gate's positive and negative branch, as well as the rotation's downstream invalidation. | **PASS** |
| D18 (re-check) | Auth — rotate invalidates a still-valid cookie | Now covered by the second case at line 139 (formerly the only rotate assertion, now strengthened with explicit row-mutation checks via `loadAppConfig`). | PASS |
| D19 (re-check) | Auth — bootstrap returns 409 once a row exists | `it('bootstraps via set-password and rejects subsequent attempts with 409')` at `auth.controller.test.ts:56` (unchanged) | PASS |

All other category-D rows from the previous report are unaffected by the diff.

## Notes

- **Blocker A09 / D20 closed.** The fix is structurally correct: the session middleware is mounted on the router carrying the rotate handler (not on a sibling sub-mount that the rotate route was never reachable through), so Hono's middleware-resolution order guarantees the cookie verifier runs before the handler. The back-e2e directly observes the 401 at runtime and additionally asserts the DB row was not mutated — a stronger gate than the original spec's "rotate-password invalidates a still-valid cookie" assertion. The bootstrap router stays correctly ungated (row-absent guard preserved per ADR-0004 Option A).
- **Kaizen surface (out of scope for this run, raised by the implementer in `implementation-02.md`).** The class of bug — "admin endpoint mounted on a router whose siblings are ungated" — is not caught by any current gate. A Biome custom rule walking `app.route(prefix, router)` and asserting either (a) prefix is in an allow-list of public-by-design routes or (b) the router has a `use('*', requireSharedPasswordSession)` (or equivalent) at construction site would catch this at lint time. Recommend the orchestrator dispatch `/dantotsu` post-merge.
- **A32–A43 (UNVERIFIABLE — deferred).** Unchanged from the previous report; UI / CDK / Zod-schema surfaces remain explicitly deferred to follow-up PRs per `implementation-01` verdict.
- **`tonality.core.ts` branch coverage 87.5%.** Unchanged from the previous report — defensive `noUncheckedIndexedAccess` fallbacks, statically unreachable, vitest's perFile gate does not fire. Carry-forward observation, not a regression.

## Verdict: PASS_EXCEPT_UNVERIFIABLE

The blocker is closed, gates are green, no regression observed in the rest of the diff. The verdict carries the same 12 UNVERIFIABLE rows (A32–A43) as the previous report — all corresponding to deliberately-deferred UI/CDK surfaces. Per the validator's standard, FAIL would have been issued only on regression or a new failure mode; neither obtains. The single previously-failing row pair (A09 / D20) is now PASS with code and test evidence quoted above.

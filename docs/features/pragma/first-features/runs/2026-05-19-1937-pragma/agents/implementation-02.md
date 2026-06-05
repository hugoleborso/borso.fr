---
status: done
summary: |
  Closed the public-internet auth bypass on `POST /api/admin/rotate-password`
  (validator FAIL rows A09 / D20). Split `buildAuthRouter()` into
  `bootstrapRouter` (set-password, ungated — the row-absent check is the gate)
  and `rotateRouter` (carries `requireSharedPasswordSession` on the router
  itself, so cookie verification runs before the handler). Mounted both under
  `/api/admin` in `app.ts`; deleted the dead `/api/admin/protected` placeholder.

  Rewrote the back-e2e for rotate-password into two cases:
    1. without a cookie → 401, row stays untouched (asserted by
       re-reading `passwordHash` + `hmacKey` and comparing buffers).
    2. with a valid cookie → 200, both columns mutated, old cookie no
       longer validates, new password logs in, old password 401s.

  Bootstrap path stays correct: existing test still asserts 200-on-first-
  call + 409-on-second-call. All gates green: typecheck, biome lint
  (51 files), `test:core` (108 tests / 11 files), `test` back-e2e
  (8 tests including the new 401 assertion), knip (no output).

  Single commit `f26014f` pushed to `claude/pragma-erp-specification-k41Mg`
  on the first attempt.
artifacts:
  - apps/pragma/api/src/app.ts
  - apps/pragma/api/src/auth/auth.controller.ts
  - apps/pragma/api/src/auth/auth.controller.test.ts
next:
  kind: validate
---

## Diff summary

- **`apps/pragma/api/src/auth/auth.controller.ts`** — `buildAuthRouter()` now
  returns `{ publicRouter, bootstrapRouter, rotateRouter }`. `rotateRouter`
  applies `requireSharedPasswordSession` via `router.use('*', ...)` before the
  rotate handler. Header comment updated to point at the validation report.
- **`apps/pragma/api/src/app.ts`** — mounts the two admin routers separately:
  `app.route('/api/admin', bootstrapRouter)` then
  `app.route('/api/admin', rotateRouter)`. Removed the unused
  `/api/admin/protected` placeholder and the `requireSharedPasswordSession`
  import (now consumed inside the controller). Comment block names the original
  bug so future readers don't recombine the routers.
- **`apps/pragma/api/src/auth/auth.controller.test.ts`** — replaced the
  no-cookie-200 case with two cases: a 401 case that also asserts the row is
  untouched (`loadAppConfig` before/after, buffer equality on `hmacKey`,
  string equality on `passwordHash`), and a 200 case that uses the existing
  login flow to obtain a cookie, then asserts both columns changed. Added
  `loadAppConfig` import.

## Why the bypass is closed

The session middleware is now applied on the router that carries the rotate
handler, not on a sibling sub-mount that the rotate route was never reachable
through. Hono runs router-level middleware before the matched handler, so any
request reaching `POST /api/admin/rotate-password` traverses
`requireSharedPasswordSession` first; the new back-e2e directly observes this
by sending the request without a cookie and asserting both the 401 status and
that the DB row was not modified. The bootstrap route lives on a distinct
router that does *not* apply the middleware — preserving the ADR-0004 contract
("the row-absent check is the bootstrap gate").

## Kaizen observations

- **Structural eradication is feasible but not landed here.** The class of
  bug — "admin endpoint mounted on a router whose siblings are ungated" — is
  not caught by any current gate (typecheck, biome, knip, vitest). A Biome
  custom rule that walks `app.route('/api/admin', ...)` and asserts the
  router being mounted has a `use('*', requireSharedPasswordSession)` call
  in its construction site would catch it at lint time. The orchestrator
  should dispatch a `/dantotsu` follow-up to either ship that rule or land
  a knowledge entry pointing at the trap.
- **The validator's row D20 was right to flag the missing test.** Pairing
  every authenticated mutation endpoint with *both* a positive (200 with
  cookie) and a negative (401 without cookie) assertion in the plan's
  self-check column would have prevented the bug from shipping. Worth
  tightening in `/technical-conception`'s standard.
- **`apps/pragma/api/src/app.ts` no longer imports
  `requireSharedPasswordSession`.** Knip would have flagged that as an
  unused import — useful confirmation the dead placeholder is gone, but
  also means the only place the middleware is wired is now the controller
  file. A future reader scanning for "where is the cookie gate applied"
  needs to look in `auth.controller.ts`, not the route registrar. The
  comment in `app.ts` calls that out explicitly.
- **Pre-existing observation from validation-01: `tonality.core.ts`
  branch coverage 87.5%.** Untouched here; orchestrator should keep it on
  the kaizen list (separate from this round's scope).

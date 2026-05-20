---
status: done
summary: |
  Blocker A09 / D20 (auth bypass on POST /api/admin/rotate-password) is
  closed. The fix splits the admin router into bootstrapRouter (ungated,
  row-absent guard preserved per ADR-0004) and rotateRouter (carries
  requireSharedPasswordSession via router.use('*', ...) before the rotate
  handler). Both mounted at /api/admin in app.ts. Hono's router-level
  middleware resolution guarantees the cookie verifier runs before the
  handler — directly observed by the new back-e2e at auth.controller.test.ts:114
  (401 without cookie + row untouched) and strengthened existing test at
  line 139 (200 with cookie + both columns mutated + old cookie 401s +
  old password 401s + new password 200s). Bootstrap 409 test unchanged.
  Gates: typecheck 0, biome lint 0 (51 files), test:core 0 (108 tests),
  test back-e2e 0 (8 tests, was 7), knip 0, build 0. No regression in the
  diff (only the three intended files touched). Verdict carries the same
  12 UNVERIFIABLE rows (A32–A43) as the prior report — all deliberately-
  deferred UI/CDK surfaces, not regressions.
artifacts:
  - docs/features/pragma/first-features/validation/technical-validation-2026-05-19-2200.md
next:
  kind: ship
---

## Detail

See body of `docs/features/pragma/first-features/validation/technical-validation-2026-05-19-2200.md` for the full row-by-row re-validation, including the previous-report cross-references for A09 (now PASS), D20 (now PASS), and the carry-forward UNVERIFIABLE rows.

### Kaizen note (out of scope for this run)

The implementer's `implementation-02.md` proposes a Biome custom rule for the "admin endpoint mounted on an ungated sibling router" trap class. Worth dispatching `/dantotsu` post-merge to land either the rule or a knowledge entry — the bug shipped past typecheck, biome, knip, and the original test suite because no gate currently asserts middleware presence on a route's resolved chain. Logged here so the orchestrator can carry it forward.

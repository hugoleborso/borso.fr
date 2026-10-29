---
date: 2026-10-29
introduced-at: implementation
detected-at: ci
severity: low
related-pr: '#238'
fix-pr: '#238'
fix-commits: [self]
eradication-level: 2
eradication-paths: [.husky/pre-push]
time-to-detect: one CI run
tags: [coverage, vitest, pre-push, gates, ci, pragma]
zone: apps/pragma/api/src/calendar-feeds/calendar-feeds.schema.ts
recurs: [a-green-mutation-gate-is-not-a-green-coverage-gate]
---

# The coverage gate a wrong comment kept in CI

## Symptom

PR #238's first CI run, on `2e5aed5b`, failed the pragma job's step *Pure
suites and the per-file coverage gate*
([run 40918532741](https://github.com/hugoleborso/borso.fr/actions/runs/40918532741)).
The core suite never ran the callback that declares `calendar_feed`'s two
indexes, so `api/src/calendar-feeds/calendar-feeds.schema.ts` sat at 75 % of
lines and 0 % of functions under a 100 % per-file threshold. The push hook
had passed that tree. The fix, `7550244b`, read the indexes back through
`getTableConfig`, as `oauth.schema.test.ts` already did.

## Root-cause chain

1. **Why did the file miss its threshold?** A Drizzle table's third argument
   is a callback, and only something that reads the table's config calls it.
   The schema test parsed the request body and never touched the table.
2. **Why did nothing local say so?** `.husky/pre-push` ran the changed tests
   with `--changed <base>` and without `--coverage`. Its comment, from
   `9fc3b9a4`, explained
   why: "A per-file threshold needs the whole suite that covers those files,
   so running it over a changed-only selection would report every untouched
   pure file at 0 %."
3. **Why was that comment wrong?** Vitest's `coverage.changed` defaults to
   the value of `--changed`. A run with both flags measures only the changed
   files the coverage include names, and `--changed` has already selected
   every test that imports those files, however deep. No untouched file is
   reported at all.
4. **Why did nobody test the claim?** It read as a fact about thresholds,
   and the cost it described was believable. The skills that brief the
   implementer and the validator repeated it as "coverage is CI's".

**Root cause:** thought a coverage run scoped by `--changed` measures the
whole include and reports untouched files at 0 %, actually Vitest scopes the
coverage to the changed files by itself.

## Detection failure causes

- **Functional validation locally:** the technical validator and the
  implementation skill both said "coverage is CI's", by the same belief, so
  neither ran it.
- **CI (tests / build):** caught it, as designed. The cost was one red run
  and one fix push.

## Countermeasure

- **Code:** commit `7550244b` (PR #238) covered the index callback.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-push gate)

**Reference:** [PR #238](https://github.com/hugoleborso/borso.fr/pull/238) · the commit adding this file

**The actual fix:**

The push hook's existing per-app test run now carries `--coverage`. No new
run is started, and the comment says what Vitest really does.

```diff
-      pnpm --filter "@borso-app/$app" exec vitest run --project core --changed "$push_base"
+      pnpm --filter "@borso-app/$app" exec vitest run --project core --changed "$push_base" --coverage
```

The technical-validation standard, the validator agent and the
implementation skill now run the same flag and no longer call coverage CI's.

**Proof it fires.** PR #238's schema test from `2e5aed5b` put back, one
line appended to the schema so `--changed HEAD` selects it, then the hook's
command in `apps/pragma`:

```
ERROR: Coverage for lines (80%) does not meet global threshold (100%) for api/src/calendar-feeds/calendar-feeds.schema.ts
ERROR: Coverage for functions (0%) does not meet global threshold (100%) for api/src/calendar-feeds/calendar-feeds.schema.ts
ERROR: Coverage for statements (80%) does not meet global threshold (100%) for api/src/calendar-feeds/calendar-feeds.schema.ts
```

It exited 1. With `7550244b`'s test it exited 0. Both files were then
restored.

**What it costs.** Measured in `apps/pragma` over `--changed HEAD~3`, which
holds #238 and #239, 86 test files: 66 s without coverage, 79 s with it.
The single-file case above took about 7 s.

**What stays in CI.** Mutation testing. PR #238's mutation job also failed,
on 8 survivors, and `scripts/mutate-changed.sh` says why it is CI's: it took
194 s of a 244 s push on PR #216. That decision is unchanged.

**Sibling defects swept:** the hook's infra/cdk and infra/shared runs still
gate coverage in CI only. They were not part of this failure and were not
measured, so they keep the old behaviour.

## See also

- [`a-green-mutation-gate-is-not-a-green-coverage-gate.md`](./a-green-mutation-gate-is-not-a-green-coverage-gate.md),
  the earlier miss of the same gate.
- [`../knowledge/the-shell-gates-are-only-ever-run-where-they-pass.md`](../knowledge/the-shell-gates-are-only-ever-run-where-they-pass.md),
  why the proof above plants the defect.

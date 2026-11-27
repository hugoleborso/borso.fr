---
date: 2026-08-08
introduced-at: conception
detected-at: local
severity: high
related-pr: '#40'
fix-commits: [0bf0ad517b]
eradication-level: 1
eradication-paths: [.github/workflows/ci.yml, apps/pragma/vitest.config.ts, apps/pragma/tsconfig.json]
time-to-detect: months
tags: [vitest, coverage, gates, ci, testing, purity]
zone: .github/workflows/ci.yml
weak-point: gate-measures-nothing
recurs: [biome-formatter-was-not-gated]
---

# The 100% coverage gate on pure files was never armed

## User impact

CLAUDE.md and `docs/standards/02-purity-and-core-files.md` promised that every
`*.core.ts` and `*.utils.ts` file ships at 100% coverage, asserted by the test
runner. Three lint rules push logic into those files on that promise.

| | Seen | Expected |
| --- | --- | --- |
| An agent adds a pure function in pragma | the file sits at 66% and the suite passes | the run exits non-zero |
| Gate armed for the first time | ten pragma files fail, among them `api/src/auth/session-cookie.utils.ts` at 89% branches (session validation), and one in last-loop-lepin | already green, because already gated |

## Causal chain

- A pure file at 66% passed in pragma and last-loop-lepin. Two faults combine.
  - Branch one. Vitest ignored the coverage thresholds.
    - The `coverage` block sat inside a project entry of `vitest.workspace.ts`.
      Vitest reads `coverage` from the root config only, and accepted the block
      without a warning.
      - The faulty block, written by commit `5b2643aaa1`, last-loop-lepin's
        scaffold, whose message says "Per-file coverage gate is wired via
        vitest workspace":

        ```ts
        export default defineWorkspace([
          { test: { name: 'core', /* ... */
              coverage: { provider: 'v8', thresholds: { perFile: true, ...COVERAGE_THRESHOLDS } } } },
        ```

        - Every earlier config (`infra/cdk`, `borso-fr`, `borsouvertures`) was a
          single config with the block at its root. Last-loop-lepin was the
          first app split into two projects, so no example existed for where the
          block goes in a workspace.
          - Commit `0fafc57821` scaffolded pragma "modelled on last-loop-lepin"
            and copied the block into the same place.
  - Branch two. Nothing ran coverage for these apps in CI.
    - `test:core`, the script CI called, did not pass `--coverage`. Only
      `test:coverage` did, and it needs a live Postgres.
    - `apps/pragma` appeared in no workflow at all. `grep -rn pragma .github/`
      returned one line, in `path-filters.yml`.
- A milder third fault. `borso-fr` and `borsouvertures` put the block at the
  root but without `perFile: true`, so the thresholds applied to the aggregate.

## Root cause of occurrence

*Thought a `coverage` block inside a workspace project entry applies to that
project, actually Vitest has one coverage configuration per run, read from the
root config, and a project's block is silently inert.* (Material)

The agent that wrote `5b2643aaa1` had no example of a workspace in the
repository, and Vitest 2 ran the misplaced block with no warning. The rule that coverage is root-only was not in its context (inferred).
The commit message asserts the gate works, which shows the writer believed it.

## Detection failure causes

- **Typing:** under Vitest 2, the commit passed typecheck with the block in a
  project entry, so the type either accepted it or never read the file
  (inferred).
- **Self-validation:** the gate was checked by reading its config, not by
  breaking a file and watching the run fail.
- **Run output:** the run printed a per-file coverage table, failing rows
  included, and exited 0. A table and a gate look the same in a passing log.
- **Documents:** three documents asserted the gate as fact, so later readers
  inherited the claim rather than testing it.

## Countermeasure

Commit `0bf0ad517b` moves the `coverage` block to the root `vitest.config.ts` of
both full-stack apps and deletes the inert blocks. It adds `--coverage` to
`test:core`, adds `perFile: true` in `borso-fr` and `borsouvertures`, and adds
pragma to the `app-tests` job with its own Postgres. The gate then failed ten
pragma files. Three were real gaps, now tested. Seven were unreachable branches,
deleted, the largest being a `try/catch` around Node's base64 decoder, which
never throws.

## Eradication

**Type:** structural impossibility (level 1), for the two faults that hid the
gate. The `perFile` choice is still written by hand.

**Reference:** commit [`0bf0ad517b`](https://github.com/hugoleborso/borso.fr/commit/0bf0ad517b)
armed the gate. Two later states hold it today.

- Vitest 4.1.12, installed today, types an inline project entry as
  `ProjectConfig`, which omits `coverage`. Every app's `tsconfig.json` includes
  its `vitest.config.ts`, and `pnpm -r typecheck` runs in CI. A planted block
  fails to compile (proof below).
- `ci.yml`'s *Pure suites and the per-file coverage gate* step passes
  `--coverage` itself, for every app the matrix holds, whatever the app's
  scripts say:

  ```yaml
  if grep -q '"test:core"' "apps/$APP/package.json"; then
    pnpm --filter "@borso-app/$APP" exec vitest run --project core --coverage
  ```

**Proof it can fail:** a scratch `defineConfig({ test: { projects: [{ test: {
name: 'core', coverage: { ... } } }] } })` checked with `tsc`, measured this
session: `error TS2769 ... 'coverage' does not exist in type 'ProjectConfig'`,
exit 1. When the gate was armed, a planted unreachable branch in
`site/src/sw/manifest.utils.ts` made `test:core` exit 1 with 609 tests passing.

**Gap:** `thresholds: { perFile: true, statements: 100, ... }` is copied by hand
into each root `vitest.config.ts` (`grep -rln perFile --include='vitest*.ts' .`
lists them). A new app that omits `perFile` or the whole block passes every
check.

**Proposed:** export the pure-file coverage block once, from a shared module
beside `infra/cdk`, and make each app's `vitest.config.ts` spread it.
`scripts/check-app-registration.sh`, which already refuses an app missing its
path filter, would refuse an app config that does not import it. The hand
copies go away, and a missing or weakened gate fails the first commit of a new
app.

**Similar instances:** `ls apps/*/vitest.workspace.ts` finds none left. Every
app now declares its suites as `projects` under one root `vitest.config.ts`,
which pragma's blueprint describes.

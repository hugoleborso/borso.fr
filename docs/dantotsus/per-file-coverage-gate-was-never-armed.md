---
date: 2026-08-08
introduced-at: conception
detected-at: measurement
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-commits: []
eradication-level: 1
time-to-detect: months
tags: [vitest, coverage, gates, ci, testing, purity]
---

# The 100% coverage gate on pure files was never armed

## Symptom

CLAUDE.md says every `*.core.ts` and `*.utils.ts` ships at 100% statement,
branch, function and line coverage, and that the test runner asserts it.
`docs/standards/02-purity-and-core-files.md` repeats it. Three ESLint rules push
logic into those files on the strength of that promise.

An agent adding a pure function noticed its file sitting at 66% and the suite
still passing. Checking the claim rather than the file found the gate had never
run for `apps/pragma` or `apps/last-loop-lepin`.

With it armed, ten pragma files failed immediately, including
`api/src/auth/session-cookie.utils.ts` at 89% branches — session validation.

## Root-cause chain

Two independent faults, either of which alone was enough.

1. **The `coverage` block sat where Vitest never looks.** Both apps declared it
   inside a project entry of `vitest.workspace.ts`. Vitest reads `coverage`
   from the **root** config only; a block inside a project is accepted, ignored,
   and reported nowhere. There is no warning, no deprecation notice, and the run
   prints a coverage table, so the output looks exactly like a gate that passed.
2. **`test:core` never passed `--coverage`, and `test:core` is what CI runs.**
   The flag lived only on `test:coverage`, which needs a live Postgres and was
   not the script `ci.yml` invoked for these two apps. So even with the first
   fault fixed, nothing would have enforced anything.

A third fault, milder, in the two front-end-only apps: their block is in the
right place, but it omitted `perFile: true`, so four 100% thresholds applied to
the aggregate across all pure files. One file at 90% would have been masked by
its neighbours.

And underneath all three: **`apps/pragma` appeared in no CI workflow at all.**
`grep -rn pragma .github/` returned one line, in `path-filters.yml`. Its 609
tests had never gated a pull request.

## Detection failure causes

- **The gate was verified by reading its configuration, not by breaking it.**
  The config said `thresholds: { perFile: true, statements: 100, … }`, which is
  what a working gate looks like. Nobody made a pure file drop below 100% and
  checked that the run went red.
- **A coverage table is not a coverage gate.** The run printed per-file
  percentages the whole time, including the failing ones. Reading the table and
  seeing numbers is not the same as the process exiting non-zero, and the two
  look identical in a passing log.
- **Three documents asserted the gate as fact.** Once CLAUDE.md and two
  standards say a thing is enforced, the next reader inherits the claim rather
  than testing it. The documentation made the defect harder to see, not easier.

## Countermeasure

- The `coverage` block moved to the root `vitest.config.ts` in both full-stack
  apps, and the dead blocks were **deleted** from `vitest.workspace.ts` rather
  than left in place. An ignored block that looks load-bearing is what made this
  invisible; leaving it would preserve the trap.
- `--coverage` added to `test:core` in both apps, which is the script CI runs.
- `perFile: true` added in `borso-fr` and `borsouvertures`. A no-op today, since
  both are genuinely at 100% on every file, but it arms the gate the standard
  describes rather than a weaker one.
- `apps/pragma` added to the `app-tests` job, with its own Postgres service on
  port 5433. A second instance rather than a second database on the first: each
  app applies its own migrations and truncates its own table list, so sharing
  one database would leave each teardown blind to the other's tables.

## Eradication

**Level 1 — structural.** The gate is now on the path CI takes, and it was
proven to bite rather than assumed to. A deliberately unreachable branch was
injected into one pure file per app and the exact CI command run:

```
$ pnpm --filter @borso-app/pragma run test:core
      Tests  609 passed (609)
ERROR: Coverage for branches (94.44%) does not meet global threshold (100%)
       for site/src/sw/manifest.utils.ts
EXIT CODE = 1
```

Every test passing and the command still exiting 1 is the property that was
missing. Both injections were reverted.

## What the gate was hiding

Ten pragma files and one in last-loop-lepin. Three were genuinely untested
behaviours, now pinned: `transposeChord` leaving the enharmonic respellings
`Cb`, `Fb`, `E#` and `B#` untouched rather than moving them a semitone;
`resolveEmbed` falling back to a plain link for a YouTube playlist or channel;
`pickPaletteHex` throwing on a fractional index.

Seven were branches that could not be reached, and were deleted rather than
covered. The largest: `fromBase64Url` wrapped `Buffer.from(value, 'base64url')`
in a try/catch, but Node's base64 decoder silently drops invalid characters and
never throws, so the catch and all three downstream `=== null` guards were dead.

The remaining two were `mostRecentCorrectionAt` and `formatStandingsAsCsv` in
`ranking.core.ts`, both exported and both with no test at all. The first feeds
the spectator page's "results amended at".

That ratio is the argument for the gate. Three real gaps and seven dead
branches, none of which any reviewer had spotted, in files the standards
describe as the most carefully tested in the repository.

## What to check next time

Before trusting a gate, break something and watch it fail. A configuration that
reads correctly, a report that prints numbers, and a documented promise are
three kinds of evidence that all look like enforcement and none of which is.

The specific trap: `coverage` is root-config-only. Any `coverage`
key inside a project entry of a workspace or a `projects` array is silently
inert. There is exactly one coverage configuration per Vitest run, shared by
every project in it.

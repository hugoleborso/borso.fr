# A timeout under parallel gates is not a regression

The pre-push hook now starts every gate at once — knip, the infra coverage
suites, each changed app's affected tests, each app's scoped mutation run.
That is what took the gate from about fifty minutes to seconds, and it has
one consequence worth writing down: **the sandbox has four cores, and a
saturated machine makes slow things look broken.**

## What it looked like

Immediately after moving every workspace to vitest 4, three CDK tests
timed out at once. The reading practically writes itself: a major version
bump, three simultaneous failures in the same layer, therefore a
regression in the new version.

It was not. Re-running each app's suite **alone** left exactly one real
failure. The other two were contention — CDK synth is CPU-bound, several
suites were synthesizing at the same time, and the default 5-second test
timeout is not generous when four cores are shared between a mutation run
and three test projects.

The one real failure was a latent flake that predated vitest 4: a CDK
synth test on the default 5-second timeout, which had always been close to
the edge and only ever failed when the machine was busy. `infra/cdk` had
already set `testTimeout: 30_000` for this reason; the app configs had not
inherited that precedent. They do now.

The same shape happened twice more in one session:

- A poll of a CI run read as "hung". It had finished; the polled snapshot
  was stale. All four jobs were green (47 s / 48 s / 88 s / 115 s).
- A subagent's broad `pkill -f "stryker run"`, aimed at its own run, killed
  two other agents' in-flight measurements — one at 79% complete. Now
  blocked by a hook; see
  [`broad-pkill-killed-another-agents-measurement.md`](../dantotsus/broad-pkill-killed-another-agents-measurement.md).

## The rule

**Before attributing a timeout to a code or version change, re-run the
suite alone.** Two minutes of serial re-run beats an afternoon of bisecting
a version bump that did nothing wrong.

Three tells that you are looking at contention rather than a defect:

1. **Several failures arrive together**, in unrelated files, all timeouts.
   Real regressions cluster by cause, not by clock.
2. **The failures are all `Test timed out in Nms`** rather than assertion
   failures. A version bump that broke behaviour produces wrong values, not
   slow ones.
3. **Other gates were running.** Check whether a mutation run or another
   app's suite was in flight — `SKIP_MUTATION_GATE=1` isolates cheaply.

## Corollaries

- **30 s was still not enough for the app stack tests.** A later push failed on
  `pragma app stack > declares no Secrets Manager resources` timing out at 30 s.
  Re-run alone, that file takes about 15 s, so half the budget was already spent
  before any contention; under the full parallel wave the pragma `core` suite
  went from about 110 s to 235 s and the budget ran out. Both full-stack apps'
  `core` projects are now at **60 s**. Set the budget against the busiest
  machine the gate runs on, not the quietest, and treat "passes alone with half
  the budget left" as already too close.
- **A CPU-bound test needs an explicit `testTimeout`.** CDK synth, esbuild
  bundling and anything spawning a subprocess should not sit on the 5-second
  default in a repo whose gates run in parallel. `infra/cdk` and `infra/shared`
  use `testTimeout: 30_000`; both full-stack apps' `core` projects, which
  synthesize a whole CDK app twice per test, use `60_000`.
- **Never stop a process by pattern.** In a sandbox where several agents
  share a machine, the only safe target is a PID you started.
- **Re-read before reporting.** A poll result is a snapshot; if it says
  something surprising about a long-running job, fetch it again before
  writing it down.

## See also

- [`gate-timings-before-and-after.md`](./gate-timings-before-and-after.md)
  — what each gate costs, and the parallel wave that caused this.
- [`a-teardown-that-deleted-another-runs-live-files.md`](../dantotsus/a-teardown-that-deleted-another-runs-live-files.md)
  — the other thing parallel gates broke: a teardown that differenced
  `/tmp` and deleted other runs' cloud assemblies.
- [`cdk-tests-leak-a-temp-assembly-per-synth.md`](../dantotsus/cdk-tests-leak-a-temp-assembly-per-synth.md)
- [`lectured-without-reading-the-code.md`](../dantotsus/lectured-without-reading-the-code.md)
  — the general form: concluding from an observation you did not re-check.

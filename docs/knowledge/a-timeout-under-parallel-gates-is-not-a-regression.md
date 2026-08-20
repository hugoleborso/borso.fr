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

- **Raising the timeout twice was the wrong fix; the third look found the real
  one.** A push failed on a stack test at 30 s, so the budget went to 60 s. The
  next push failed on the same kind of test at 60 s. A number that needs raising
  twice is not a budget, it is a symptom: `synthAppStack` was being called
  **twelve times per file** while producing only two distinct templates, so each
  suite synthesised the same app six times over. Caching by stage took the
  pragma file from 16.4 s to 5.15 s, and the last-loop-lepin file with it. The
  budget stays at 60 s as headroom for genuinely CPU-bound work, but it is no
  longer what keeps the gate green.

  The general rule: **when a timeout needs raising a second time, stop raising it
  and go and count how often the slow thing runs.** Cost per call is rarely the
  problem; number of calls usually is.
- **A CPU-bound test needs an explicit `testTimeout`.** CDK synth, esbuild
  bundling and anything spawning a subprocess should not sit on the 5-second
  default in a repo whose gates run in parallel. `infra/cdk` and `infra/shared`
  use `testTimeout: 30_000`; both full-stack apps' `core` projects use `60_000`.
- **Synthesize once per distinct result, not once per assertion.** A `Template`
  is immutable once built, so a suite asserting twenty things about two stacks
  needs two synths. Both app stack suites cache by stage; copy that in any new
  one.
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

## Stryker's dry run has its own budget, and it is five minutes by default

The same contention reaches mutation testing, where it surfaces with a
different message: `Initial test run timed out!`, followed by
`Something went wrong in the initial test run`. That is **not** a mutant and
not a survivor — it is Stryker's *dry run*, the unmutated pass it uses to
collect per-test coverage, hitting `dryRunTimeoutMinutes`, whose default is
five.

Measured on the push that removed every comment from the repository, with six
mutation runs started at once on four cores: `last-loop-lepin`'s dry run took
**3 minutes 46 seconds** and passed; `pragma`'s, which instruments 83 files
against 576, exceeded five minutes and killed the run. Neither app's tests had
changed in a way that could slow them down.

`stryker.shared.js` now sets
`dryRunTimeoutMinutes: DRY_RUN_TIMEOUT_MINUTES_UNDER_THE_PARALLEL_PUSH_WAVE`,
at 20. The budget is for the loaded machine the gate actually runs on, in the
same spirit as the `testTimeout` reasoning above.

**Telling the two apart matters**, because the fixes are opposite: a survivor
is a missing assertion and is yours to fix, while this is a budget and fixing
it by weakening a test would be a real regression. Read the line before the
stack trace — `Final mutation score N under breaking threshold 100` is a
survivor, `Initial test run timed out!` is this.

## The third data point, and the fix that is not another number

A push touching every application put six mutation runs in flight at once.
Stryker's default is four workers per run, so that was **twenty-four mutation
workers plus four test suites against four cores**. The victim was not a
mutation run: it was a CDK synth test in another gate, which **measured 5.06
seconds run alone and timed out past 60 seconds under the wave** — a factor of
thirteen, on a test nothing had touched.

That is the third time this shape has cost a push, and the section above
already says a number that needs raising twice is not the fix. So the budget
stayed at 60 seconds and the oversubscription went instead:

- `.husky/pre-push` exports `BORSO_MUTATION_RUNS_IN_FLIGHT`, an upper bound on
  the runs it is about to start (changed apps, plus tooling, plus infra).
- `stryker.shared.js` derives `concurrency` from it —
  `availableParallelism() / runs`, floored at one and capped at four.

A single run, which is what a normal push starts, still takes the whole machine:
four workers on four cores, unchanged. Six runs take one each. On a larger CI
box the cap keeps the old behaviour at both ends.

**The tell that you are here rather than looking at a real failure:** the test
that fails is in a *different* gate from the expensive one, its own duration is
close to the timeout rather than well past it, and it passes alone in seconds.

## A memoised fixture bills the whole synth to whichever test runs first

Sharing the concurrency above cut the CDK stack test from 68.5 s to 60.5 s,
against a 60 s budget. Still red, and raising the budget would have been the
third raise. The remaining cost was not contention alone but where it landed.

Both full-stack apps memoise their synthesised templates in a
`templateByStage` map, so the file synthesises each stage once. The **first
test to ask** therefore pays for two synths and four esbuild bundles, and the
eight after it are nearly free. Alone that is 5 s and invisible. Under the
wave it is the whole file's cost charged to one `it`, against one test's
timeout.

The fix is to stop billing a warm-up to an assertion. Both files now do the
synths in `beforeAll`, with an explicit generous timeout of their own, so each
`it` is timed for what it actually asserts:

    beforeAll(() => {
      synthAppStack('prod');
      synthAppStack('preview');
    }, SYNTH_WARMUP_TIMEOUT_MILLISECONDS);

**The tell:** one test in a file is far slower than its siblings and its
duration matches the file's total, while the assertions inside it are trivial.
Look for a lazily-memoised fixture before looking at the test.

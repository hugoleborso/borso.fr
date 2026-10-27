## Round 2 — after 97e9477b, 353a9e40 and 48863507
Verdict: FINDINGS (only the talos finding above, left open on purpose until the operator decides)
Ledger: 036b6981105e (unchanged since round 1)
Reviewed: 4 file(s), each read in full. Sealed: 4. New findings: 0.
`seal.ts verify --base origin/main` before this round reported 5 of 5 files not cleared. Four were `edited-since-it-was-reviewed` by 48863507, and `todos-memory.service.ts` was `never-reviewed`. After sealing, it reports 1 of 5 not cleared, and that one is `apps/talos/api/src/todos/todos-memory.service.ts`. That file was not reviewed again: its round 1 finding stands and waits for an operator decision.
### Sealed
- infra/cdk/src/internal/migration-runner/index-build-jobs.utils.ts — `IndexBuildStep` is now a four-way discriminated union (`poll-again`, `settled`, `check-index`, `failed`), which closes the round 1 advisory about a family of booleans. A `sys.jobs` status the runner does not recognise is now `{ kind: 'running', status }`, and `describeUnfinishedIndexBuild` names it, so a build still in flight is no longer reported as INVALID. `computeIndexBuildDeadline` and `hasWaitLimitPassed` keep their verbs, and the new constants are named. The file now also holds `MIGRATION_RUNNER_TIMEOUT_SECONDS` (see the advisory below).
- infra/cdk/src/internal/migration-runner/index-build-wait.ts — every job waits against the deadline the caller passes in. `finishIndexBuild` narrows on `Exclude<IndexBuildStep, poll-again>`, and `assertIndexIsValid` still throws and returns nothing. No comments.
- infra/cdk/src/internal/migration-runner/index.ts — the handler computes one deadline from `Date.now()` before it connects and passes it through `provisionSchema` and `applyMigrations` to `settleIndexBuild`. `Delete` does not take it. `sql.end()` still runs in `finally`. This closes the round 1 advisory about the per-job deadline outrunning the Lambda timeout.
- infra/cdk/src/constructs/dsql-schema.ts — the branch replaced `Duration.minutes(5)` with `Duration.seconds(MIGRATION_RUNNER_TIMEOUT_SECONDS)`, which synthesises the same Timeout of 300. Nothing else in the file changed, and nothing the checklist covers fails.
### Previous findings outside the seal scope
- `scripts/browser/touch-tap.ts:79`, untrusted input annotated into shape: **closed.** `touch-tap.ts:60` now calls `parseCdpReply(String(message.data))`. That function and the schemas behind `findPageTarget`, `parseTapPoint` and `parseRecordedEvents` are in `touch-tap.core.ts`, as `cdpReplySchema`, `pageTargetSchema` (which checks `url` too), `tapPointSchema` and `recordedLogSchema`. No hand-written type guard remains.
- `pretool-no-discarding-reset.sh:49` and `scripts/lint-changed-files.sh:6-9`, history-note comments: **closed.** Both notes are gone. The remaining comments explain why the code does what it does.
- Hook regression (round 1, outside the checklist): **closed.** I ran the hook against a scratch repo with a dirty tracked file and a staged file. Each of the following exits 2:
  - `cd "<quoted path>" && git reset --hard`
  - `git -C $PWD reset --hard`
  - `cd $HOME/x && git reset --hard`
  - `git -C /nonexistent reset --hard`
  - `git restore --staged g; git restore f` and the `&&` form
  - `git -C . reset --hard`
  - `git restore -W -S f`
  Each of these exits 0: `git status`, `git restore --staged g`, `echo 'git reset --hard'`, and `git reset --hard && git restore f` on a clean tree. `check-hook-decisions.sh` reports 72 decisions matching the contract.
### Outside the checklist (advisory)
- `MIGRATION_RUNNER_TIMEOUT_SECONDS` is the Lambda's timeout, a property of the whole runner, and it now lives in `index-build-jobs.utils.ts`, which `dsql-schema.ts` imports for that one constant. Keeping it beside the wait limit derived from it is a defensible reason, and the file is still mostly about index build jobs, so I did not make this a file-name finding. If another runner limit ever derives from it, move it to a runner-level module.
- `pretool-no-discarding-reset.sh:41-45`: `(git reset --hard)` exits 0 with a dirty tree. `GIT_INVOCATION` requires `git` to follow the start of the line, `;`, `&`, `|` or whitespace, so a `(` in front skips the first grep. The `origin/main` hook does the same, so this is not a regression. `{ git reset --hard; }` is refused. The fix is to add `(` to the character class on `:41` and a must-refuse row in `check-hook-decisions.sh`.

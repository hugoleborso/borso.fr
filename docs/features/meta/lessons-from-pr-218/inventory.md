# Friction inventory — PR #218 and PR #219

PR #218 implemented [ADR-0049](../../../adr/0049-agents-read-production-through-an-invoked-reader-lambda.md):
agents read production through a reader Lambda invoked over the AWS API rather
than over the Postgres wire protocol. PR #219 fixed the defect the first live
read found, and replaced the gate that first fix shipped.

Both are swept together because #219 exists only because of #218 and their
friction logs overlap by construction — which is itself row 01.

The read path was proven end to end on 2026-10-29, after #219 deployed. That
closes row 09 of [PR #199's inventory](../lessons-from-pr-199/inventory.md),
open since 2026-10-27.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | post-merge | The two archived friction logs differ by exactly one line. `kaizen.sh archive` is a plain `cp` of the whole log, so a session that archives twice ships every earlier line again, and this sweep had to triage PR #217's work a second time. | `scripts/kaizen.sh:131`; `diff` of the two archives returns one added line; four archives in the tree carry the same stale rows | `dantotsu: the-friction-log-that-arrived-twice` |
| 02 | implementation | `gate-canaries` refused the branch twice, in CI, for a mechanism with no canary. The enforcement ledger ran clean locally and says nothing about canaries; the inventory is a separate command nobody runs. | `ci:gate-canaries (fast)` and `(slow)` red at `df61e3e2` and `0d0d555c`; `gate-canaries.ts --inventory` prints the answer in 2 s | `dantotsu: the-gate-whose-own-gate-only-ran-in-ci` |
| 03 | implementation | A deploy-time gate cannot be canaried by planting a defect, because the defect would have to be in production. | `transcript`: the canary design round | `merge into the-gate-whose-own-gate-only-ran-in-ci` |
| 04 | validation | Reported three refusals as `exit=0` because `$?` read `tail` through a pipe, not the script. A fail-open would have looked identical. | `transcript`: "mes `exit=0` mesuraient `tail`"; re-measured 3/3/3/0 without the pipe | `knowledge: an-exit-status-read-through-a-pipe-is-the-pipes` |
| 05 | deploy | IAM's 2048-character cap on inline user policies is an aggregate across the user's policies; the error names only the document just sent. | `kaizen:23:45`; `LimitExceeded` on a 1887-char document while 525 were already spent | `no-op: knowledge entry shipped in #218, iam-inline-user-policies-share-one-2048-character-budget.md` |
| 06 | deploy | The auto-mode classifier refused a Bash call chaining two `iam put-user-policy`; one call each went through. | `kaizen:23:45`; the refusal names `[Permission Grant]` | `fixed: extends the-auto-mode-classifier-refuses-guard-probes.md` |
| 07 | deploy | DSQL refuses `default_transaction_read_only` and closes the connection. The handler's mocked driver accepted it and one test asserted it. | `kaizen:00:55`; `ci:deploy` green, first live read red | `no-op: dantotsu shipped in #219, the-connection-parameter-no-mock-could-refuse.md` |
| 08 | implementation | The first eradication for row 07 was a pre-commit grep running on 100 of the last 100 commits to guard five identical lines. | `transcript`: the operator asked whether the check would ever be needed | `merge into the-check-that-cost-more-than-the-defect` |
| 09 | implementation | Nothing in the repository weighs a new pre-commit check's recurring cost against how often its subject changes. The runtime budget caps a check's CPU and says nothing about whether it earns the run. | `docs/standards/14-tool-runtime-budgets.md`; row 08 | `dantotsu: the-check-that-cost-more-than-the-defect` |
| 10 | implementation | The smoke script judged its payload in `jq`, a second writing of `readInvocationOutcome`. ADR-0049's own single-implementation criterion, broken within a day. | `transcript`; the rewrite reuses the function | `no-op: recorded in the-connection-parameter-no-mock-could-refuse.md and fixed before merge` |
| 11 | pr-description | `pretool-gh-pr-create` refused twice, once per PR, because the friction log was not archived. | `kaizen:21:33`, `kaizen:23:49` | `no-op: the hook is the eradication and it fired both times; row 01 is the real defect behind it` |
| 12 | implementation | `pretool-no-swallowed-push` refused twice, because `git commit` and `git push` were piped into `tail`. | `kaizen:23:32`, `kaizen:23:34` | `no-op: the hook is the eradication and it fired both times; row 04 is the uncovered half` |
| 13 | spec | The operator asked for one reader in shared infrastructure; the question was answered as a challenge rather than taken as a direction, and per-app shipped without ratification. | `transcript`: *"je croyais avoir dit que je voulais un shared"*; ADR-0049 § *Why one function per application* | `dantotsu: the-question-i-answered-instead-of-obeyed` |
| 14 | post-merge | Row 09 of PR #199's inventory said the prod read path had never been exercised. It has now. | `transcript`: five reads, four refusals, exit codes verified | `fixed: this PR closes the row` |
| 15 | implementation | Four lines in both archives — resumed-session marker, rtk's compressed log, the racy `check-pwa-assets` pipe, the unheard merge notice — were swept and eradicated in #202 and #217 and arrived here again. | row 01 | `merge into the-friction-log-that-arrived-twice` |
| 16 | implementation | Two lines in both archives are about the pragma MCP server and belong to neither PR. | `kaizen:21:23` ×2 | `merge into the-friction-log-that-arrived-twice` |

## Patterns

**Three rows are one shape: a gate that fired correctly and a gate that could
not fire at all.** Rows 11 and 12 are hooks doing their job, twice each — those
are no-ops and the repeat is operator discipline. Rows 02 and 04 are the
opposite: a mechanism with nothing proving it works, and a verification whose
own measurement was wrong. The repeat in 11 and 12 is noise; the silence in 02
and 04 is the signal.

**Two rows are the same mistake at two scales (08, 09, 13).** Writing a
permanent pre-commit check against a one-off accident, and answering the
operator's architectural question instead of following it, are both *deciding
unilaterally where the cost lands on someone else*. The first cost every future
commit 39 ms; the second shipped an architecture nobody ratified.

**Row 01 corrupts the input to this very procedure.** Six of sixteen rows exist
only because the archive carries the whole session rather than what this task
logged. A sweep whose primary input re-triages already-eradicated work spends
its budget on noise, which is exactly the failure the friction log exists to
prevent.

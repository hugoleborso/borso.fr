# Friction log — PR #206, pragma assistants through MCP and OAuth

Archived by the kaizen sweep for PR #206 from three logs, none of which is
committed:

- the feature worktree's `KAIZEN.md`, every line (29 lines, from the pipeline
  stages and the later `merge-206`, `mcp-rationalize`, `mcp-cut` and
  `split-206` agents);
- the orchestrating session's `KAIZEN.md`, from its first line timed inside the
  run (`[08:17]` on 2026-10-27) to its end (19 lines). The hooks write there,
  so every `hook:` line of the run is in this part. The session's earlier lines
  belong to PRs #193, #199 and #218 and stay out;
- the sweep's own lines, labelled `kaizen-206` (4 lines).

The run's lines carry a clock time and no date: the run started on 2026-10-27
and its last line is from 2026-10-29. The sweep's own lines carry the date,
which `kaizen.sh` writes from this pull request on.

## Feature worktree

- [08:42] `technical-conception-01` The spec named tool files mcp/tools/<area>.tools.ts, a suffix the pragma layer-marker gate (budget zero) would refuse, and nothing checked the spec's file list against the layer table
- [09:28] `implementation-02-2` the plan has slice 2 parse registrations with the MCP SDK's OAuthClientMetadataSchema, but the SDK only joins the catalog in slice 3, so slice 2 cannot follow the plan as written
- [09:28] `implementation-02-2` the plan cites the in-memory middleware-public-rate-limit blueprint for a registration limit it also calls database-backed; the two cannot both hold
- [09:28] `implementation-02-2` pragma back-e2e has no way to observe reportTaggedFailure, so every service that reports a named failure needs a reportFailure option threaded through createApp to be testable
- [11:20] `implementation-06-6` slice 3 shipped set_default_lineup describing the lineup as instrument id to member ids, the reverse of the Lineup type, and no test reads tool descriptions against the schema
- [11:39] `implementation-06-6` the plan named tool-coverage.core.ts as a test-only gate, but check-pure-modules-have-callers refuses a pure module with no runtime caller and only pre-commit said so, after every other gate had passed
- [12:05] `implementation-07-7` Driving the consent Allow/Deny redirect in agent-browser lands on chrome-error://chromewebdata/ and hides the redirect address unless something listens on the loopback port, which nothing in the visual-validation recipe says.
- [12:05] `implementation-07-7` deleteAllDomainRows in the test seed did not clear the assistant_* tables slices 2-6 added, so a re-seed left grants of deleted members behind; nothing ties a new table to the seed's wipe list.
- [12:17] `technical-validation-01` The technical-validation skill requires dispatching the technical-validator agent, but a workflow subagent has no Agent tool, so the stage had to run the validator procedure inline.
- [12:20] `technical-validation-01` ESLint over the 130 changed files of the branch aborted with a JavaScript heap out-of-memory at the default Node heap; it only passed with NODE_OPTIONS=--max-old-space-size=6144.
- [12:40] `technical-validation-01` The run-state state.json written with json.dump failed the pre-commit Prettier check, because the pipeline contract says to update the file but nothing says it is Prettier-formatted.
- [13:28] `implementation-fix-technical-01` editing an unshipped migration in place left the local pragma Postgres on the old schema, and back-e2e failed on a missing column with nothing naming the stale migration
- [13:30] `technical-validation-02` the technical-validation skill requires dispatching the technical-validator agent, but a workflow subagent has no Agent tool, so the validation runs inline in the stage agent
- [13:36] `technical-validation-02` eslint over the branch's 131 changed files aborted with a V8 heap out-of-memory under the default heap while the pragma test suites ran beside it; it only passed with NODE_OPTIONS=--max-old-space-size=8192
- [14:02] `visual-validation-01` the visual-validation skill requires dispatching the visual-validator agent, but a workflow subagent has no Agent tool, so the stage had to run the validator brief itself
- [14:05] `visual-validation-01` argent touch on a button that navigates away reports isRealTouch false with no touchstart, because the probes are lost with the page, so a successful tap reads as a failed one
- [14:22] `implementation-fix-visual-01` The preview seed stamped its assistant grant with session epoch 0 while every credential starts at 1, so the seeded 'live' grant was dead on arrival and no test noticed until the list filtered on epoch.
- [14:43] `visual-validation-02` argent touch on the OAuth Allow button again reported isRealTouch false because Allow navigates to the callback and the probes leave with the page, so a successful tap reads as a failed one
- [14:43] `visual-validation-02` argent's Chromium has no session and no fill command, so signing in for a touch row meant writing a CDP Runtime.evaluate helper by hand
- [14:47] `technical-validation-01` the technical-validation skill requires dispatching the technical-validator agent, but a workflow subagent has no Agent tool, so the stage ran the validator brief inline
- [14:48] `technical-validation-01` the workflow reused the label technical-validation-01 for a second run, so the scratch folder already held the first run's gate logs and the agents/technical-validation-01.md verdict file name was taken
- [15:33] `open-pr-01` open-pr step 5b says to replace the <n> placeholder in the visual validation report, but check-dated-records-are-append-only refuses any edit to that dated report
- [00:28] `merge-206` check-pr-body.ts reads a file, but no tool here fetches the live PR body to a file (gh is not installed), so checking an existing body means retyping it from the MCP response
- [21:28] `mcp-rationalize` scripts/db-read.sh times out connecting to the prod DSQL endpoint on port 5432 from this hosted session; outbound only goes through the HTTPS proxy
- [22:14] `mcp-rationalize` a composite MCP tool cannot live in the slice that owns its noun when that slice's service would import a service that already imports it back (mastery and songs, sessions and setlists), so import/no-cycle decides tool placement
- [22:14] `mcp-rationalize` the SDK's tools/list output carries $schema, additionalProperties:false and execution on every tool, about a quarter of the list, and nothing in the repo measured the list size until now
- [01:26] `mcp-cut` a heredoc writing the commit message, chained before a piped git commit, never ran because the no-swallowed-push hook refused the whole command, and the next commit failed on the missing message file
- [01:48] `mcp-cut` pragma app-tests in CI ran 10m16s and was cancelled by the 10-minute job timeout while every back-e2e file passed; the previous head took 8m22s, so the job sits near its ceiling
- [02:12] `split-206` vitest list silently ignores --shard and lists every file, so a shard split cannot be checked without running the suite

## Orchestrating session

- [08:17] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [08:42] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [10:11] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [10:11] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [10:40] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [10:56] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [11:40] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [12:05] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [12:39] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [13:23] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [14:34] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [14:43] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [14:44] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [15:32] `hook:pr-body` wrote a pull-request body carrying markup the server silently strips
- [15:34] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [00:07] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [22:28] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [01:25] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [02:11] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status

## This sweep

- [02:48] `kaizen-206` scripts/db-read.sh pragma "select ..." glued the app name into the statement and sent 'pragma select ...' to the reader, because the app is an APP variable and the script takes every argument as the query
- [02:48] `kaizen-206` every scripts/db-read.sh invoke from this hosted session on 2026-10-29 was refused with an explicit deny on lambda:InvokeFunction for ...-agent-reader:$LATEST, and the script surfaced it as a Node stack trace with exit 1
- [02:48] `kaizen-206` the kaizen worktree had no node_modules and no generated reports, so check-hook-decisions failed on the blueprint-context case until pnpm install and scripts/reports.sh all ran
- [2026-10-29 02:57] `kaizen-206` the orchestrating session's log holds lines from PRs #193, #199, #218 and #206 stamped with a clock time and no date, so the #206 lines could only be cut out by guessing the day from commit times

# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [00:13] `visual-validator` agent-browser has no virtual-authenticator command, so a spec claim about passkeys surviving a password recovery cannot be exercised in the browser at all
- [00:19] `technical-validator` pragma's site/src/routes/vote/VotePage.test.tsx retract-a-vote case fails intermittently (1 in 3 runs) on aria-pressed after flushMicrotasks, so test:core reports a red gate unrelated to the branch under review
- [00:20] `visual-validator` the recovery rate limit is three failures per hour per address, so validating every error case in one browser session locks the validator out; only an X-Forwarded-For header gave fresh buckets, and nothing in the spec or the tooling says that is how to get one
- [00:29] `hook:no-swallowed-push` piped git push into another command, throwing away its exit status
- [00:33] `hook:no-swallowed-push` piped git push into another command, throwing away its exit status
- [00:44] `technical-validator-2` the plan's pre-flight gates name pnpm --filter @borso/pragma, a workspace that does not exist (the real name is @borso-app/pragma), in four places, so following the plan literally fails with 'No projects matched the filters'
- [00:57] `technical-validator-3` a spec's Test strategy enumerates back-e2e cases that silently omit one of its own Use cases / edge cases, and nothing cross-checks the two lists, so two validators graded the same uncovered edge case differently
- [01:16] `technical-validator-4` a reviewer cannot measure whether a new back-e2e test can fail, because the mutation gate is scoped to *.utils.ts and *.core.ts and a service file is never mutated, so the discriminating power of a service-level test has to be argued from the code rather than demonstrated
- [01:16] `technical-validator-4` the pragma back-e2e suite prints only pass counts, so proving a specific named case ran costs a second 2.5-minute run with --reporter=verbose
- [01:25] `hook:pr-body` wrote a pull-request body carrying markup the server silently strips
- [13:35] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [13:41] `hook:no-swallowed-push` piped git push into another command, throwing away its exit status
- [13:46] `hook:no-swallowed-push` piped git push into another command, throwing away its exit status
- [13:47] `main` no-swallowed-push refused a command whose git commit was redirected to a file, because a later, unrelated grep on the same line was piped into head
- [13:49] `hook:no-swallowed-push` piped git push into another command, throwing away its exit status
- [14:09] `hook:no-swallowed-push` piped git push into another command, throwing away its exit status

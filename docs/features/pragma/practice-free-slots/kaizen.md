# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [10:43] `hook:no-swallowed-push` piped git push into another command, throwing away its exit status
- [10:44] `hook:no-swallowed-push` piped git push into another command, throwing away its exit status
- [11:10] `hook:no-swallowed-push` piped git push into another command, throwing away its exit status
- [11:54] `main` pre-commit fails with 'generated files are stale' on the gitignored blueprint index every time a commit adds a @FollowsBlueprint marker, and the fix is always to rerun the generator by hand
- [12:06] `main` CI's repo-wide ESLint aborts on heap out of memory at Node's 4 GB default whenever the cache does not cover the change; main fails the same way cold, so the job only passes on a warm cache
- [12:30] `main` pnpm dev in apps/pragma starts an empty local Postgres and nothing applies the migrations to it, so the seed route 500s on 'relation task does not exist'
- [12:56] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [13:13] `technical-validator` the branch under validation received two commits and a concurrent run on the shared local pragma Postgres while the validator's suite was running, so the first pragma run failed 11 back-e2e tests on duplicate keys that do not reproduce in isolation
- [13:22] `visual-validator` POST /api/__test/seed on pragma-pr-118 returned 500 Internal Server Error once after members had removed and re-added calendar feeds and free-slot practices existed; an immediate retry returned 200
- [13:24] `visual-validator` argent run screenshot --out ignores the --out path and writes to /tmp/argent-chromium-media, returning that path instead
- [14:21] `technical-validator-2` the validator brief says to wait on background suites with Monitor, but no Monitor tool is exposed to this subagent, so waiting meant a timeout-wrapped until-loop in Bash
- [14:27] `visual-validator-2` First POST /api/__test/seed of the run on pragma-pr-118 returned 500 Internal Server Error; the immediate retry returned 200.
- [14:45] `visual-validator-2` agent-browser 'find label "SECRET ICAL ADDRESS" fill <url>' printed Done but left the input empty, so the Save that followed looked like a server-side rejection.
- [14:45] `visual-validator-2` After POST /api/__test/seed the signed-in browser kept rendering the app shell while every API call returned 401 bad-signature; only clearing localStorage brought back the sign-in form.
- [14:45] `visual-validator-2` The cut-at-now edge case can only be observed inside today's 18:00-24:00 Paris window, so a validator run in the afternoon has to idle until 18:00 or leave the row unverified.
- [14:52] `visual-validator-3` The free-slots 'cut at now' edge case can only be observed in the preview between 18:00 and 22:00 Paris on a weekday (or a weekend daytime), because the API reads the real clock and offers no way to set now.
- [15:00] `visual-validator-3` After POST /api/__test/seed the browser's old session cookie gets 401 on /api/me while the app shell still renders as signed in, and login.sh cannot sign in because the login form is not shown, so every reseed needs a manual cookie clear.
- [16:08] `visual-validator-2` After an 80-minute idle wait, the agent-browser session answered every in-page fetch with 'TypeError: Failed to fetch' until the daemon was restarted.
- [16:21] `hook:pr-body` wrote a pull-request body carrying markup the server silently strips
- [00:33] `pr-118` pre-commit eslint reported unresolved-type errors across talos and infra/shared in a fresh worktree because @borso/infra had no dist yet, and the message never names the missing build
- [00:53] `pr-118` pre-push on a branch push that merges main in mutated 81 talos files and every other changed core from main's 100 commits, instead of narrowing to the branch's own changes
- [01:48] `pr-118` pre-push runs the talos mutation of 81 files concurrently with every app's tests, and the starved CPU times out four unrelated tests (infra-cdk synth, infra-shared synth, borso-fr, talos) that pass alone
- [02:48] `pr-118` pre-push typecheck of pragma and last-loop-lepin was OOM-killed (exit 137) while sibling agents ran mutation in the same container; four pushes failed on load alone
- [04:32] `pr-118` scripts/local-postgres.sh keys the cluster on the app slug only, so parallel agents in separate worktrees run pragma back-e2e against the same /tmp/borso-pg-pragma database and 76 tests fail on duplicate app_config rows
- [02:27] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [02:48] `main` pre-push failed a talos stack test after merging main because infra/cdk dist was built before the merge; the assertion named a bucket name, not a stale build
- [02:59] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [05:12] `main` merging main brought Sentry tracing into pragma, whose fetch spans keep URL paths; nothing flagged that a secret calendar address lives in a path
- [05:52] `main` a wait loop using pgrep -f on a pattern matched its own command line, so it never ended and ran until the background time limit
- [13:23] `main` merging main gave pragma two migrations numbered 0015; ours had run on previews and was not re-runnable, so renaming it would have failed the preview

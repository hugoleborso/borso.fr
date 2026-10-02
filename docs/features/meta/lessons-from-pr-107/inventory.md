# Friction inventory — PR #107

The sweep behind `docs: lessons from PR #107`. PR #107 shipped password recovery
with the band password on pragma and deleted enrolment. Every friction event of
the task is a row, before any classification. Sources: the ten lines of
[`kaizen.md`](./kaizen.md) (archived from the hosted container), the session
transcript, the six commits of the PR (`5760ce3` to `73d85e7`), its CI runs, and
the five validation reports under
`docs/features/pragma/password-recovery-with-the-band-password/validation/`.

The kaizen log came from eight writers: `visual-validator` (2 lines),
`technical-validator` to `technical-validator-4` (5 lines across four agents),
two hooks, and one line from `main` during this sweep. Four separate validator runs logged a line each, so the
validation loop is the stage this task struggled with most.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | conception | A member who forgot their password had no way back in; the operator needed `psql` on prod, a hand-built argon2 hash and a manual `session_epoch` increment | transcript: first question of the session | no-op: eradicated by PR #107 itself, which is the feature |
| 02 | conception | The first hash command passed the new password through `argv`, where shell history and `ps` keep it; replaced by a hidden prompt | transcript: `node -e … 'LE_NOUVEAU_MOT_DE_PASSE'` | no-op: a one-off recovery script, now obsolete because recovery is a route |
| 03 | conception | The session could not verify whether every member held a credential: the harness refused `aws dsql generate-db-connect-admin-auth-token` as a production read, while `aws ssm get-parameter` passed | transcript: classifier `[Production Reads]` | knowledge: `the-production-database-is-out-of-reach-of-a-hosted-session` |
| 04 | conception | `scripts/dsql-shell.sh` defaults `APP` to `last-loop-lepin` and prints last-loop-lepin's table names whatever `APP` is, so the handoff had to warn about both | transcript: reading the script; handoff "deux pièges connus" | dantotsu: `the-database-shell-that-opened-the-other-app` |
| 05 | conception | Writing the handoff with a shell heredoc was refused by the auto-mode classifier; the Write tool worked | transcript | no-op: harness behaviour outside this repository, and the dedicated tool is the documented path |
| 06 | spec | The operator added "remove the enrolment screen" mid-task; the consequence (no self-service way to create an account) was surfaced and accepted | transcript; spec Q.O.D. row 6 | no-op: the spec step worked as designed and recorded the decision |
| 07 | plan | The plan's pre-flight gates named `@borso/pragma`, a workspace that does not exist; running them answered "No projects matched the filters" | kaizen: `technical-validator-2`; transcript: first typecheck attempt; `kaizen.md` of `audience-song-voting` logged the same name a month earlier | dantotsu: `the-workspace-name-that-was-never-checked` |
| 08 | plan | The plan claimed eighteen test files stay untouched; `voting.controller.test.ts` called the deleted `enrol()` directly | report: `technical-validation-2026-09-18-0015.md` notes; commit `17f63e7` | merge into 07: a plan claim nothing checked against the tree |
| 09 | implementation | Login and recovery would have shared one bucket store with two budgets, so five failed sign-ins would have closed the recovery door | transcript; commit `5760ce3` (`sharedPasswordBucketStore`) | no-op: caught before commit and pinned by a back-e2e case |
| 10 | implementation | The pre-commit prettier check refused a test file, then the stale blueprint index refused the commit | transcript: two failed commits | no-op: both gates named the exact command to run, which is their job |
| 11 | validation | `pnpm dev` in pragma served an API against an empty database: every route answered 500 `relation "member_credential" does not exist`; migrations had to be applied by hand through `test/setup-postgres.ts` | transcript: dev log; last-loop-lepin's `dev-db.sh` does apply them | dantotsu: `pnpm-dev-served-an-empty-database` |
| 12 | validation | The fixture seed route lives at `/api/__test/seed`, not the guessed `/api/test/seed`, and the shared password had been bootstrapped by hand although the seed already does it | transcript: `seed=404`, then `200` | merge into 11: a working `pnpm dev` seeds on its own |
| 13 | validation | Vite took port 5174 because 5173 was busy; the skill probes 5173 | transcript: dev log | no-op: the skill already says to read the port from the config, and Vite printed it |
| 14 | validation | `tsx -e` refused top-level await because it emits CommonJS | transcript | no-op: one invocation, fixed with a script file; nothing in the repository tells an agent to use `tsx -e` |
| 15 | validation | `agent-browser` has no WebAuthn virtual authenticator, so the passkey claims were unverifiable in a browser | kaizen: `visual-validator`; report: `visual-validation-2026-09-18-0015.md` rows 16, 29 | knowledge: `driving-pragma-auth-from-a-validator` |
| 16 | validation | The recovery rate limit locked the visual validator out; only a distinct `X-Forwarded-For` header gave it a fresh bucket, and nothing says so | kaizen: `visual-validator` | merge into 15 |
| 17 | validation | The visual run left the dev database with new passwords for every seeded member and an extra `Ghost` member | report: `visual-validation-2026-09-18-0015.md` housekeeping note | merge into 11: the dev database is rebuilt on every `pnpm dev` once 11 lands |
| 18 | validation | `VotePage.test.tsx` failed about one run in three on an optimistic retract asserted after a single `flushMicrotasks()` | kaizen: `technical-validator`; commit `c19282c` | no-op: fixed in `c19282c` by waiting on the condition; a grep finds no other test asserting `aria-pressed` or `aria-checked` after a fixed flush |
| 19 | validation | The spec told the 429 to reuse a string that says "a few minutes" for a sixty-minute window | report: visual row 24 note; commit `c19282c` | no-op: a one-off copy decision, corrected in the PR |
| 20 | validation | The mutation gate found three survivors in a body-reading branch that no longer decided anything | transcript: pre-push; commit `cd4aedd` | no-op: the gate did exactly its job |
| 21 | validation | Three technical passes in a row failed, each on a row the previous had graded PASS or missed; one edge case was graded PASS twice by citing lines that did not cover it | kaizen: `technical-validator-3`; reports `-0015`, `-0045`, `-0115` | dantotsu: `the-edge-case-two-validators-graded-pass` |
| 22 | validation | A deviation from the spec lived only in a commit body, so the documents described behaviour that did not ship | report: `technical-validation-2026-09-18-0045.md` A20 | merge into 21 |
| 23 | validation | The mutation gate never mutates a service file, so whether a service-level test can fail has to be argued rather than shown | kaizen: `technical-validator-4` | no-op: standard 13 scopes mutation to pure files on purpose; the validator stated the argument, which is the right fallback |
| 24 | validation | The back-e2e suite prints counts only, so proving one named case ran cost a second full run | kaizen: `technical-validator-4` | no-op: `vitest run -t "<case name>"` runs one case in seconds; recorded in the knowledge entry of row 15 |
| 25 | pr-description | `/visual-validation` and `/implementation` mandate `## Validation gaps` and `## Visual evidence` sections that `check-pr-body.ts` refuses as unknown sections | transcript: twelve violations, then three | dantotsu: `two-skills-asked-for-sections-the-checker-refuses` |
| 26 | pr-description | `/visual-validation` tells the author to embed screenshots as markdown images; the GitHub MCP server strips them and the `pr-body` hook refused the call | kaizen: `hook:pr-body`; `docs/knowledge/github-mcp-pr-body-sanitizer.md` | merge into 25: same skill text, contradicting a knowledge entry that already existed |
| 27 | pr-description | `git push` piped into `tail`, refused twice by `no-swallowed-push` | kaizen: `hook:no-swallowed-push` ×2 | no-op: the hook is the eradication and it fired both times |
| 28 | post-merge | The operator found the PR's mermaid diagram broken: `login[/login]` opens a parallelogram that never closes; `check-pr-body.ts` counted the nodes and passed it | transcript: "attention to mermaid est cassé" | dantotsu: `a-route-in-a-mermaid-node-opened-a-parallelogram` |
| 29 | post-merge | The stop hook asked to commit screenshots the visual validator was still writing | transcript | no-op: a user-level hook outside this repository; waiting for both reports was the right response |
| 30 | post-merge | The designated branch was the merged PR head; the harness says to restart it under the same name, the skill says `claude/lessons-from-pr-<N>` | SessionStart: `branch-context` warning | no-op: covered by `docs/dantotsus/designated-branch-was-a-merged-pr-head.md`; the harness rule wins and the branch was restarted from `main` |
| 31 | post-merge | During this sweep, `no-swallowed-push` refused `git commit … > log 2>&1; grep … \| head` three times: its match crossed `;`, and the hook had no row in `check-hook-decisions.sh` | kaizen: `main`, and four `hook:no-swallowed-push` lines of which one was a genuine pipe and three were this match; the hook also logged every commit refusal as a push; commit `9703c82` | dantotsu: `the-hook-that-was-missing-from-its-own-contract` |
| 32 | post-merge | After restarting the branch from a `main` that had gained banana-rush, knip reported banana-rush's dependencies as unused and pre-commit refused a stale blueprint index; the cause was the session having installed and generated for the old tree | transcript: knip output, pre-commit refusal | no-op with code: the merged-branch warning now says to run `pnpm install` and `scripts/reports.sh all` after a restart (`ad36261`) |
| 33 | post-merge | `main` refused every commit: PR #110 and PR #111 had both added ADR 0021, and a banana-rush test was collected by no Vitest project | pre-commit: `check-numbered-sequences`, `check-every-test-is-collected` | no-op with code: fixed here to unblock (`bdd93b7`, `b35a4b2`). Two parallel branches each pass alone; only "require branches to be up to date" catches the pair, and that is a branch-protection setting this repository cannot observe, so it is surfaced to the operator rather than claimed |
| 34 | post-merge | A commit swept in files staged by two earlier attempts the hook had refused | transcript: `git show --stat` of the first ADR commit | no-op: caught by reading the commit before pushing, then split with `git reset --soft`; row 31's fix removes the refusals that left the staging behind |
| 35 | post-merge | `no-broad-kill` refused a `pkill -f` used to stop the old dev server | kaizen: `hook:no-broad-kill` | no-op: a correct refusal; the server was stopped by PID instead, which is what the hook asks for |

## Decisions

| Decision | Rows |
| --- | --- |
| dantotsu | 7 |
| knowledge | 2 |
| merge into another row | 6 |
| no-op | 20 |

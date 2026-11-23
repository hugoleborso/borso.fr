# Friction inventory of PR #399

PR #399 was the sweep of PR #395. This sweep ran in its own session, because
the shipping session ended at 404,111 tokens of context, above the 150,000
threshold (measured, `get_session` `context_usage.used_tokens`). The operator
approved the hand-off ("oui lance-la").

Sources: `scripts/kaizen.sh sweep-input e5c0619e8` (10 lines, 1 archive), the
operator's 9 typed messages in `session_01K69KnBaHhTLkshdgJbYDuV` (all 15
`user` pages read), the 11 commits, the PR's 3 comments and 0 review threads,
1 visual report with no FAIL row, and the open pull requests (no open
`kaizen` one). Writers: `main` 4, `visual-validator` 3, hooks 3. Each logged a
different wall, so none is systemic by count.

| # | When | Friction | Sources / evidence | Cause | Elsewhere | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | implementation | The sweep wrote a 137-line compiler walk, a fixture and a mutation suite to derive the cache buster. | log `main` 20:50; commits `eb52a28`, `ba61136` | The library search was prose (step 2c) at a step nothing fires on | `.claude/skills/after-task-kaizen/SKILL.md` step 2c, and PR #363's inventory, which called the library option "a product call nobody asked for" | dantotsu: the-gate-said-delete-and-the-sweep-said-as-expected |
| 02 | conception | Operator, 19:52: "Meh. Cache management whose code you write by hand?" The options that followed were all hand-written, and he picked the TypeScript 7 one. | transcript 19:52:43, 19:52:58 | The sweep built around a cost instead of offering the library option with it | same as row 01 | merge into the-gate-said-delete-and-the-sweep-said-as-expected; the balance refusal now says to offer that option even when it costs something he sees |
| 03 | implementation | Operator, 20:28: "In your query library there are surely things that handle the cache. You're rewriting too many scripts." | transcript 20:28:38; commit `fe4ddbe` | same as row 01 | same as row 01 | merge into the-gate-said-delete-and-the-sweep-said-as-expected |
| 04 | pr-description | The sweep answered a red `kaizen-balance` with "as expected". Operator, 20:49: "It's not 'as expected', it's 'you figure it out'." | log `main` 20:50; transcript 20:49:11; ci `kaizen-balance` red at `ba61136` (added 366, removed 30, measured on a worktree) | The skill said "A sweep that still adds more stays red, and the operator merges it or sends it back" | `.claude/skills/after-task-kaizen/SKILL.md` step 5 | merge into the-gate-said-delete-and-the-sweep-said-as-expected; the sentence is gone |
| 05 | implementation | Operator, 20:49: "This gate is meant to make you understand you must use libraries. The best code is the code you don't write." | transcript 20:49:49 | The refusal said "remove what each addition replaces" and nothing about reuse, and ran only in CI after the PR opened | `scripts/kaizen.sh` balance refusal, `.github/workflows/ci.yml` | merge into the-gate-said-delete-and-the-sweep-said-as-expected; `pre-push` runs it on `lessons-from` branches and the refusal asks for the library |
| 06 | implementation | A `git push` chained after a failed commit ran pre-push gates for 8+ minutes with nothing to push. Operator, 20:10: "git commit and push take 8+ minutes?" | log `main` 20:12; transcript 20:10:33 | Git runs `pre-push` with no ref line when everything is up to date, and the hook read an empty base as "the whole branch since main" (measured on a scratch repository and on the old hook) | `.husky/pre-push` | fixed: the hook exits 0 when no ref line pushes a commit |
| 07 | implementation | The TypeScript 7 package exposes its compiler API only under `typescript/unstable/sync`. | log `main` 19:40 | A vendor layout | none, the code that used it was deleted in `fe4ddbe` | no-op: `grep -rn typescript/unstable` outside node_modules finds nothing |
| 08 | implementation | `hook:no-prettier` refused Prettier in a repository that formats with oxfmt. | log 19:36 | none, the hook did its job | none | no-op: the gate caught it, one refusal |
| 09 | pr-description | `hook:visual-validation` refused a pull request changing a front end without a report. | log 19:44 | none, the hook did its job | none | no-op: the gate caught it, and the report followed at 19:45 |
| 10 | validation | `scripts/phone.sh touch` delivered the tap but exited 1, the page reading 1280 px after the gesture. | log `visual-validator` 19:46 | Unknown | none found | no-op: does not reproduce here on a plain tap or a navigating tap, both exit 0 at 375 px (measured) |
| 11 | validation | On a Monday the pragma seed shows no spent joker, so the validator mocked the streaks answer. | log `visual-validator` 19:48 | The joker week starts on Monday, so no earlier day of the week exists to spend one | `apps/pragma/api/src/__test/test-seed-presences.core.test.ts` spends yesterday's | no-op: no seed can spend a joker this week on a Monday; the mock is the route (inferred) |
| 12 | validation | `agent-browser network route` on `/api/streaks` did not match the batched `POST`, though PR #399 had extended the knowledge entry on that trigger 7 minutes before. | log `visual-validator` 19:48; commit `69d48e3` | The knowledge hook keyed "already shown" on `session_id`, which a subagent shares with its parent, so a subagent never saw an entry its parent had seen (measured: before the fix the subagent call printed 0 entries, after it 1) | `.claude/hooks/knowledge-triggers.sh` | fixed: the seen list is keyed on session and agent |
| 13 | implementation | `hook:no-broad-kill` refused `pkill` while stopping the hung push. | log 20:12; transcript | Row 06 | row 06 | merge into row 06 |
| 14 | post-merge | Operator, 20:58: "merge when it's green", and 21:07: "yes, launch it". | transcript | none | none | no-op: direction with no lesson |
| 15 | post-merge | This sweep's transcript agent found that `operator-messages.ts` reads only spilled pages, so six inline pages were scanned by eye. | log `transcript-399` 21:10 | This sweep, not PR #399 | none | no-op: logged in this sweep's archive for the next sweep |

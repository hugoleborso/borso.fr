# Friction inventory of PR #407

PR #407 was the kaizen sweep of PR #406. Its session stood at 328,401 tokens of
context at the merge, above the 150,000 threshold (measured, `get_session`
`context_usage.used_tokens`), so this sweep ran in its own session, which the
operator approved ("oui lance le kaizen", 10:18).

Sources: `scripts/kaizen.sh sweep-input 214ec4bc9` (3 lines, 1 archive), the 2
operator messages `scripts/kaizen/operator-messages.ts` printed from 9 pages of
the shipping session, its assistant events around both hook refusals, the 6
workflow runs of the branch (all green on the one push), and the PR's
conversation, which holds no review thread. No open kaizen pull request
overlaps.

Writers of the friction lines: `hook:no-prettier` 1, `hook:no-swallowed-push` 1,
`main` 1. Its one subagent, a transcript pager, logged nothing.

| # | When | Friction | Sources / evidence | Cause | Elsewhere | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | implementation | The session ran `pnpm exec prettier --write` after a scripted edit, and the hook refused it. | kaizen `hook:no-prettier` 09:51; transcript 09:51:18, chained after a heredoc with `>/dev/null 2>&1 \|\| true` | A reflexive "format after edit" with no prior failure naming Prettier (inferred: nothing in the transcript mentions Prettier before it). | none, the hook names `oxfmt` and the next call used it with success at 09:51:25. | no-op: the hook removed the cost, one refused call |
| 02 | implementation | The session made a `git commit --no-verify -m wip` snapshot to isolate a `--changed` probe, and the hook refused it. | kaizen `hook:no-swallowed-push` 09:52; transcript 09:52:56 | `vitest --changed` needs the edit committed to compare; `vitest related <file>` does not. | `docs/knowledge/vitest-changed-skips-a-test-that-reads-files.md` already names `vitest related` and fires on it. | no-op: the session switched to `vitest related` at 09:53:07, and the entry now teaches it |
| 03 | implementation | The first token-test fix assumed a `?raw` glob adds module-graph edges. | kaizen `main` 09:59 | An untested premise. | none | merge into PR #406's row 29: `vitest-changed-skips-a-test-that-reads-files` records the measured table |
| 04 | post-merge | The operator had to ask for the 12 PNGs of PR #406 to be deleted ("supprime les screenshots", 10:18). | operator 10:18:34; `docs/dantotsus/screenshots-committed-instead-of-pending.md` last line | The sweep wrote "deleting them is a separate decision for the operator" into its entries and asked nothing. The self-merge rule only looked for a question in the body, so a decision parked in an entry still let it merge alone. | `.claude/skills/after-task-kaizen/SKILL.md` *Merge it yourself* and CLAUDE.md *Hard rules* | fixed: both now allow the self-merge only when the sweep leaves the operator no decision, in its body or in an entry |
| 05 | post-merge | Deleting those PNGs hit the dated-records pre-commit gate, which the sweep never probed. | transcript 10:19:06, `[pre-commit] ERROR: … dated-records` | `scripts/check-dated-records-are-append-only.sh` covers `docs/**/validation/**`, PNGs included. | Whether passing evidence is a dated record is a product call. | merge into the shipping session's open question: it asked keep or delete at 10:19:26, recommending keep, and this sweep does not ask it twice |
| 06 | post-merge | The operator asked why PR #406 committed the screenshots instead of sending them to S3. | operator 10:18:55 | The PR #407 body named what is now impossible, not how it happened. | none, the dantotsu's causal chain holds the why. | no-op: the shipping session answered from that chain at 10:19:26 |
| 07 | post-merge | `operator-messages.ts` listed the seeded `/after-task-kaizen` prompt as typed by the operator. | this sweep's first run; the event carries `client_platform: claude_code_mcp_seed` and `text_not_typed: true` | The selector ignored the harness's `text_not_typed` flag. | `scripts/kaizen/operator-messages.core.ts` | fixed: events with `text_not_typed` are dropped, with a test; the rerun printed only the 2 typed messages |
| 08 | post-merge | The kaizen session ended at 372,736 tokens of context, above the 150k target, for a 3-line archive. | `get_session`, this sweep's `cost.md` | Guess: transcript pages and their tool results read in the main context. | `/after-task-kaizen` told the sweep to page the transcript itself. | fixed: the skill now has one subagent list the pages; the script reads pages its subagents listed too (measured: 7 of this sweep's 9 pages came from a subagent) |
| 09 | post-merge | The shipping session kept working after the merge, so two sessions held the same branch's follow-up. | `get_session` 10:19, status `need_input` | The hand-off starts the sweep while the shipper still answers the operator. | none, the two did not touch the same files. | no-op: no collision; the sweep reads the shipper's state before acting, as row 05 shows |
| 10 | deploy | CI went green on the one push. | 6 workflow runs, `ci` 45797471056 | none | none | no-op: no friction |

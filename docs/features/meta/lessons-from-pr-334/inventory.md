# Friction inventory of PR #334

PR #334 was the kaizen sweep of PR #327. Squash-merged as `731066132` on
2026-11-14 at 23:21 UTC. Sources read for this table:

- `scripts/kaizen.sh sweep-input 731066132` listed 9 lines in
  `docs/features/meta/lessons-from-pr-327/kaizen.md`.
- 4 lines logged after the archive, pasted in the sweep prompt.
- 3 session facts from the same prompt.
- 9 commits, 5 comments (all preview bots) and no review thread.
- 15 workflow runs on `claude/lessons-from-pr-327`.
- PR #334's own inventory, whose rows S1 to S6 already decided the 9 archived
  lines.

Writers of the 13 logged lines: hooks 7, `tooling` 2, `process` 2, `browser`
1, `main` 1. Every subagent logged under its label.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | `no-discarding-reset` refused a discard on a checkout it could not read | archive 19:35, `hook:no-discarding-reset` | no-op: the refusal names the literal-path form that works, and #334's row S6 reached the same verdict |
| 02 | implementation | `no-discarding-reset` refused a discard while tracked changes existed | archive 19:35, `hook:no-discarding-reset` | no-op: that is the one state where the command destroys work, and the hook held it |
| 03 | implementation | `check-dantotsu-front-matter` refused an untracked eradication path, so a subagent that may not stage could not turn its entry green | archive 19:37, writer `browser`; #334 row S1 | dantotsu: the-rule-against-staging-met-the-tools-that-assumed-it. Reopens S1: two of #334's own mechanisms contradicted each other |
| 04 | implementation | `subagent-no-staging` refused a subagent | archive 19:40, `hook:subagent-no-staging`; prompt: the refused command was `git mv -h` | merge into 03. Reopens the "so it stays" in `a-rename-that-staged-itself` |
| 05 | implementation | A process-group kill guarded with `$$` killed its own pipeline | archive 19:40, writer `process` | no-op: #334 shipped the `$BASHPID` guard in `.claude/hooks/pretool-no-broad-kill.sh` line 50 (read) |
| 06 | implementation | The container has no man pages | archive 19:40, writer `process`; `man kill` and `git help mv` print "This system has been minimized" (measured) | knowledge: reading-third-party-sources-from-a-session, extended with a `man` trigger. Reopens S3, because row 03's fix makes `git <sub> -h` the documented way and a reader needs to be told |
| 07 | implementation | `no-prettier` refused Prettier | archive 19:41, `hook:no-prettier` | no-op: refused before any file moved, the verdict of #334 row S6 and of PR #339's sweep row 09 |
| 08 | implementation | Stryker failed with `ERR_MODULE_NOT_FOUND vitest` in a scratch worktree whose `node_modules` is a symlink | archive 19:41, writer `tooling`; reproduced on `check-only-change.core.ts`; an offline install fixed it in 6.9 s (measured) | knowledge: stryker-sandbox-and-plugin-resolution-under-pnpm, extended. Reopens S4, whose workaround produced row 14 |
| 09 | implementation | The friction line blamed `%` while the reader cut trailing literals | archive 19:41, writer `tooling` | no-op: shipped in #334 as the-percent-sign-that-was-blamed-for-a-missing-string |
| 10 | implementation | `pre-push-conflict` refused a branch that conflicts with `origin/main` | prompt line 22:22; merge `7e3a63c` resolved `.claude/settings.json` | no-op: the hook caught it before CI. This is the first `settings.json` merge conflict in any inventory (`grep settings.json docs/features/*/*/inventory.md`, measured) |
| 11 | implementation | The same refusal a minute later | prompt line 22:23 | merge into 10 |
| 12 | pr-description | `merge-on-moved-base` refused a merge beside base commits no CI had tested | prompt line 22:48; merge `8e282e0`; CI run 43650034556 green | no-op: the hook held the merge, the session merged `main`, and CI passed before the 23:21 merge |
| 13 | implementation | `check-spec-records.sh` grandfathered specs by first commit date, which `git log` cannot see during a merge | prompt line 23:22, writer `main` | no-op: fixed before the merge. The merged script skips a spec found in `origin/main` or `MERGE_HEAD` (`scripts/check-spec-records.sh` line 41, read) |
| 14 | implementation | The first push failed in knip on untracked probe files a running subagent left under `scripts/` | prompt fact; reproduced with `scripts/zz-untracked-probe.ts`: `Unused files (1)`, exit 1 | dantotsu: the-push-that-waited-for-another-agents-probe |
| 15 | implementation | The staging hook went live mid-session and refused `git mv -h` | prompt fact | merge into 03 |
| 16 | implementation | The merge of `main` failed oxlint with `type error` until `pnpm install` | prompt fact; `git log -S'node_modules/.pnpm/lock.yaml' -- scripts/lint-workspace.sh` shows #155 adding the guard and #197 dropping it | dantotsu: the-merge-that-linted-against-dependencies-it-never-installed |
| 17 | ci | CI run 43647962120 was cancelled | `list_workflow_runs` on the branch | no-op: the push of `a22f81e` a minute later superseded it, and every head went green |
| 18 | spec | 2 h 37 min passed between the first push (19:45) and the Records commit (22:22) | commit dates | no-op: the operator's product answer, Option A, arrived in that window. A product call, not friction |
| 19 | post-merge | The merge added no ADR | `git diff --name-only 731066132^ 731066132 -- docs/adr/` is empty | no-op: nothing to stamp |
| 20 | post-merge | Review threads | `get_review_comments` returned none; the 5 comments are preview bots | no-op: nothing to address |
| 21 | post-merge | `check-knowledge-triggers` passed this sweep's trigger written with `[[:space:]]`, printing only a `FutureWarning` | this sweep's `KAIZEN.md`; the check now fails with "does not compile cleanly" on that pattern (measured) | fixed: `7c9ac5a35`. No existing entry used a POSIX class (`grep -l '\[\[:' docs/knowledge/*.md`, empty) |

## Decisions

| Decision | Rows |
| --- | --- |
| dantotsu | 3 |
| knowledge | 2 |
| merge into | 3 |
| fixed | 1 |
| no-op | 12 |

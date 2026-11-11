# Friction inventory, PR #290

`feat: one wide event per request in every API, pragma first`, squashed onto
`main` as
[`2d59df1`](https://github.com/hugoleborso/borso.fr/commit/2d59df1c1e61dc992d0a17fef1d7f5236cd79f01)
on 2026-11-11. 26 commits, 402 files, one session.

Sources walked: `scripts/kaizen.sh sweep-input 2d59df1c1`, the line pasted into
the sweep prompt, the pull request's body and comments (five preview bots, no
review threads), its 26 commits, its 27 workflow runs, the open pull requests
(no other kaizen sweep open), the two validation reports, and read-only AWS
calls made by this sweep. Rows 23 and 25 to 30 are this sweep's own friction, archived beside this file.

Writers: `main` 1 line, `wide-events` 1, `wide-events-fix` 1,
`wide-events-rollout` 2, `technical-validator` 2, `adr-ids` 1, `adr-legacy` 3,
`one-line` 1, and four hook refusals. Each subagent had its label, so the
archive is not blind to them.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | post-merge | A preview stack lost its own Lambda log groups on every redeploy, so pragma-pr-290 had no logs after the second push | pasted line `[18:05] main`; #290 commit `5e37dfe` | `dantotsu: a-preview-stack-lost-its-logs-to-its-own-preflight` |
| 02 | post-merge | The log groups #290's restore step recreated did not get their CloudFormation tags back | sweep prompt; `list-tags-for-resource` on `/aws/lambda/pragma-pr-290-api` returned `{}` (measured) | `merge into` 01. The restore step is removed, because its only cause was the deletion #290 stopped |
| 03 | post-merge | 934 preview log groups are left in the account, 728 with no retention, including all four of pragma-pr-290 after its destroy | `describe-log-groups --log-group-name-prefix /aws/lambda/` filtered on `-pr-` (measured 2026-11-11) | `merge into` 01. Deleting the 934 is the operator's call |
| 04 | implementation | #290 fixed the preflight in three pushes, each checked with a fake `aws` written by hand and thrown away | commits `5e37dfe`, `bc5c83b`, `05ff1bd` | `merge into` 01, which commits that fake as a test |
| 05 | implementation | `pnpm --filter <app> run test:e2e -- <files>` ran the whole e2e suite | `[17:58] one-line` | `dantotsu: the-trigger-that-could-not-match-test-e2e` |
| 06 | implementation | last-loop-lepin `pnpm dev` died at start on `$6` under `set -u`, and seeded the test database | `[14:08] wide-events-rollout`; #290 commit `fc3d094` | `dantotsu: the-dev-seed-that-lived-in-a-bash-string` |
| 07 | implementation | A constant in `wide-event.core.ts` survived Stryker though the core test asserted it | `[13:36] wide-events` | `knowledge: how-a-mutation-survivor-hides`, extended in `84525e4` |
| 08 | implementation | `vi.resetModules` in the adapter test credited the core's constants to it, so they survived | `[14:01] wide-events-rollout` | `merge into` 07. `stryker.shared.js` sets `ignoreStatic: true`, so 07 and 08 are one mechanism |
| 09 | implementation | `scripts/mutate-changed.sh` mutates other agents' unfinished files and cannot be scoped to one app | `[13:56] wide-events-fix` | `fixed: 275ecf3`, paths after the base |
| 10 | validation | The validator was handed an ADR as its spec with no procedure for one | `[13:47] technical-validator`; PR body *Gap: no plan* | `fixed: 275ecf3` |
| 11 | validation | Round 2's fix commits also rolled the change out to three apps, so its scope was a round 1's | `[14:18] technical-validator`; commits `f120ee4`, `aa571e4`, `0a8db0a` | `fixed: 275ecf3`, round 2 walks files round 1 never read |
| 12 | validation | Removing `.use('*', recordWideEvents)` passed every test in three apps | commits `df048ce`, `6eccce9`, `967a3e3` | `no-op:` round 2 caught it and #290 pinned each mount, which is the gate working |
| 13 | implementation | Two ADR gates passed every renamed record vacuously, and no test exercises the shell gates | `[17:20] adr-ids`; `docs/knowledge/the-shell-gates-are-only-ever-run-where-they-pass.md` | `fixed: d790f77`. Three of six tests fail on the pre-#290 gates |
| 14 | implementation | A guard refused any heredoc whose text held the word git | `[17:49] adr-legacy` | `fixed: a5bbdee`. `strip-heredocs.py` kept a body whose operator line went on (`<<'EOF' > file`), so hooks read it as commands. Inferred cause: the refusal text was not logged |
| 15 | implementation | A cdk stack test in a fresh worktree failed to resolve `@borso/infra` | `[17:55] adr-legacy`; recurs `the-worktree-that-could-not-see-its-own-infra` | `fixed: 17594ad`. The cdk global setup runs `ensure-infra-built.sh` |
| 16 | implementation | Number-based rewrites of ADR citations mislabel records written before a renumber | `[17:55] adr-legacy` | `no-op:` the four-digit ids are gone, and `check-adr-numbers-resolve.sh` refuses a record named by one, so no number rewrite can recur |
| 17 | implementation | `no-broad-kill` refused `pkill` twice | `[13:38]`, `[14:05] hook:no-broad-kill` | `no-op:` the hook held, and its message gives the PID-based form |
| 18 | implementation | `no-swallowed-push` refused a push with its errors sent to `/dev/null` | `[14:21] hook:no-swallowed-push` | `no-op:` the hook held |
| 19 | implementation | `no-discarding-reset` refused a command that would discard work | `[17:45] hook:no-discarding-reset` | `no-op:` the hook held |
| 20 | implementation | The detached wide-event line was built, then replaced by one line per request | commits `3d6e95c`, `58fb9b4`, `a9b8b3f`, `f5c544a`, `a2a2e96` | `no-op:` a product call the operator made and the ADR records |
| 21 | conception | A four-app change ran with no spec and no plan, the ADR standing in | PR body *Gap: no plan* | `merge into` 10 |
| 22 | deploy | Two `ci` runs were cancelled | runs `43073299450`, `43075302068` | `no-op:` a newer push superseded each; no run went red |
| 23 | post-merge | `sweep-input` handed this sweep 9 lines from three earlier archives as new | `scripts/kaizen.sh sweep-input 2d59df1c1` before `8d2fe76` | `fixed: 8d2fe76`. The ADR rename rewrote them; a rewritten line keeps its stamp |
| 24 | post-merge | ADR-2026-11-11T1318 was still `proposed` | `docs/adr/2026-11-11T1318-*.md` line 3 | `fixed: b14cef8`, stamped `accepted` |
| 25 | post-merge | A pre-commit refusal left paths staged, and the next commit carried them | this sweep, `main` | `fixed: e900c84`, the refusal now says so and names `git commit -- <paths>` |
| 26 | post-merge | The front-matter gate checked the paths of a drafted, unstaged dantotsu and refused unrelated commits | this sweep, `main` | `fixed: 110e56c` |
| 27 | post-merge | A heredoc commit message followed by a pipe tripped the new double-dash hook | this sweep, `main` | `merge into` 14 |
| 28 | post-merge | `git mv` of a script referenced by four dated dantotsus would have rewritten them | this sweep | `no-op:` the rename was reverted, and the name stays |
| 29 | post-merge | `no-prettier` refused this sweep's Prettier call | archive `[18:59] hook:no-prettier` | `no-op:` the hook held and named oxfmt |
| 30 | post-merge | `no-discarding-reset` refused this sweep's `git checkout --` while it undid a rename | archive `[19:02] hook:no-discarding-reset` | `no-op:` the hook held; the rename was undone by renaming back |

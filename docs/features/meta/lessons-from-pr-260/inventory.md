# Friction inventory for PR #260

[PR #260](https://github.com/hugoleborso/borso.fr/pull/260) (`d7fb6df8`)
swept PR #249 and shipped `no-hidden-role-query`, the `screens-shown` Stop
hook, the `merge-strands-no-work` hook, `no-swallowed-push` on `/dev/null` and
long links in `check-pr-body.ts`. The operator asked for this sweep in the same
session that shipped the PR, so the source is this session's own record: the
archived log `docs/features/meta/lessons-from-pr-249/kaizen.md` (2 lines), the
6 commits, the CI runs and the conversation. The PR had no review thread.

Writers in the log: `hook:no-swallowed-push` 1, `main` 1. One session, no
subagent wrote code, so a missing label is not a risk here.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | `TMPDIR` was empty, so eleven `$TMPDIR/…` redirects wrote to the filesystem root | `ls -la /` this session; `echo "TMPDIR=[$TMPDIR]"` printed `TMPDIR=[]` | dantotsu: `an-empty-tmpdir-wrote-to-the-root` |
| 02 | implementation | The safety check refused removing those files, so they stay in the container | the `rm` refusal on `/body.md` | merge into 01 |
| 03 | post-merge | The new `screens-shown` Stop hook blocked the sweep's reply, which quoted the old report | Stop hook feedback; `lessons-from-pr-249` row 34 | no-op: fixed inside PR #260 by commit `f689570c` |
| 04 | implementation | `no-swallowed-push` refused the sweep's own commit sent to `/dev/null` | archive line `hook:no-swallowed-push` | no-op: the new guard working on its author |
| 05 | implementation | `doc-links` refused a commit whose standard linked a dantotsu not yet written | pre-commit output | no-op: the gate held the link to an existing file |
| 06 | implementation | `dantotsu-front-matter` read untracked entries whose hooks were not staged, so the commit had to carry all three | pre-commit output | no-op: reading the tree is what shows a missing path; one commit was right |
| 07 | implementation | `harness-links` refused new hooks missing from `.claude/settings.json`, and `link-into.sh --hooks` with no arguments printed only its usage | pre-commit output; the usage line | no-op: the refusal named the script and the usage named the arguments |
| 08 | implementation | `oxfmt` refused the new rule's test file | pre-commit output | no-op: formatter gate |
| 09 | implementation | `mutate-changed.sh HEAD` on uncommitted work printed "every changed gated file passed mutation, or none changed" while nothing ran | the script's output this session | fixed: it now says when nothing ran and that it reads commits only |
| 10 | implementation | Mutation found an unreachable default in `readLongLinkTargets` | Stryker `NoCoverage` at `pr-body.core.ts:255` | no-op: the gate caught it before the push |
| 11 | implementation | `vitest --coverage` with a text reporter printed no table | this session's output | no-op: the mutation run gave the per-file figure |
| 12 | implementation | `list_events` returned 69,200 characters and spilled to a file | tool output | no-op: `reading-another-sessions-transcript-with-list-events` covers it, and its hook fired |
| 13 | pr-description | The PR body's counts went stale after the hook fix added a row | the body before the update | no-op: updated by hand and rechecked |
| 14 | post-merge | The operator merged before `ci` reported on the final commit | run `41751064656` in progress at merge | no-op: `ci` on `main` passed (run `41751624375`), and PR #258's merge hook names a moved main |
| 15 | pr-description | Row 34 of the PR #249 inventory sat above row 33 | the inventory file | fixed: reordered |
| 16 | post-merge | The operator asked to run this sweep in the shipping session, not a new one | operator message "run it here" | no-op: the operator's call overrides the rule |
| 17 | post-merge | The ScoreInput save behaviour has gone unanswered across two sessions | PR #249 transcript 18:20 to 00:15; this session's replies | no-op: a product decision, asked again in the reply |
| 18 | pr-description | The skill names the branch `claude/lessons-from-pr-<N>`, while this session must push to its assigned branch | the skill and the session's branch rule | no-op: the session's rule wins, and the title carries the number |

## Counts

18 rows: 1 dantotsu, 0 knowledge, 2 fixed, 1 merged into another row, 14
no-op.

# Friction inventory of PR #346

PR #346 was the kaizen sweep of PR #334. Squash-merged as `1e2a1d524` on
2026-11-15 at 06:10 UTC. The operator asked for this sweep to run in the
session that shipped it, so every row below cites a source, not memory.

Sources: `scripts/kaizen.sh sweep-input 1e2a1d524` (1 line, writer `main`),
the session's two post-archive facts, 6 commits, two CI runs (heads `cd692ff`
and `d22d46d`, both green), no review thread, no comment.

| # | When | Friction | Sources / evidence | Decision |
| --- | --- | --- | --- | --- |
| 01 | implementation | `check-knowledge-triggers` passed a `[[:space:]]` trigger with only a `FutureWarning` | archive 23:33, writer `main` | no-op: fixed in #346. `scripts/knowledge-triggers.py` now refuses it with "does not compile cleanly" |
| 02 | post-merge | `main` moved by #343 after CI passed, so the merge waited for a second CI run | `git log c373c02a5..origin/main`; CI on `d22d46d` green at 06:10 | no-op: the branch merged `main` before the merge, as the pre-push reminder says, and #343 touched only `apps/pragma` |
| 03 | post-merge | A push piped into `grep` exited 1 after it had landed, and the hook's hint said the status was git's | `bash -c 'set -o pipefail; echo "Everything up-to-date" \| grep -E "ERROR\|rejected"'` prints `exit=1` (measured); `git ls-remote` showed `d22d46d` on the remote | fixed: this pull request. The hint now says a later stage can exit non-zero on its own and points at `git ls-remote` |
| 04 | implementation | Pre-commit refused two commits on `borso/no-comments` in new TypeScript files | pre-commit output | no-op: the rule refused before the commit and named its standard |
| 05 | implementation | A refused commit left its paths staged, so the next commit carried them and failed too | pre-commit output: "Everything you staged is still staged" | no-op: the hook says so on every refusal, and `git restore --staged` cleared it |
| 06 | post-merge | The sweep ran in the session that shipped the work | operator's answer, 2026-11-15: "Start here" | no-op: the operator's call. This inventory reads sources, not memory |
| 07 | ci | CI on the pull request | 13 check runs on each head, none red | no-op: nothing failed |
| 08 | post-merge | Review threads | `get_review_comments` empty | no-op: nothing to address |
| 09 | post-merge | The merge added no ADR | `git diff --name-only 1e2a1d524^ 1e2a1d524 -- docs/adr/` is empty | no-op: nothing to stamp |

## Decisions

| Decision | Rows |
| --- | --- |
| fixed | 1 |
| no-op | 8 |

# `git push` answers Internal Server Error while fetch works

Seen on 2026-10-10, PR #151, from a hosted session: `git push -u origin
<branch>` failed six times in about three minutes with

```
! [remote rejected] <branch> -> <branch> (Internal Server Error)
```

while `git fetch` on the same remote kept working. The commit itself was fine:
the same files pushed through `mcp__github__push_files` landed on the first
try.

## What to do

1. Retry with backoff, as the session instructions say (2 s, 4 s, 8 s, 16 s).
2. If it still fails and fetch works, push through the GitHub MCP server:
   `mcp__github__push_files` with the branch and every changed file. It makes
   one new commit on the remote, with its own SHA and message.
3. Bring the local branch back in line with what the remote now holds, keeping
   the working tree: `git fetch origin <branch>` then
   `git reset --keep origin/<branch>`, and check `git diff origin/<branch>` is
   empty. `--keep` refuses to discard uncommitted work, which is what the
   `no-discarding-reset` hook asks for.

## What it costs

- `push_files` sends file contents, not commits: local commit messages and
  authorship are replaced by the one message you pass. Squash merges hide
  that; a merge commit would not.
- It does not run the `pre-push` hook. Run the gates the hook would have run
  before pushing this way.
- Its `content` field is a string, so it is meant for text files. A commit
  carrying binaries, such as the task-speed videos, needs the git push.

See also [`github-is-reachable-only-through-the-mcp-server.md`](./github-is-reachable-only-through-the-mcp-server.md).

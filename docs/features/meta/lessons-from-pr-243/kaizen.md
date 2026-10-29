# KAIZEN — friction log of the sweep of PR #243

Copied by hand from the main folder's `KAIZEN.md`, which another session re-initialised under its own id while this sweep ran in a worktree.

- [2026-10-29 18:27] `hook:no-discarding-reset` ran a git command that would discard uncommitted work
- [2026-10-29 18:30] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status

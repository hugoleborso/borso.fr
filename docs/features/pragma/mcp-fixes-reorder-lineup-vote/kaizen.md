# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [03:14] `main` scripts/local-postgres.sh hard-codes /usr/lib/postgresql/16, so pragma back-e2e cannot run on a local macOS session that has Homebrew postgres
- [03:31] `main` pretool-gh-pr-create.sh resolves REPO_ROOT to the main checkout from a worktree session, so it reads the main checkout's KAIZEN.md and branch and refuses a PR whose worktree branch already commits the archive

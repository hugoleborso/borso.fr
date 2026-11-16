# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-kaizen` sweeps the archived
copy in a new conversation after the merge, classifies each line, and designs
the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored. Before the pull request opens, run
`scripts/kaizen.sh archive <docs-slug>/<feature>` and commit the copy.

Session: b0e9dbea-1ef9-476f-b9c4-8fb352ca4aab

- [2026-11-16 11:11] `main` Default shell node was v26, so 75 site tests failed on an undefined localStorage until fnm use 24; nothing warns that node differs from .nvmrc.
- [2026-11-16 11:11] `main` oxfmt run on a folder reformatted an unrelated file (assistant-grants.queries.ts) the main branch leaves unformatted.
- [2026-11-16 11:15] `hook:open-pr` refused gh pr create: --body-file names a shell variable, $D/body.md, which this hook reads before the shell expands it; pass the literal path
- [2026-11-16 11:16] `hook:open-pr` refused gh pr create: --body-file points at a missing path: /private/tmp/claude-501/-Users-hugoborsoni-Code-borso-fr--claude-worktrees-clever-kilby-880370/b0e9dbea-1ef9-476f-b9c4-8fb352ca4aab/scratchpad/body.md. This hook reads it before the command runs, so write it in an earlier call
- [2026-11-16 11:16] `hook:open-pr` opened a pull request leaving the friction log where the sweep cannot read it
- [2026-11-16 11:16] `hook:visual-validation` opened a pull request changing a front end without a visual-validation report
- [2026-11-16 11:26] `visual-validator` A PDF chart cannot be created through pragma's UI under pnpm dev because uploads need a bucket, so fixtures for chart assertions had to be posted to the songs API with a fake s3Key.
- [2026-11-16 11:27] `main` scripts/local-postgres.sh needs Linux /usr/lib/postgresql/16, so pnpm dev cannot start on the operator's Mac; a postgres:16 container had to be wired by hand.
- [2026-11-16 11:27] `main` pretool-gh-pr-create.sh reads the main checkout's branch from a worktree session, so gh pr create needs an explicit --head.

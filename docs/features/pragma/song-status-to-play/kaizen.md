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

Session: 517af8e0-2245-5699-b862-88d29fb8ce90

- [2026-11-14 20:32] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-14 20:34] `hook:api-validation` opened a pull request changing an API without a technical-validation report
- [2026-11-14 20:38] `main` pretool-merge-deploys-prod.sh was declared by a relative path, so every Bash call made outside the repo root exited 127 and ran unchecked
- [2026-11-14 20:52] `technical-validator` origin/main and the branch HEAD both moved during the review, so a --changed base taken from 'git rev-parse origin/main' after the start pointed at a different commit than the diff base and ran tests for #333's changes
- [2026-11-14 20:52] `technical-validator` the plan's gates listed test:core only, so a back-e2e-assistants test hard-coding the zod enum error text for song status failed only at validation
- [2026-11-14 20:55] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-14 21:16] `technical-validator-2` test:e2e prints only totals and takes no --reporter=verbose through the documented command, so confirming one fixed back-e2e test ran meant re-running that file by hand with DATABASE_URL set from local-postgres.sh
- [2026-11-14 21:16] `technical-validator-2` mutate-changed.sh mutated domain/song-status.core.ts but the Stryker report gives it no row, so a reader cannot tell zero mutants from a skipped file

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

Session: fcbefb56-f31c-52ee-8474-445661c33146

- [2026-11-11 23:31] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-11 23:37] `main` The sweep prompt listed two false spec premises and a five-of-six validation count as friction of PR #292, and their evidence is in the unmerged PR #300's archives, found only by grepping its branch.
- [2026-11-11 23:37] `main` A dev seed fixture written as TypeScript was refused by no-french-identifiers because the memory wire format has French keys, so the dated rows had to move to a JSON file.

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

Session: 0d1ab1fd-5f52-5589-9080-8d0215ff276c

- [2026-11-13 23:38] `hook:api-validation` opened a pull request changing an API without a technical-validation report
- [2026-11-13 23:48] `technical-validator` The song-added-push spec has neither the full sections (Q.O.D., Use cases, Changes, Test strategy) nor the short-form ones (Behaviour, Data shape), so neither category A/D procedure in the validator brief applied as written and rows were built from its table and Decisions bullets.
- [2026-11-13 23:48] `technical-validator` The changed-only core run with --coverage reported 100% while scripts/mutate-changed.sh found a surviving mutant in notifications.core.ts, so the coverage gate alone would have passed a CI-failing branch.
- [2026-11-13 23:52] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt

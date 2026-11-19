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

Session: 6064bf61-7727-5eb2-af38-4dfb7c945360

- [2026-11-19 08:45] `technical-validator` mutate-changed.sh apps/pragma picked up another agent's untracked scene-swipe.core.ts from the shared working tree and failed on its survivor, so the run's exit code did not grade this branch alone
- [2026-11-19 09:01] `technical-validator-r2` scripts/mutate-changed.sh prints dozens of failing-test lines marked covered 0 for files outside the changed set, burying the per-file mutation table at the end of a passing run.

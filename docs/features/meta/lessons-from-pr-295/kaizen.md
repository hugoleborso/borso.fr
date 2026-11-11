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

Session: c72ce888-8956-58c0-8980-36e03d8aabc2

- [2026-11-11 23:15] `hook:commitlint` commitlint refused a commit message: fix(meta): oxlint runs its type-aware rules with no flag
- [2026-11-11 23:16] `main` a commit trailer retyped by hand carried the wrong session id; commitlint refused it
- [2026-11-11 23:22] `hook:api-validation` opened a pull request changing an API without a technical-validation report
- [2026-11-11 23:27] `technical-validator` A kaizen-sweep branch was handed to technical validation with its parent feature's spec as the contract, and the validator procedure names no source for category A on such a branch, so rows were built from the sweep's inventory.md decisions instead.
- [2026-11-11 23:27] `technical-validator` The plan-absent row forces PASS_EXCEPT_UNVERIFIABLE on a kaizen-sweep branch that by design has no plan, the same A00 the inventory (row 16) already ruled a no-op for PR #295.

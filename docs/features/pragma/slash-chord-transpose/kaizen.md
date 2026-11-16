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

Session: d5e43e69-fd62-58b3-8c93-8aee01b19b8f

- [2026-11-16 11:47] `hook:visual-validation` opened a pull request changing a front end without a visual-validation report
- [2026-11-16 11:52] `visual-validator` CDP click @ref on pragma's song-edit tab and Paste text button did nothing, so each needed an element.click() eval fallback.
- [2026-11-16 11:52] `visual-validator` Two synchronous element.click() calls on pragma's Transpose down in one eval moved the stepper by one, not two, which reads like a transposition bug until the stepper value is checked.
- [2026-11-16 11:53] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share

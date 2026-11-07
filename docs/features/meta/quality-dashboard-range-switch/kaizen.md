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

Session: d4b94070-98b8-5170-ae92-3efe97db76a9

- [2026-11-06 12:06] `main` The 3S board's sections, scores and tooltips had to be rebuilt by hand because no gate said the page carried prose a tooltip could hold.
- [2026-11-06 18:38] `main` An inline script published in an artifact does not run, so a page that needs interaction has to be built without JavaScript, and nothing warned before the operator found it broken.
- [2026-11-06 19:49] `main` Three layout rounds were spent on the board because nothing renders it in a browser before the operator sees it, so overflow and a lost toggle state only showed up in their screenshots.

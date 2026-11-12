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
- [2026-11-12 00:38] `main` the screens-shown stop hook blocked the turn a second time for a bare 'before and after' about probe text; auto mode refused editing the hook as self-modification
- [2026-11-12 01:14] `main` the screens-shown stop hook blocked a third turn, this time for the words 'before and after' inside a quoted kaizen prompt, since blockquotes are not skipped like quotes
- [2026-11-12 01:46] `technical-validator` The bundled Sentry probe's envelopes are span-streaming v2 items (attributes['sentry.op'].value), not transaction events with spans[], so a parser written for the classic shape printed nothing and had to be rewritten.

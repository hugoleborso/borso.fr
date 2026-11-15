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

Session: c673477b-ef54-5c10-b805-cbeb0b6a4665

- [2026-11-15 06:29] `main` the vocabulary gate's per-file greps made it nine times slower once the rules split across 77 files; one awk pass fixed it
- [2026-11-15 06:29] `main` /adr has no non-interactive mode for a main session that already weighed the options, so the ADR was written from the template by hand
- [2026-11-15 06:30] `main` moving markdown to a deeper folder broke a relative link that only the doc-links gate at commit time caught

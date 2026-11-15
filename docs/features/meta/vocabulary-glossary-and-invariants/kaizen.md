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
- [2026-11-15 06:32] `hook:api-validation` opened a pull request changing an API without a technical-validation report
- [2026-11-15 06:33] `hook:subagent-no-staging` a subagent ran a git command that writes the shared index
- [2026-11-15 06:38] `technical-validator` the subagent-no-staging hook refused git add inside a throwaway scratch repository, so exercising a gate that reads git ls-files in an exported tree needed the untracked-files path instead
- [2026-11-15 06:38] `technical-validator` check-vocabulary-paths.sh has no test file, so validating its refusals meant hand-mutating an exported tree, eleven cases one at a time
- [2026-11-15 06:41] `main` awk -v turned the comment-citation pattern's \b into a backspace, so moving a grep into awk silently dropped half a gate
- [2026-11-15 06:44] `technical-validator-r2` pnpm exec vitest run <one script test> --coverage at the root fails on every gated scripts/*.core.ts the test does not import, so only the --changed form measures a branch's coverage

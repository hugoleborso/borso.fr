# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [18:33] `main` argent's gesture-custom, the tool whose own help documents the long-press example, refuses on Chromium with 'no chromium support declared'; the long press has to be gesture-drag with equal from and to and a durationMs
- [18:33] `main` the sandbox Chromium rejects the agent proxy's CA for every external https, so any remote image renders as its fallback tile and reads exactly like a broken product feature
- [18:33] `main` the dev API and the back-e2e suite share one local Postgres, so a POST to /api/__test/seed while the suite runs deletes its rows and the failure surfaces in an unrelated test file
- [18:33] `main` coverage passed a guard that could not change an outcome (undefined > 0 is already false) and only the mutation gate named it
- [18:33] `main` eslint-rules/test-file-has-sibling-source.test.js resolves its fixtures against the real tree, so renaming a source file fails a lint-rule test nowhere near the change, and only at push time
- [20:41] `standards-reviewer` the standards reviewer is told to keep files under apps/ ending .ts or .tsx, but seal.ts verify also puts VOCABULARY.md in scope, so the skill's own predicate and the tool disagree
- [20:53] `main` pnpm dev applies no migrations — only the back-e2e setup does — so a new migration leaves local dev answering 500 with errorMissingColumn until that suite happens to run

# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [13:34] `main` a catalog-only bump in pnpm-workspace.yaml skips app-tests in ci.yml: .github/path-filters.yml keys on apps/** so react 19.0->19.2 and jsdom 25->30 merged green without any app suite running
- [13:34] `main` dependabot opened two live PRs for the same jsdom bump (#56 and #65) and two for the same react bump (#43 and #66); the older pair was never auto-closed and #57 predates the catalog migration so it would conflict on package.json files that no longer carry versions

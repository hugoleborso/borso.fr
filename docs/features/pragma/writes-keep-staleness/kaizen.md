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

Session: 6b900a33-1bbb-5013-847b-25932defad9f

- [2026-11-14 09:42] `main` The brief asked to copy cache-write.queries.ts byte-for-byte from #327, but it imports selectQueryRootsDerivedFrom which main lacks, so the copy cannot be byte-identical and the two PRs will meet as an add/add conflict.
- [2026-11-14 09:45] `main` SessionStart's global agent-browser install fails because npm now blocks its postinstall script, and the pinned copy in node_modules/.bin only launches with AGENT_BROWSER_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome.
- [2026-11-14 09:52] `technical-validator-2` Checking that a test kills a hand-made mutant without touching the shared working tree meant resolving @tanstack/query-core through pnpm's realpath by hand, since apps/pragma/node_modules/@tanstack holds no query-core link.
- [2026-11-14 09:57] `visual-validator` The spec's two-browser acceptance names no page for Hugo, and on the setlist editor and the Add a setlist dialog the setlists list is observed and refetches live, so the scenario passes there without exercising the fix.
- [2026-11-14 09:58] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share

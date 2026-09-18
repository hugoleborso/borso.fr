# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [08:38] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [08:56] `main` sw.js is eslint-ignored via apps/*/site/public/** and has no test runner, so the file that mediates every request for every user is the only unchecked source in the tree
- [08:56] `main` sw.js and sw/sw-cache.utils.ts hold two hand-copied versions of the same predicates (isReadableApiPath, now isHtmlContentType) and no gate makes them agree
- [08:56] `main` the prod static site shipped with no Cache-Control on any object, so browsers applied heuristic freshness to index.html; nothing in the repo asserts a response header
- [08:56] `main` a filtered 'vitest run --project core --coverage <path>' fails with 0% on every unrelated gated file, which reads as a broken suite rather than as a filtered run

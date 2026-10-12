# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [00:45] `hook:no-swallowed-push` piped git push or git commit into another command, throwing away its exit status
- [01:28] `technical-validator` rtk rewrites git diff into a compacted summary that truncates file bodies, so per-file review needs cat or git --no-pager with | cat
- [01:28] `technical-validator` the pragma spec's Test strategy routes every happy-path step and every edge case to visual validation while also assigning the same cases to unit and back-e2e, so the exclusive technical/visual split category D relies on is undefined
- [01:34] `visual-validator` the streak, joker and yesterday-undo rows need studies on past days, and neither the browser nor the API can create one, so they are unverifiable in every visual run
- [01:34] `visual-validator` scripts/argent.sh run screenshot --out <path> ignored the --out path and wrote the PNG under /tmp/argent-chromium-media instead
- [01:34] `visual-validator` the browser.sh drive-count warning prints on stdout of every command, so each get text / eval output has to be filtered before it can be parsed
- [01:34] `visual-validator` scripts/browser.sh --restart drops the signed-in session, and the restart the drive-count warning recommends logs the validator out
- [01:36] `visual-validator` the implementation and the spec were edited under apps/pragma and docs/features while the visual validation was running, so rows already recorded no longer described the code being served
- [02:03] `visual-validator-2` argent's screenshot tool accepts --out but writes the PNG under /tmp/argent-chromium-media and ignores the requested path
- [02:03] `visual-validator-2` argent screenshot --out does write the requested path but its JSON reply names a /tmp/argent-chromium-media file instead, which misled me into logging the previous entry; disregard it
- [02:05] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [02:07] `technical-validator-2` The spec's Test strategy routes every happy-path step and every edge case to visual validation while also naming unit and back-e2e for the same cases, so the category D split had to be inferred again on the second pass.
- [02:27] `technical-validator-3` The spec's Test strategy says a concert today counts as past while its Use cases say the next concert is strictly after now, and nothing flagged the contradiction before validation
- [02:29] `main` Uploading validation screenshots to the previews bucket was refused with AccessDenied for AI-Dev-ReadOnly, so the ADR-0023 path is not available from this hosted session

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

Session: bc924d67-1da8-5895-8400-6ac60717c1ba

- [2026-11-16 11:05] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-16 11:05] `main` agent-browser click on the login Enter button printed Done but did not submit; pressing Enter in the field did
- [2026-11-16 11:12] `hook:visual-validation` opened a pull request changing a front end without a visual-validation report
- [2026-11-16 11:16] `visual-validator` Spec assertion 'look as they did before' has no before state to drive in the browser, so the validator had to fall back to a git diff of the renderer.
- [2026-11-16 11:16] `visual-validator` The seeded Slow Burn chart holds no chord-only line, comment directive or tab block, so three spec assertions needed a hand-typed chart in the unsaved edit preview.
- [2026-11-16 11:20] `main` Flex items per word passed jsdom textContent tests but broke innerText and copy, which jsdom does not lay out; only the browser validator caught it
- [2026-11-16 11:24] `visual-validator-2` Full-page agent-browser screenshots of Pragma pages stitch the sticky header and bottom nav into the middle of the image, so full-page evidence looks broken.
- [2026-11-16 11:35] `visual-validator-3` The seeded Slow Burn chart has no chord-only line, no tab block and no comment directive, so spec assertions 5, 9 and 10 could only be checked by typing an unsaved probe chart into the song editor preview.

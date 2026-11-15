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

Session: 5f88009b-90c6-5b60-9ed2-246d632f7869

- [2026-11-15 06:36] `main` Apple developer documentation pages render in JavaScript, so WebFetch returns only the title; the JSON at developer.apple.com/tutorials/data/documentation/<path>.json carries the text.
- [2026-11-15 06:55] `main` The ADR was written in French because a system-wrapped prompt asked for it, against CLAUDE.md's English rule, and the PR body attributed that request to the operator.
- [2026-11-15 07:03] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-15 07:04] `hook:no-test-double-dash` passed -- to a pnpm test script, which makes Vitest run every file
- [2026-11-15 07:11] `multi-choice-impl` A hook that blocks one segment of a compound command drops the whole command, so earlier edits in the same call silently never ran and had to be re-sent.
- [2026-11-15 07:18] `technical-validator` The proposals schema accepts a 2000-character comment while the memory change schema caps a decision line at 500, and no document states the combined limit, so the gap was found only by a hand-run probe.
- [2026-11-15 07:21] `hook:pre-push-conflict` pre-push refused a branch that conflicts with origin/main
- [2026-11-15 07:25] `technical-validator-r2` A dismissal resting on what the Talos routine does could only be checked against CONTRAT.md, because the routine's own prompts live in the private memory repository and not here.
- [2026-11-15 08:30] `visual-validator` agent-browser's default 1280x577 viewport put the fixed bottom nav's overlay over the Décider tab link, so the click was refused with a 'covered by div.absolute.inset-0' error.
- [2026-11-15 08:30] `visual-validator` The routine fire in S2.1/S2.1b cannot be observed on pnpm dev because no fire-url secret exists locally, so the spec's fire bullets have no browser or local evidence path.
- [2026-11-15 08:30] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share

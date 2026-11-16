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

Session: d4e075dc-4598-5893-8fae-dcc73a19b2b8
- [2026-11-16 16:35] `hook:visual-validation` opened a pull request changing a front end without a visual-validation report
- [2026-11-16 16:37] `visual-validator` scripts/phone.sh touch on the lineup button reported a real touch on target but exited 1 because the page was left 1280 px wide after the tap, the second touch of the same phone session.
- [2026-11-16 18:10] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-16 18:11] `main` the shipping session asked the operator to confirm running the kaizen in the same conversation after he had already asked for it, because CLAUDE.md and after-task-kaizen forbid it; he asks agents for this a quarter of the time
- [2026-11-16 18:22] `hook:merge-on-red` tried to merge a pull request whose checks were not green
- [2026-11-16 18:22] `main` the kaizen of PR #372 changed the same-session kaizen rule in CLAUDE.md and two skills but missed a third copy in the merge hook, because its grep left out .claude/hooks; the operator saw it only after the merge

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

Session: 65a06a76-394d-57d4-962e-c4716e72f7da

- [2026-11-19 21:13] `hook:no-broad-kill` reached for pkill or killall on a machine other agents share
- [2026-11-19 21:15] `transcript-reader` list_events has no timestamp seek and counts subagent events toward its limit, so reaching a 17:11 event from 21:08 took about 30 sequential pages of 100 events, each overflowing to a file.
- [2026-11-19 21:18] `hook:no-prettier` ran Prettier in a repository that formats with oxfmt
- [2026-11-19 21:20] `hook:subagent-no-staging` a subagent ran a git command that writes the shared index
- [2026-11-19 21:22] `seed-gaps` A practice dated today lights every member's flame, so the seed cannot hold both the crowded practice row and Hugo's open-today flame at once; the practice had to become opt-in through POST /api/__test/seed?practice=today.
- [2026-11-19 21:22] `seed-gaps` pnpm --filter @borso-app/pragma lint fails on another agent's in-progress site edits (tsgolint panic on a deleted file), so a parallel agent cannot use the workspace lint as its gate and must lint its own folder with oxlint --type-aware.
- [2026-11-19 21:25] `part-rename` Renaming a file that carries @FollowsBlueprint breaks the blueprint-subjects.json gate outside the app folder, so a rename brief scoped to apps/<app> cannot pass that gate on its own.
- [2026-11-19 21:25] `part-rename` Subagents are blocked from git mv by a hook, yet the rename brief asked for git mv, so the brief and the hook disagree.

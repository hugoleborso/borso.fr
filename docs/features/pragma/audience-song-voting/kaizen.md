# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [20:40] `implement-02` a fresh worktree has no node_modules and scripts/reports.sh blueprints exits 0 while printing 'Command tsx not found', so the index silently never gets written
- [20:59] `implement-02` pre-commit fails on a stale blueprint index that is gitignored, so every commit adding a blueprint costs one rejected commit plus a manual regenerate before it can land
- [21:38] `implement-03` scripts/reports.sh exited silently with status 0 after printing one generator line, because pnpm exec tsx was missing in a fresh worktree and the failure was swallowed
- [22:03] `implement-03` two VotePage cases flaked one run in five because the test helper flushed microtasks only and gave up silently, so the failure named an empty array instead of the wait
- [22:03] `implement-03` git stash push -u followed by pop turned a staged git mv into an untracked add plus an unstaged delete, and the convention-drift check then died on ENOENT for the old path
- [22:03] `implement-03` a locale-formatted time test passes against a UTC-slicing implementation on a UTC runner, so the assertion needs the zone pinned or it proves nothing
- [22:07] `implement-03` kaizen.sh archive overwrote the earlier agent's archived entries instead of appending, so a second archive on the same feature loses the first round's friction log

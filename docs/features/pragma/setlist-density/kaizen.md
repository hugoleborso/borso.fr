# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [23:49] `implementation-01` every git command via rtk is refused by the worktree-isolation guard; only an absolute /usr/bin/git path gets through
- [23:51] `implementation-01` the spec and plan both wrote the migration as ADD COLUMN NOT NULL DEFAULT, which Aurora DSQL rejects and every one of the thirteen existing migrations avoids
- [00:31] `implementation-01` prettier --write through rtk reformatted twelve files it was not asked about, in a style plain prettier --check accepts either way

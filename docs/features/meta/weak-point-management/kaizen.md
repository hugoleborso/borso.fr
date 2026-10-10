# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [14:01] `weak-point-build` a test file that renders its subject at describe level instead of inside each it hides every mutant in that subject: Stryker activates a mutant per test, so 66 survived until the call moved into the tests
- [14:01] `weak-point-build` the worktree guard refuses any heredoc or python -c whose text merely mentions git, so every scripted edit had to go through a file written with the Write tool
- [14:01] `weak-point-build` v8 counts every ?? '' after a capture group as a branch, so a regex-reading core cannot reach 100% branches without a helper that throws on the impossible case

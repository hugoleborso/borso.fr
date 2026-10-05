# KAIZEN — friction log for this task

Append one line per friction event, as it happens, with:

    scripts/kaizen.sh "what went wrong, in one sentence"
    scripts/kaizen.sh --from <your-agent-label> "..."   # from a subagent

The problem only, never the fix. `/after-task-dantotsus` sweeps this file when
the work merges, classifies each line, and designs the eradication. Subagents
should append here too, naming themselves, so the sweep can tell one agent
struggling from four agents hitting the same wall.

This file is gitignored and is deleted once the kaizen pull request is open.

- [10:43] `stryker-fix` Vitest 5 bump made every per-test-covered mutant run zero tests (stryker vitest-runner builds testNamePattern with ' ' while Vitest 5 joins the chain with ' > '); every covered mutant reported Survived
- [10:43] `stryker-fix` full-suite mutation cache key ignores the lockfile, so the incremental differ reused every pre-bump Killed verdict and the toolchain change was never re-measured
- [10:43] `stryker-fix` on macOS the Stryker sandbox under os.tmpdir() (/var/...) differs from Vitest's resolved /private/var/..., so vitest.related finds no test and every local run dies with 'No tests were executed'
- [10:43] `stryker-fix` git fetch over SSH fails in this environment (publickey); only the gh credential helper over HTTPS works, which the worktree recipe does not say
- [11:13] `stryker-fix` pre-commit check-numbered-sequences.sh used GNU find -printf, so every commit on macOS failed with 'find: -printf: unknown primary'
- [11:16] `stryker-fix` check-coupled-lists.sh piped tr into grep -q under pipefail, so it failed at random on macOS (SIGPIPE on tr); check-no-racy-pipelines only looks for directory walks and missed it

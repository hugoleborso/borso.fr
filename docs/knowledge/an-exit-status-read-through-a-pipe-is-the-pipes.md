---
summary: '`$?` after `cmd | tail` is tail''s status, not cmd''s, so a refusal that exits 3 reads as 0 and a fail-open looks identical to a pass.'
triggers:
  commands:
    - 'exit=\$\?'
    - '\| *(tail|head|grep) .*; *echo.*\$\?'
    - 'db-read\.sh'
    - 'smoke-agent-reader\.sh'
  output:
    - 'exit=0'
---

# An exit status read through a pipe is the pipe's

Verifying that a guard refuses, by running it and printing its status:

```bash
scripts/db-read.sh "SELECT 1 FROM member_credential" 2>&1 | tail -2
echo "exit=$?"     # prints 0
```

The guard did refuse. It exited 3. The `0` is `tail`'s status, because `$?`
after a pipeline is the **last** stage's. Without `pipefail`, which is off in
an interactive shell and in most tool invocations, nothing propagates the
earlier failure.

This was measured on 2026-10-29 while verifying the production read guard. All
four refusals reported `exit=0`, and the same four reported `3` when re-run
without the pipe. **A guard that fails open would have produced exactly the
same output**, which is what makes this worth an entry rather than a shrug: the
reading was not merely imprecise, it could not distinguish the thing being
verified from its opposite.

Three ways out, in order of preference:

```bash
# 1. Do not pipe. Redirect instead when you only want the status.
scripts/db-read.sh "…" >/dev/null 2>&1; echo "exit=$?"

# 2. Ask for the pipeline's first failure.
set -o pipefail
scripts/db-read.sh "…" | tail -2; echo "exit=$?"

# 3. Read the stage you mean.
scripts/db-read.sh "…" | tail -2; echo "exit=${PIPESTATUS[0]}"
```

`PIPESTATUS` is bash-only; zsh spells it `pipestatus` and indexes from 1.

The same shape has bitten this repository twice in code rather than at the
keyboard, both times because a pipeline's status was not the one the author
meant: the `no-swallowed-push` hook exists because `git push | tail` discards
the push's failure, and `check-pwa-assets` reported a missing icon because
`printf | grep -q` races under `pipefail`. The hook covers git; nothing covers
a verification you type once.

Last verified: 2026-10-29 — against `scripts/db-read.sh`, four refusals, exit 3
each without the pipe and 0 with it.

## See also

- [`docs/dantotsus/a-stale-ref-priced-a-one-line-push-at-fifty-minutes.md`](../dantotsus/a-stale-ref-priced-a-one-line-push-at-fifty-minutes.md)
- `plugins/borso-harness/hooks/pretool-no-swallowed-push.sh` — the git-shaped half, refused at the tool call.

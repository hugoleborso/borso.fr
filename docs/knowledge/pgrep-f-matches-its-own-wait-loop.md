---
summary: '`until ! pgrep -f "<pattern>"` never ends, because the loop''s own command line contains the pattern; wait on a PID or a file instead.'
triggers:
  commands:
    - 'pgrep -f'
---

# `pgrep -f` matches the loop that is waiting on it

On PR #118 a session waited for its own `git push` with:

```bash
until ! pgrep -f 'git push -u origin claude/shared-availability' >/dev/null; do sleep 5; done
```

The push finished, and the loop kept going until the background time limit
stopped it, twice. `pgrep -f` matches against each process's full command line,
and the shell running the loop has the pattern in its own command line. The
loop always finds itself, so it never sees the push end.

What works instead:

- **Wait on the PID.** Start the command with `run_in_background`, or keep
  `$!` from `cmd & pid=$!`, and wait on `kill -0 "$pid"`.
- **Wait on what the command writes.** Point the command's output at a file,
  and loop on `grep -q '<last line it prints>' <file>`.
- **When you must search by pattern**, keep the loop out of the match:
  `pgrep -f '[g]it push'`. The bracket matches `g` in the process you want and
  is not a literal `[g]` in your own command line.

Killing by pattern is refused here for the same reason, among others: see
[broad-pkill-killed-another-agents-measurement](../dantotsus/broad-pkill-killed-another-agents-measurement.md).

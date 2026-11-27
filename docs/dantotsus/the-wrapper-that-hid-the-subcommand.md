---
date: 2026-10-27
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#203'
fix-commits: [self, a4bd91e1a]
eradication-level: 1
eradication-paths: [scripts/kaizen.sh]
time-to-detect: one turn
tags: [harness, tooling, process, claude-md]
zone: scripts/kaizen.sh
recurs: [said-the-file-was-unreachable-without-looking]
---

# The wrapper that hid the subcommand

## User impact

After PR #203 merged, the post-merge message told the operator that
`CLAUDE.md` was stale:

> `CLAUDE.md` tells hosted sessions to run `scripts/kaizen.sh archive`, but that subcommand doesn't exist, so the log is lost when this container is reclaimed.

| | Seen | Expected |
| --- | --- | --- |
| The operator reads the post-merge message | "that subcommand doesn't exist" | The task's friction log archived, and no false claim about `CLAUDE.md` |

The subcommand existed. The task's friction log was never archived, because
the session believed there was nothing to run (measured by the post-merge
sweep of #203).

## Causal chain

- The post-merge message said `scripts/kaizen.sh archive` did not exist.
  - The session's only check, `grep -n "archive" -A12 scripts/kaizen.sh`,
    printed nothing, and it reported that empty result as the answer.
    - `scripts/kaizen.sh` was a five-line wrapper whose only command was:

      ```bash
      # The subcommands live in the plugin script this line forwards to.
      exec "$(dirname "$0")/../plugins/borso-harness/scripts/kaizen.sh" "$@"
      ```

      - When the logger moved into the harness plugin, the old path stayed
        for the hundred documents that name it. A shell `exec` kept it
        working. A symlink would have failed, because the plugin script found
        its siblings through `dirname "${BASH_SOURCE[0]}"`.
        - So the path every document named held no code. A read or a grep on
          it answered a question about a different file. **Machine.**

## Root cause of occurrence

*Thought the file at `scripts/kaizen.sh` was the logger, so an empty grep
proved a subcommand absent, actually it was a forwarding wrapper and the
logger lived in `plugins/borso-harness/scripts/kaizen.sh`.* **Machine.**

`grep -A12` prints only matching lines, so the wrapper's `exec` line never
reached the session's context. Nothing in the result said "this file is not
the code".

## Detection failure causes

- **Typing / linter:** not applicable to a shell wrapper.
- **Local validation:** the claim was never tested by running
  `scripts/kaizen.sh archive`, which would have worked. `CLAUDE.md`'s *Verify
  before asserting* asks for a command. A grep is a command, but it answered
  about the wrapper.
- **Review:** the message sounded verified, so the operator had no reason to
  doubt it.

## Countermeasure

The post-merge sweep (this entry) found `archive` in the plugin script and
corrected the claim to the operator.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit adding this file made `scripts/kaizen.sh` a
symlink to the plugin script. #266 (`a4bd91e1a`, 2026-11-05) then deleted
the plugin and moved the harness into the repository. What holds today is
that subtraction.

```diff
-#!/usr/bin/env bash
-exec "$(dirname "$0")/../plugins/borso-harness/scripts/kaizen.sh" "$@"
+(scripts/kaizen.sh is the logger itself, 15 KB)
```

With no plugin there is no wrapper. A read, a grep or a run of the path every
document names reaches the real code.

**Proof it can fail:** `grep -c archive scripts/kaizen.sh` finds the
subcommand today. On the wrapper, before the first fix, the same grep found nothing (measured by the session of #203).

**Similar instances:** the first fix found one more forwarding wrapper,
`scripts/check-hook-decisions.sh`. #266 deleted it with the plugin. Today
`grep -l 'exec "$(dirname' scripts/*.sh` finds none, and `find scripts -type l`
finds no symlink.

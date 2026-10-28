---
date: 2026-10-27
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#203'
fix-pr: none (opened by this kaizen sweep, number not known when written)
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/kaizen.sh, plugins/borso-harness/scripts/kaizen.sh]
time-to-detect: one turn
tags: [harness, tooling, process, claude-md]
zone: scripts/kaizen.sh
recurs: [said-the-file-was-unreachable-without-looking]
---

# The wrapper that hid the subcommand

## Symptom

After PR #203 merged, the post-merge message told the operator that `CLAUDE.md` was stale:

> `CLAUDE.md` tells hosted sessions to run `scripts/kaizen.sh archive`, but that subcommand doesn't exist, so the log is lost when this container is reclaimed.

The subcommand exists. The friction log of the task was never archived during the task, because the session believed there was nothing to run.

## Root-cause chain

1. **Why did the message say the subcommand was missing?**
   `grep -n "archive" CLAUDE.md plugins/borso-harness/scripts/kaizen.sh scripts/kaizen.sh` was never run. During the task the only check was `grep -n "archive" -A12 scripts/kaizen.sh`, which printed nothing.
2. **Why did that grep print nothing?**
   `scripts/kaizen.sh` was a five-line wrapper whose only command was `exec "$(dirname "$0")/../plugins/borso-harness/scripts/kaizen.sh" "$@"`. The subcommands live in the plugin script.
3. **Why was the empty result taken as an answer?**
   The file at the path `CLAUDE.md` names looked like the script itself, and a grep on a file reads as a complete search of that file. Nothing in the result said "this file is not the code".
4. **Why was the path a wrapper and not the script?**
   When the logger moved into the harness plugin, the old path stayed for the hundred documents that name it, and a shell `exec` was the simple way to keep it. The plugin script found its siblings through `dirname "${BASH_SOURCE[0]}"`, so a symlink at the old path would have looked for `scripts/harness-path.sh` and failed.

**Root cause:** thought the file at `scripts/kaizen.sh` was the logger and an empty grep proved a subcommand absent; actually it was a forwarding wrapper and the logger was one directory away.

## Detection failure causes

- **Typing / linter:** not applicable to a shell wrapper.
- **Functional validation locally:** the claim was never tested by running `scripts/kaizen.sh archive`, which would have worked. The rule in `CLAUDE.md` under *Verify before asserting* already says "*I can't reach that* is a hypothesis until a command says so"; a grep is a command, but it answered a different question.
- **Code review:** the operator caught nothing because the message sounded verified.

## Countermeasure

The post-merge sweep (this entry) found `archive` in `plugins/borso-harness/scripts/kaizen.sh` and corrected the claim to the operator.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** the commit that adds this file

**The actual fix:** `scripts/kaizen.sh` is now a relative symlink to `../plugins/borso-harness/scripts/kaizen.sh`, so reading, grepping or running the path every document names reaches the real code. The plugin script resolves its own location with `realpath`, so it still finds `harness-path.sh` when it is reached through the link.

```diff
-#!/usr/bin/env bash
-exec "$(dirname "$0")/../plugins/borso-harness/scripts/kaizen.sh" "$@"
+scripts/kaizen.sh -> ../plugins/borso-harness/scripts/kaizen.sh
```

```diff
-HARNESS_PATH="$(dirname "${BASH_SOURCE[0]}")/harness-path.sh"
+HARNESS_PATH="$(dirname "$(realpath "${BASH_SOURCE[0]}")")/harness-path.sh"
```

Checked after the change: `grep -c archive scripts/kaizen.sh` prints 10, and `scripts/kaizen.sh show` works from the repository root and from `apps/talos`.

**Sibling defects swept:** `grep -l 'exec "$(dirname' scripts/*.sh` found one more forwarding wrapper, `scripts/check-hook-decisions.sh`, whose plugin script also located itself through `$0`. It is now a symlink too, and its plugin script resolves `$0` with `realpath`; `scripts/check-hook-decisions.sh` still reports 74 decisions. No other script under `scripts/` names the plugin in eight lines or fewer.

## See also

- [`said-the-file-was-unreachable-without-looking.md`](./said-the-file-was-unreachable-without-looking.md): the same claim shape, "it is not there", made without the command that would have answered it.

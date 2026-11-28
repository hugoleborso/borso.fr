---
date: 2026-10-29
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#230'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/kaizen.sh, scripts/kaizen.test.ts]
time-to-detect: one turn
tags: [harness, tooling, process]
zone: scripts/kaizen.sh
recurs: [the-wrapper-that-hid-the-subcommand]
---

# The friction log that recorded a typo

## Symptom

While opening PR #230, the session ran `scripts/kaizen.sh list` to see what the log held. The script answered `logged as main: list`, and `KAIZEN.md` gained the line ``- [2026-10-29 12:24] `main` list``. The session deleted that line by hand before archiving. A session that had not read the output would have archived the word `list` as friction for the sweep to triage.

## Root-cause chain

1. **Why did `list` become an entry?**
   The script's `case` sends every argument that is not `show`, `archive` or `init` to the logging branch.
2. **Why did the session type `list`?**
   It guessed a subcommand name instead of reading the usage line. `show` is the real one.
3. **Why did the guess not fail?**
   The logging branch accepts any text, including a single word. A wrong subcommand and a friction sentence look the same to it.

**Root cause:** thought an unknown subcommand would be refused, actually any argument that is not a subcommand is written to the log as friction.

## Detection failure causes

- **Typing / linter:** not applicable to a shell argument.
- **Functional validation locally:** the script printed `logged as main: list`, which only a reader who checks every output notices.
- **Code review:** no reviewer sees the gitignored log until the archive is committed.

## Countermeasure

The session removed the line from `KAIZEN.md` before `scripts/kaizen.sh archive`.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1, structural impossibility)

> **Superseded mechanism.** Logging is now its own subcommand, `scripts/kaizen.sh log`, and any other first word is refused. The one-word heuristic this entry shipped is deleted: `scripts/kaizen.sh list` and the old flag-first form both exit 1 and log nothing (tested in `scripts/kaizen.test.ts`). The log is now `docs/kaizen/<branch>.md`, a tracked file the branch commits from its first line, written by `scripts/kaizen.sh log`. `archive`, the drain, the session id and parking, `sweep-input`, the `gh pr create` count and the gitignore lines are deleted.

**Reference:** the commit that adds this file

**The actual fix:** the logging branch refuses an argument with no whitespace. A friction line is a sentence, so a one-word argument can only be a mistyped subcommand.

```diff
   *)
+    if [[ "$*" != *[[:space:]]* ]]; then
+      printf 'scripts/kaizen.sh: "%s" is not a subcommand (show, archive, init), and one word is not a friction sentence. Nothing logged.\n' "$*" >&2
+      exit 1
+    fi
     ensure_file
```

Proof, measured on this branch. With the fix removed (`git stash`):

```text
$ scripts/kaizen.sh list
[kaizen] logged as main: list
exit 0
```

With the fix:

```text
$ scripts/kaizen.sh list
scripts/kaizen.sh: "list" is not a subcommand (show, archive, init), and one word is not a friction sentence. Nothing logged.
exit 1
$ scripts/kaizen.sh "a real sentence for the proof"
[kaizen] logged as main: a real sentence for the proof
```

**Sibling defects swept:** the hook caller `.claude/hooks/kaizen-refusal.sh` always passes a multi-word summary, so the refusal does not reach it.

## See also

- [the-wrapper-that-hid-the-subcommand](./the-wrapper-that-hid-the-subcommand.md), the earlier case of a session guessing at `kaizen.sh`'s subcommands.

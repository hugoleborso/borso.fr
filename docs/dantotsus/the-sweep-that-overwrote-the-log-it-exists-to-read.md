---
date: 2026-09-16
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#105'
fix-commits: [24eaf9b2d2]
eradication-level: 1
eradication-paths: [scripts/kaizen.sh]
time-to-detect: hours
tags: [meta, self-improvement-loop, agents, shell, gates, claude-md]
zone: scripts/kaizen.sh
---

# The sweep that overwrote the log it exists to read

## User impact

The after-merge sweep, whose primary input is the friction its agents logged.
Measured in PR #105's task, where three agents archived in turn.

| | Seen | Expected |
| --- | --- | --- |
| The third agent runs `scripts/kaizen.sh archive <slug>` | Success, with a count of the entries it wrote. The eight entries two earlier agents had archived are gone | Every agent's entries kept, and a count of what was added |
| The sweep reads the archive | One agent's lines. A wall three agents hit reads as one agent's bad luck | Every line, so frequency shows |

Logged by `validate-visual-04`: "kaizen.sh archive still cp-overwrites the
feature's kaizen.md, so the eight entries two earlier agents had archived had
to be merged back in by hand before this round's could be added".

## Causal chain

- Eight archived entries disappeared.
  - The third archive replaced the file the first two had written.
    - `archive` copied the session's `KAIZEN.md` over the destination, without
      reading what was there. ← the faulty line, `scripts/kaizen.sh`

      ```bash
      destination="$REPO_ROOT/docs/features/$2/kaizen.md"
      cp "$KAIZEN_FILE" "$destination"   # replaces every line an earlier archive wrote
      ```

      - An agent wrote it in `8356cd798` (2026-08-15, "the kaizen log cannot
        reach the sweep it is the primary input to"). Its message describes
        one move: the container is reclaimed when the session ends, so the
        log is copied "into the feature folder, where the sweep will look for
        it".
        - A task that runs agents in rounds archived between rounds, so the
          archive had as many writers as rounds.
          - **Machine:** the friction log lives in a gitignored file and
            reaches the branch only through a copy step into a tracked file.
            That copy has produced at least four defects, each patched at one
            end of it (`ls docs/dantotsus | grep friction-log`, plus
            [the-sweep-handed-a-log-it-had-already-read](./the-sweep-handed-a-log-it-had-already-read.md)).

## Root cause of occurrence

*Thought an archive is a one-time copy of one session's log at its end,
actually it is the accumulating record of every writer in a task, archived as
many times as the task has rounds.* **Method:** the step CLAUDE.md named in
`8356cd798` was one archive per session, and the design followed it.

The same commit counted "33 entries from twelve different agent labels", so
the writer knew the log had many writers. The step it designed still assumed
one archive.

## Detection failure causes

- **Typing and linter:** shell, with no type to hold "append only".
- **Local validation:** the command succeeded, and its message counted what it
  had written. A destructive write that reports the size of its replacement
  reads like a correct one.
- **CI:** nothing runs `archive`. It is an agent command.
- **Review:** `cp src dst` after `mkdir -p` reads as correct, and is, for one
  writer.
- **The corpus:** the entry reporting this sat in the file the bug deletes. It
  survived only because an agent merged the earlier ones back by hand.

## Countermeasure

`archive` merges. It keeps the destination, appends only the entry lines it
does not already hold, and reports how many were added and how many the file
now holds.

The first version used `grep -Fxq "$entry"`. Every entry begins with `- `,
which grep reads as an option cluster, so every entry was appended on every
run. Archiving twice from two logs and reading the result found it, and `--`
fixed it.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** commit `24eaf9b2` (#106), `scripts/kaizen.sh`.

```diff
-cp "$KAIZEN_FILE" "$destination"
+if [ -f "$destination" ]; then
+  added=0
+  while IFS= read -r entry; do
+    grep -Fxq -- "$entry" "$destination" || { printf '%s\n' "$entry" >> "$destination"; added=$((added + 1)); }
+  done < <(grep '^- \[' "$KAIZEN_FILE" || true)
+  printf '…merged %s new entry/entries into …/kaizen.md (%s total)…' "$added" "$(grep -c '^- \[' "$destination")"
+else
+  cp "$KAIZEN_FILE" "$destination"
+fi
```

The code holds today, in the `archive)` branch of `scripts/kaizen.sh`. `cp`
runs only when no destination exists. An existing archive is only appended to,
so `archive` can no longer drop an earlier agent's entry. Entries are one line
each with a writer label and a timestamp, so an exact-line match identifies a
duplicate.

This removes the overwrite, not the copy. The copy step is where the other
friction-log defects happened.

**Proposed:** subtract the copy. `scripts/kaizen.sh` appends each line
directly to the branch's tracked archive under `docs/features/`, and a
`.gitattributes` at the root sets `merge=union` on `docs/features/**/kaizen.md`,
a git built-in driver. Overwrites, lost logs and duplicate archives would then
have no step to happen in. No `.gitattributes` exists yet.

**Proof it can fail:** restoring the `cp` and archiving twice from two logs
leaves only the second log's lines. With the merge, both sets remain, and a
second archive of the same log adds nothing (measured when `24eaf9b2`
shipped).

**Similar instances:** `archive` is the only `kaizen.sh` command that writes
outside `KAIZEN.md`. Downstream, when a sweep cannot see what an earlier sweep
did, the loop ships the same gate twice
([`the-loop-shipped-the-same-gate-twice.md`](./the-loop-shipped-the-same-gate-twice.md)).

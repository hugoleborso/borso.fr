---
date: 2026-09-16
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#105'
fix-pr: '#106'
fix-commits: []
eradication-level: 1
time-to-detect: hours
tags: [meta, self-improvement-loop, agents, shell, gates, claude-md]
---

# The sweep that overwrote the log it exists to read

## Symptom

`scripts/kaizen.sh archive <slug>` copies the session's gitignored
`KAIZEN.md` into the branch, because a hosted session's container is reclaimed
before the sweep runs and a gitignored file cannot travel between two
containers. It is the one mechanism that gets the sweep's primary input to the
sweep.

It was a `cp`.

```bash
destination="$REPO_ROOT/docs/features/$2/kaizen.md"
cp "$KAIZEN_FILE" "$destination"
```

Three agents in one task each archived in turn. The third overwrote the
second, which had overwritten the first. Eight entries from two earlier agents
had to be merged back by hand, by the agent that noticed — and it noticed
because it happened to look at the file, not because anything said so. The
command reported success each time, with a count of the entries it had just
written and no mention of the ones it had just removed.

Found in this sweep's own input, logged by `validate-visual-04`:

> *kaizen.sh archive still cp-overwrites the feature's kaizen.md, so the eight
> entries two earlier agents had archived had to be merged back in by hand
> before this round's could be added*

## Root-cause chain

1. **Why did entries disappear?**
   `cp` replaces. The destination's previous contents are not read.

2. **Why did the author write `cp`?**
   The archive was designed for one writer: a session ends, its log is copied
   into the branch, the sweep reads it. One session, one copy, one file.

3. **Why is there more than one writer?**
   CLAUDE.md asks every subagent to log, under *Subagents log here too, and
   this is the half that matters* — because four agents hitting one wall is a
   systemic problem and one agent hitting it is a local one, and the sweep can
   only tell them apart if all four lines survive. A task that runs agents in
   rounds archives between rounds, so the archive has as many writers as the
   log does.

4. **Why did nothing catch it?**
   The command's own success message counts what it wrote. A destructive write
   that reports the size of its replacement is indistinguishable from a
   correct one.

5. **Why is this worse than an ordinary data loss?**
   Because what is lost is the evidence of *how often* something went wrong,
   and frequency is the whole signal. A wall three agents hit, reduced to one
   line, reads as one agent's bad luck. The sweep then writes a knowledge
   entry where it should have shipped a gate.

**Root cause:** the author thought *an archive is a copy of one session's log*,
actually *an archive is the accumulating record of every writer in a task*, and
the one command whose purpose is to stop the sweep losing its input was the
thing losing it.

## Detection failure causes

- **Typing / linter:** shell.
- **Functional validation locally:** the command succeeds, and its output
  reports a plausible count.
- **CI:** nothing runs `archive`; it is an operator and agent command.
- **Code review:** `cp src dst` after `mkdir -p` reads as obviously correct,
  and is, for one writer.
- **The corpus:** the entry that reports this is itself in the file the bug
  deletes. It survived only because an agent merged the earlier ones back by
  hand.

## Countermeasure

- **Code:** `archive` merges. It keeps the destination, appends only the entry
  lines it does not already hold, and reports how many were added and how many
  the file now holds.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** PR #106 · `scripts/kaizen.sh`

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

Losing an earlier agent's entry is no longer expressible: the destination is
only ever appended to. Entries are one line each carrying a writer label and a
timestamp, so an exact-line match identifies a duplicate reliably, and
archiving twice from the same session adds nothing the second time.

The message changed with it. It now reports what was added *and* the running
total, so a merge that adds two lines to a file of thirty says so — the
previous message could only ever describe a replacement.

**A defect the test found, not the reader:** the first implementation used
`grep -Fxq "$entry"`, and every entry begins with `- `, which grep reads as an
option cluster. Both entries were appended on every run, duplicates included.
Verified by archiving twice from two different logs and reading the result,
which is the check that found it; `--` fixed it.

**Sibling defects swept:** none — `archive` is the only command here that
writes outside `KAIZEN.md`.

## See also

- [`the-loop-shipped-the-same-gate-twice.md`](./the-loop-shipped-the-same-gate-twice.md) — what happens downstream when the sweep cannot see what an earlier sweep did.
- [`the-skill-that-named-the-linter-the-repository-deleted.md`](./the-skill-that-named-the-linter-the-repository-deleted.md) — four agents absorbing one wall, which is the signal this defect erases.

---
date: 2026-10-29
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#218'
fix-pr: '#220'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/kaizen.sh]
time-to-detect: 1 day
tags: [meta, harness, kaizen, gates]
zone: scripts
weak-point: gate-measures-nothing
recurs: [the-friction-log-that-never-left-the-container]
---

# The friction log that arrived twice

## Symptom

This sweep opened by reading the two archived friction logs PR #218 and
PR #219 committed. They differ by exactly one line:

```
$ diff <(grep '^- \[' .../agent-reader-lambda/kaizen.md) \
       <(grep '^- \[' .../dsql-connection-parameters/kaizen.md)
+ - [00:55] `main` DSQL refuses default_transaction_read_only …
```

Twelve of the thirteen entries in the second archive belong to the first pull
request. Four of them belong to neither: they were logged earlier in the same
session, swept in PR #202 and PR #217, and eradicated there. Two more are about
the pragma MCP server and belong to a different task altogether.

Six of this inventory's sixteen rows exist only because of that.

## Root-cause chain

1. **Why did the second archive hold the first's entries?**
   `kaizen.sh archive` copies the log. It does not take anything out of it.
2. **Why does that matter, when the log is per task?**
   It is not per task, it is per *session*. `KAIZEN.md` is created once at
   SessionStart, and a session that ships two pull requests archives twice from
   one accumulating file.
3. **Why was copying the obvious implementation?**
   The command was written for the hosted case, where a container is reclaimed
   at the end of the session and the archive is a rescue. One session, one
   archive, nothing left to protect. The local case — several pull requests in
   one sitting — was never the one in view.
4. **Why did nothing catch it?**
   An archive that holds too much looks exactly like an archive that holds
   enough. The hook that refuses a pull request with an unarchived log counts
   entries; it cannot ask whether they are *this* task's.
5. **Why does a sweep care?**
   The inventory's quality is the sweep's whole output, and its first
   instruction is to map every logged line to a row. Lines from eradicated work
   consume that budget and produce `no-op` rows, which is the shape of a
   procedure doing its job on the wrong input.

**Root cause:** thought the friction log was a per-task artefact, actually it is
a per-session accumulator, and the command that moves it between the two was a
copy.

## Detection failure causes

- **The pre-create hook:** `pretool-gh-pr-create.sh` refuses a pull request
  whose branch commits no archive. It counts; it has no notion of which entries
  belong to this branch.
- **Code review:** `cp` is correct for the problem the comment above it
  describes. The comment describes the hosted case.
- **The sweep itself:** this is the first session to archive twice, so the
  defect needed two pull requests in one sitting to appear at all.

## Countermeasure

- **Code:** the archive drains the log of what it archived.
- **Operator action:** none. The archives already committed keep their extra
  lines; this inventory records which rows they caused.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** PR #220 · commit `self`

**The actual fix:** the entries leave the log once they are somewhere a commit
can carry them. The destination is written first, so nothing is removed before
it exists elsewhere.

```diff
     fi
+    kept="$(sed '/^- \[/d' "$KAIZEN_FILE")"
+    printf '%s\n' "$kept" > "$KAIZEN_FILE"
     ;;
```

A second archive cannot contain the first's entries, because they are no longer
in the file it reads. Measured on this session's own log:

```
archive meta/probe-one   → archived 15 entry/entries
entries left in log: 0
<one more line logged>
archive meta/probe-two   → archived 1 entry/entries
```

Before the fix the second archive held 16.

The merge path for re-archiving the *same* feature is untouched: it appends
only lines the destination does not already hold, so re-running `archive` after
logging more is still correct and still idempotent.

**Sibling defects swept:** none. `archive` is the only command that moves the
log.

## See also

- [`the-friction-log-that-never-left-the-container.md`](./the-friction-log-that-never-left-the-container.md) — the first half of this: the log that never arrived. This is the log that arrived too much.
- [`docs/features/meta/lessons-from-pr-218/inventory.md`](../features/meta/lessons-from-pr-218/inventory.md) — the six rows this caused.
- [`docs/quality/weak-points.md`](../quality/weak-points.md) — `gate-measures-nothing`.

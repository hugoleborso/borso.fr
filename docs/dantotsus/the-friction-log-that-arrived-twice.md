---
date: 2026-10-29
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#218'
fix-commits: [222f79f98]
eradication-level: 2
eradication-paths: [scripts/kaizen.sh]
time-to-detect: 1 day
tags: [meta, harness, kaizen, gates]
zone: scripts/kaizen.sh
weak-point: gate-measures-nothing
recurs: [the-friction-log-that-never-left-the-container]
---

# The friction log that arrived twice

## User impact

This sweep opened by reading the two archived friction logs PR #218 and
PR #219 committed. They differ by exactly one line (measured):

```
$ diff <(grep '^- \[' .../agent-reader-lambda/kaizen.md) \
       <(grep '^- \[' .../dsql-connection-parameters/kaizen.md)
+ - [00:55] `main` DSQL refuses default_transaction_read_only …
```

Twelve of the thirteen entries in the second archive belong to the first pull
request. Four belong to neither: they were logged earlier in the same session,
swept in PR #202 and PR #217, and eradicated there. Two more are about the
pragma MCP server, a different task. Six of this inventory's sixteen rows
exist only because of that. Expected: each archive holds the lines of its own
pull request.

## Causal chain

- The second archive held the first's entries.
  - `kaizen.sh archive` copied the log and left it full:

    ```sh
    cp "$KAIZEN_FILE" "$destination"   # ← ❌ the entries stay behind for the next archive
    ```

    - One session shipped two pull requests, and `KAIZEN.md` is created once
      per session, so the second archive read the same accumulating file.
      - Commit `8356cd798`, written by an agent, added `archive` as a copy.
        Its message frames the hosted case only: "the container is reclaimed
        when the session ends and `/after-task-dantotsus` runs later in a
        fresh one". One session, one archive, nothing left behind to matter.
        - The log's scope came from commit `9d698e854`, which gitignored it
          as a "Per-session kaizen scratch file". A session that ships
          several pull requests was never the case in view, and nobody
          decided whether the log belongs to the task or the session.
          **Method.**

## Root cause of occurrence

*Thought the friction log was a per-task artefact, actually it is a
per-session accumulator, and the command that moves it into a task was a
copy.* Method: the log's scope was set by the hosted case, one session per
task, and never decided for a session that ships several.

## Detection failure causes

- **The pull-request hook:** it refuses a pull request whose branch commits
  no archive. It counts entries and has no notion of which belong to this
  branch, so an archive holding too much passes like one holding enough.
- **Code review:** `cp` is correct for the problem the comment above it
  describes, which is the hosted case.
- **The sweep itself:** this was the first session to archive twice, so the
  defect needed two pull requests in one sitting to appear.

## Countermeasure

The archive drains the log of what it archived. The archives already
committed keep their extra lines, and this inventory records which rows they
caused.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`222f79f98`](https://github.com/hugoleborso/borso.fr/commit/222f79f98)
(PR #220).

The entries leave the log once they are somewhere a commit can carry them.
The destination is written first, so nothing is removed before it exists
elsewhere:

```diff
     fi
+    kept="$(sed '/^- \[/d' "$KAIZEN_FILE")"
+    printf '%s\n' "$kept" > "$KAIZEN_FILE"
     ;;
```

A second archive cannot contain the first's entries, because they are no
longer in the file it reads. The drain still holds in `scripts/kaizen.sh`.
A related leak, an archive into a slug an earlier pull request used, is now
read past by `kaizen.sh sweep-input`, which hands the sweep only the lines
the merge added.

This entry first said level 1. The drain is a step inside one command, and
an entry logged after the archive and before the second pull request still
lands in the wrong one. Level 2 is what holds.

**Proposed:** keep the log in the branch from the first line, named from the
branch, as
[`the-friction-log-that-adopted-another-sessions-lines`](./the-friction-log-that-adopted-another-sessions-lines.md)
proposes. Two pull requests mean two branches and two logs, so neither a
drain nor a copy is needed, and `archive` can be deleted.

**Proof it can fail:** measured on this session's own log when the fix
shipped:

```
archive meta/probe-one   → archived 15 entry/entries
entries left in log: 0
<one more line logged>
archive meta/probe-two   → archived 1 entry/entries
```

Before the fix the second archive held 16.

**Similar instances:** `archive` is the only command that moves the log.
`grep -n "KAIZEN_FILE" scripts/kaizen.sh` lists every read of it.

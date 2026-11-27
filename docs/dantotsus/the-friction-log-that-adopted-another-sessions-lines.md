---
date: 2026-10-29
introduced-at: conception
detected-at: review
severity: low
related-pr: '#236'
fix-commits: [6260522c3]
eradication-level: 2
eradication-paths: [scripts/kaizen.sh, scripts/hooks/checks/kaizen-init.core.ts]
time-to-detect: minutes (seen when the archive was read before committing)
tags: [meta, harness, kaizen, session-start]
zone: scripts/kaizen.sh
recurs: [the-friction-log-that-arrived-twice]
---

# The friction log that adopted another session's lines

## User impact

PR #236's session opened with `KAIZEN.md carries 7 entries logged earlier in
this task`. It had logged none. `scripts/kaizen.sh archive
meta/preview-environment-cleanup` then wrote nine lines into the branch:
seven hook refusals stamped 03:28 to 04:01, from a task that ended hours
before this one began, and the two this session wrote. They were removed by
hand before the commit. Expected: a new session starts with an empty log, and
its archive holds only its own lines.

## Causal chain

- The archive carried seven lines from another task.
  - `archive` copies every entry in `KAIZEN.md`, and the file still held
    them.
    - The earlier session never archived, so nothing drained the file. The
      file is gitignored at the checkout's root, so a new session on the same
      checkout opened the same file.
      - SessionStart reported the leftovers as this task's. Commit
        `848717821`, written by an agent, wrote the message:

        ```sh
        log "KAIZEN.md carries ${kaizen_entries:-0} entries logged earlier in this task"  # ← ❌ a checkout's file, read as a task's
        ```

        Its commit message says "Subsequent sessions report how many entries
        the task already carries."
        - The log's scope came from commit `9d698e854`, which gitignored it
          as a "Per-session kaizen scratch file ... Local-only by design". It
          was designed on hosted sessions, where each container starts with
          no file. Nobody decided whether the log belongs to the task, the
          session or the checkout, so each new use found a different leak.
          **Method.**

## Root cause of occurrence

*Thought each session starts with an empty log, actually a local checkout
keeps whatever the last unarchived session left.* Method: the log is one
gitignored file per checkout, and its scope was set by the hosted case and
never decided.

The same undecided scope produced
[`the-friction-log-that-arrived-twice`](./the-friction-log-that-arrived-twice.md)
and
[`the-friction-log-that-never-left-the-container`](./the-friction-log-that-never-left-the-container.md).

## Detection failure causes

- **SessionStart:** it checked only whether the file existed, and called any
  entries "logged earlier in this task". It compared nothing with the session
  reading them.
- **Review:** caught here, by reading the archived file before committing it.

## Countermeasure

The seven lines were removed from the archive before the commit in PR #236.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`6260522c3`](https://github.com/hugoleborso/borso.fr/commit/6260522c3)
(PR #237).

The log records the session that opened it. `kaizen.sh init`, which
`scripts/hooks/checks/kaizen-init.core.ts` runs at every SessionStart, moves a
log owned by another session to `KAIZEN.<timestamp>.md` and says so. A
resumed session keeps its id and its log. `install-repo-deps.sh` no longer
creates the file, because its call raced the SessionStart entry over the same
rename.

```diff
+SESSION="${CLAUDE_CODE_SESSION_ID:-}"
 ensure_file() {
-  [ -f "$KAIZEN_FILE" ] || printf '%s\n' "$HEADER" > "$KAIZEN_FILE"
+  [ -f "$KAIZEN_FILE" ] && return
+  printf '%s\n' "$HEADER" > "$KAIZEN_FILE"
+  [ -z "$SESSION" ] || printf 'Session: %s\n\n' "$SESSION" >> "$KAIZEN_FILE"
 }
   init)
+    park_another_sessions_log
     ensure_file
```

The doubt this entry first left open is settled. On 2026-11-27, the main
checkout's `KAIZEN.md` carries `Session: c386ff1e-fc93-5bfc-8045-7c88f3a589ab`,
written by `init` at SessionStart, and the Bash tool's
`CLAUDE_CODE_SESSION_ID` is the same id (measured). So the SessionStart hook
does see the id.

This entry first said level 1. Parking is a runtime check on one file, and it
holds only while a session id is set. Level 2 is what holds.

**Proposed:** keep the log in the branch instead of the checkout. `kaizen.sh`
would append to a file under the branch's feature folder from the first line,
named from the branch, and the pull request would commit it like any other
file. Two sessions or two pull requests would then write to two files, so
none could adopt another's lines. The session id, the parking, the drain in
`archive`, the `archive` step itself and the pull-request gate's count would
all become unnecessary. This one change also covers the two entries named
above.

**Proof it can fail:** on a scratch repository, session A logs a line and
resumes with its log intact. Session B starts and gets
`[kaizen] 1 entries from session A were never archived; moved to KAIZEN.20261029160706.md`
and an empty log (measured when `6260522c3` shipped).

**Similar instances:** the pull-request hook, then
`pretool-gh-pr-create.sh` and now `scripts/hooks/checks/gh-pr-create.core.ts`,
logged every refusal as "a body too thin for the template", which put a wrong
line in this same log. Commit `6260522c3` made it log the reason it refused
with.

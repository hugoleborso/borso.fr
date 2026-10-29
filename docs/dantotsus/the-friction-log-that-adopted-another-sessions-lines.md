---
date: 2026-10-29
introduced-at: conception
detected-at: review
severity: low
related-pr: '#236'
fix-pr: none (the kaizen pull request for PR #236 carries it)
fix-commits: [self]
eradication-level: 1
eradication-paths: [plugins/borso-harness/scripts/kaizen.sh, scripts/install-repo-deps.sh]
time-to-detect: minutes (seen when the archive was read before committing)
tags: [meta, harness, kaizen, session-start]
zone: plugins/borso-harness/scripts
recurs: [the-friction-log-that-arrived-twice]
---

# The friction log that adopted another session's lines

## Symptom

PR #236's session opened with `KAIZEN.md carries 7 entries logged earlier in
this task`. It had logged none. `scripts/kaizen.sh archive
meta/preview-environment-cleanup` then wrote nine lines into the branch: seven
hook refusals stamped 03:28 to 04:01, from a task that ended hours before this
one began, and the two this session wrote. They were removed by hand before
the commit.

## Root-cause chain

1. **Why did the archive carry another task's lines?** `archive` copies every
   entry in `KAIZEN.md`, and the file still held them.
2. **Why did it still hold them?** The earlier session never archived, so
   nothing drained it, and the file is gitignored, so switching branches does
   not touch it.
3. **Why did the new session not notice?** SessionStart only checked whether
   the file existed, and reported any entries as "logged earlier in this
   task".
4. **Why "this task"?** The log was designed on hosted sessions, where each
   container starts with no file. A local checkout outlives every session that
   runs in it.

**Root cause:** thought each session starts with an empty log, actually a
local checkout keeps whatever the last unarchived session left.

## Detection failure causes

- **Local validation:** nothing compares a log's entries with the session
  that reads them; the message stated a guess as a fact.
- **Review:** caught here, by reading the archived file before committing it.

## Countermeasure

- **Code:** the seven lines were removed from the archive before the commit
  in PR #236.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** this commit, on the kaizen branch for PR #236.

**The actual fix:** the log records the session that opened it, and
`kaizen.sh init`, which runs at every SessionStart, moves a log owned by
another session to `KAIZEN.<timestamp>.md` and says so. A resumed session
keeps its id and its log. `install-repo-deps.sh` no longer initialises the
file itself, because its call raced the settings entry over the same rename.

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

Proof on a scratch repository: session A logs a line and resumes with its log
intact; session B starts and gets
`[kaizen] 1 entries from session A were never archived; moved to KAIZEN.20261029160706.md`
and an empty log; a log with no `Session:` line is parked the same way; with
no session id in the environment, nothing moves, which is today's behaviour.

Not proven yet: that `CLAUDE_CODE_SESSION_ID` reaches a SessionStart hook's
environment. It is set in the Bash tool's environment. If the hook does not
see it, `init` keeps the old behaviour and loses nothing.

**Sibling defects swept:** `pretool-gh-pr-create.sh` logged every refusal as
"a body too thin for the template", including a missing `--body-file`, which
put a wrong line in this same log. It now logs the reason it refused with,
and names the unexpanded-variable case.

## See also

- [the-friction-log-that-arrived-twice.md](./the-friction-log-that-arrived-twice.md), the same file carrying one session's lines into its second pull request.
- [the-friction-log-that-never-left-the-container.md](./the-friction-log-that-never-left-the-container.md), why `archive` exists.

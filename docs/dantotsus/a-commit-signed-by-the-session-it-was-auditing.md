---
date: 2026-11-04
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#253'
fix-pr: none (the kaizen pull request for PR #253 carries it)
fix-commits: [self]
eradication-level: 2
eradication-paths: [commitlint.config.js, .husky/commit-msg]
time-to-detect: minutes (the sweep saw it before the first push)
tags: [meta, harness, git, gates, self-improvement-loop]
zone: commitlint.config.js
recurs: none (the-friction-log-that-adopted-another-sessions-lines mixed two sessions in the friction log, this one in a commit trailer)
---

# A commit signed by the session it was auditing

## User impact

The operator reads what a pull request cost from its commits'
`Claude-Session` trailers. `docs/quality/feature-cost.md` sums `get_session`
over every session those trailers name. A wrong trailer charges the work to
another session and drops the real one from the row.

| | Seen | Expected |
| --- | --- | --- |
| The sweep of PR #251, first commit | `Claude-Session: …/session_01K69KnEgGhRxs5YnwwG4V2U`, the swept feature's session | `…/session_01K69KnEDyeFjU26Ww6Xh6B3`, the sweep's own |

The sweep caught it and amended before pushing (operator's account of the
session). Nothing wrong reached `main`.

## Causal chain

- A commit named the wrong session.
  - The sweep had just read PR #251's commits and their trailers as evidence.
    - It wrote its own trailer from the last one it had read, not from its
      own attribution reminder.
      - `commitlint` checked the header, scope and body, but never the
        trailer, so the commit went through.

## Root cause of occurrence

*Thought a trailer is boilerplate that no gate needs to read, actually it is
the key the cost table joins on.* `feature-cost.md`, *Targets*: "summed over
every session in the commits' `Claude-Session` trailers".

A kaizen sweep is the one task that reads another session's trailers on
purpose, which makes a copied trailer the likely mistake there.

## Detection failure causes

- **commit-msg hook:** `commitlint.config.js` had no rule on trailers.
- **The friction log:** the amend happened before the archive and was never
  logged, so the archive held 0 entries. Only the operator's handoff prompt
  carried it.

## Countermeasure

A commitlint rule refuses a `Claude-Session` trailer naming any session other
than the one committing. A hosted session exports its id as
`CLAUDE_CODE_REMOTE_SESSION_ID=cse_<id>`, and the trailer names it as
`session_<id>`. Where the variable is unset (CI, a local session) the rule
passes, so merges of other sessions' commits are not refused.

`.husky/commit-msg` now logs any commitlint refusal through
`kaizen-refusal.sh`, so the next amend of this kind reaches the friction log
without anyone remembering it.

## Eradication

**Type:** DevX check (level 2)

**Reference:** this commit, on the kaizen branch for PR #253.

```diff
+const namesOnlyThisSession = ({ raw }) => {
+  const sessionId = process.env.CLAUDE_CODE_REMOTE_SESSION_ID?.replace(/^cse_/, '');
+  if (!sessionId) return [true];
+  const otherSessions = [...(raw ?? '').matchAll(SESSION_TRAILER)]
+    .map((match) => match[1])
+    .filter((named) => named !== sessionId);
```

The check can fail. A message carrying PR #251's trailer, fed to
`pnpm exec commitlint --edit` from session `01K69KnCC1GwhF77rMwHPkuZ`
(measured):

```
✖   Claude-Session names session_01K69KnEgGhRxs5YnwwG4V2U, but this commit comes from session_01K69KnCC1GwhF77rMwHPkuZ. Copy the trailer from this session's attribution reminder, not from another commit. [claude-session-is-this-session]
```

The same message with this session's trailer exits 0, and with the variable
unset it exits 0.

Level 1 was considered. A `prepare-commit-msg` hook could write the trailer
from the environment, so no agent writes it. It was not chosen, because the
harness's attribution reminder tells every agent to write the trailer itself,
and the two would add a second trailer that the cost table would count twice.

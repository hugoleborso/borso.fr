---
date: 2026-11-04
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#253'
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

- A commit of the sweep of PR #251 named the swept feature's session in its `Claude-Session` trailer.
  - The sweep wrote its trailer from the last one it had read, not from its own attribution reminder.

    ```
    Claude-Session: https://claude.ai/code/session_01K69KnEgGhRxs5YnwwG4V2U   # ❌ PR #251's session, not the sweep's
    ```

    - Just before, the sweep had read PR #251's commits and their trailers as evidence, which is what a kaizen sweep does on purpose.
      - The sweep's context then held several trailers of one format, and only one of them was its own: the attribution reminder. The reminder and the commits it was auditing look alike. (Man)

## Root cause of occurrence

*Thought the trailer it had just read was its own, actually that trailer named the session it was auditing, and its own id was only in the attribution reminder.*

Man. Under the agentic rule, the right answer was in the agent's context: the harness's attribution reminder gives each session its own trailer. The prior to copy the nearest example won, because the sweep's evidence was a run of trailers in the same format. One more document cannot fix it, since the document was already there. A gate that holds when the prior wins can (Machine).

The trailer matters because it is the key the cost table joins on. `docs/quality/feature-cost.md`, *Targets*: "summed over every session in the commits' `Claude-Session` trailers".

## Detection failure causes

- **commit-msg hook:** `commitlint.config.js` had no rule on trailers. It checked the header, scope and body.
- **The friction log:** the amend happened before the archive and was never logged, so the archive held 0 entries. Only the operator's handoff prompt carried it.

## Countermeasure

A commitlint rule refuses a `Claude-Session` trailer naming any session other than the one committing. A hosted session exports its id as `CLAUDE_CODE_REMOTE_SESSION_ID=cse_<id>`, and the trailer names it as `session_<id>`. Where the variable is unset (CI, a local session) the rule passes, so merges of other sessions' commits are not refused.

`.husky/commit-msg` logs any commitlint refusal to the friction log. It now calls `scripts/kaizen.sh --from hook:commitlint` directly (read this session).

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit adding this file, on the kaizen branch for PR #253. The rule is in `commitlint.config.js` today (read this session).

```diff
+const namesOnlyThisSession = ({ raw }) => {
+  const sessionId = process.env.CLAUDE_CODE_REMOTE_SESSION_ID?.replace(/^cse_/, '');
+  if (!sessionId) return [true];
+  const otherSessions = [...(raw ?? '').matchAll(SESSION_TRAILER)]
+    .map((match) => match[1])
+    .filter((named) => named !== sessionId);
```

**Proposed:** a `prepare-commit-msg` hook in `.husky/` that replaces any `Claude-Session` trailer with the one built from `CLAUDE_CODE_REMOTE_SESSION_ID`. A wrong trailer could then not be written at all, so the commitlint rule could go. The first version of this entry rejected it, because the hook and the agent would each add a trailer and the cost table would count the session twice. Neither holds. The hook rewrites the trailer instead of adding one, and `feature-cost.md` sums over the set of sessions the trailers name, so a repeated session counts once.

**Proof it can fail:** a message carrying PR #251's trailer, fed to `pnpm exec commitlint --edit` from session `01K69KnCC1GwhF77rMwHPkuZ` (measured when the rule shipped):

```
✖   Claude-Session names session_01K69KnEgGhRxs5YnwwG4V2U, but this commit comes from session_01K69KnCC1GwhF77rMwHPkuZ. Copy the trailer from this session's attribution reminder, not from another commit. [claude-session-is-this-session]
```

The same message with this session's trailer exits 0, and with the variable unset it exits 0.

**Similar instances:** [`the-friction-log-that-adopted-another-sessions-lines.md`](./the-friction-log-that-adopted-another-sessions-lines.md) mixed two sessions in the friction log. Its `recurs` note keeps the two classes apart.

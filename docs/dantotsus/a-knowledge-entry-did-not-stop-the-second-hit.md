---
date: 2026-08-20
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#64'
fix-commits: [de7a3458dc]
eradication-level: 4
eradication-paths: [scripts/hooks/checks/empty-checks-means-conflict.core.ts, scripts/check-knowledge-triggers.sh]
time-to-detect: hours
tags: [github-actions, ci, harness, hooks, self-improvement-loop]
zone: docs/knowledge
weak-point: prose-stands-in-for-a-check
---

# The entry that already said it, two days before it cost another hour

## User impact

A session on PR #64 pushed twice, an hour apart, and no workflow ran. It was not a failed run or a queued one. The checks list was empty:

```
mcp__github__pull_request_read method:get_check_runs   {"total_count": 0}
mcp__github__pull_request_read method:get_status       {"state":"pending","total_count":0}
```

| | Seen | Expected |
| --- | --- | --- |
| After each push | No checks, while other branches ran CI at the same minute | Either a CI run, or a sign that the pull request is conflicted |

The session looked for an outage, a usage limit, disabled workflows and a mismatched trigger before reading `mergeable_state` and finding `dirty`. `docs/knowledge/a-conflicted-pull-request-gets-no-checks.md` had said exactly this since 2026-08-18, after the same trap cost a session on PR #62.

## Causal chain

- Two pushes produced no CI run, and the session spent an hour on the wrong causes.
  - The pull request was conflicted, so GitHub could not build `refs/pull/<n>/merge` and started no workflow.
    - The session read `total_count: 0` as "nothing has happened yet". The tool it called returns a number, and the conflict banner appears only on the web page.
      - The entry that names `mergeable_state` was not in its context. Nothing printed it, and `docs/knowledge/` was reached only by search, whose search term is the answer.
        - The PR #62 sweep chose a knowledge entry as the eradication. It classified the trap as a vendor surprise, and the ladder of the time put knowledge at the floor with no means to deliver it (Method).

## Root cause of occurrence

*Thought writing the trap down in `docs/knowledge/` eradicates it. Actually a knowledge entry is a lookup, and the reader must already suspect the answer to look it up, so a trap whose symptom argues against its cause survives being documented.* (Method)

The eradication ladder of the time treated an untriggered knowledge entry as rung 5. ADR 2026-10-10T0122 later counted nine entries in the corpus that existed, were correct, and were not read when the trap hit again.

## Detection failure causes

- **CI:** the defect is the absence of CI, so CI cannot report it.
- **Code review:** the branch was reviewed five times. Every reviewer read files, and none reads the pull request's mergeability.
- **The first hook:** `posttool-empty-checks-means-conflict.sh`, shipped by this entry, printed its note to plain stdout. Claude Code sends plain stdout from a PostToolUse hook to the debug log, not to the model, so the note reached no agent until the 2026-10-10 audit.

## Countermeasure

Merge the base branch into the head, resolve, push. The checks came back on the next event.

## Eradication

**Type:** detection (level 4)

**Reference:** commit `de7a3458d` (PR #64) shipped the PostToolUse hook. The 2026-10-10 audit made it answer through `additionalContext`. 458e886c4 (PR #411) ported it to `scripts/hooks/checks/empty-checks-means-conflict.core.ts`, with its suite beside it.

The check matches `mcp__github__pull_request_read`, fires only when `total_count` is `0` on `get_check_runs` or `get_status`, and returns a `context` verdict that names the field that settles it:

```text
  mcp__github__pull_request_read method:get  ->  .mergeable_state
```

It asserts nothing, because a pull request can have no checks in its first seconds, and it never blocks a read. The sentence now reaches the agent at the tool result where the wrong conclusion forms.

The class fix shipped on 2026-10-10. ADR 2026-10-10T0122 makes every knowledge entry declare `triggers:`. `scripts/hooks/checks/knowledge-triggers.core.ts` prints the matching entry when a tool call matches, and `scripts/check-knowledge-triggers.sh` refuses an entry with no trigger. A triggered entry is what rung 5 means now. The update of 2026-10-10 also cited `check-hook-decisions.sh` for hooks that inform. That script was deleted in c54e32da7 (PR #224), and each check's own suite holds its verdicts today.

**Proof it can fail:** with the empty-total test changed to `total === 'never'` on a scratch copy, the suite failed (measured, then reverted):

```text
× names the conflict field when a checks read comes back empty
Tests  3 failed | 14 passed (17)
```

**Similar instances:** the 2026-10-10 audit found nine entries of the same class, all now carrying triggers. `grep -L "^triggers:" docs/knowledge/*.md` finds none today, and `check-knowledge-triggers.sh` refuses a new one.

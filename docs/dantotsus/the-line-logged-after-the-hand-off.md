---
date: 2026-11-24
introduced-at: conception
detected-at: local
severity: low
related-pr: '#401'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/kaizen/operator-messages.ts, scripts/kaizen/operator-messages.core.ts]
time-to-detect: hours
tags: [self-improvement-loop, harness, tooling]
zone: scripts/kaizen/operator-messages.ts
recurs: none (the first lost friction line traced to the hand-off prompt being the only carrier)
---

# The line logged after the hand-off

## User impact

The operator reads every sweep to learn what went wrong in a task. Two
pieces of a task's friction could reach no sweep.

| | Seen | Expected |
| --- | --- | --- |
| Hand-off of PR #401's sweep, 2026-11-24 10:48 | The prompt said "No line was logged after the archive". The shipping session logged one 10 s after it started this sweep: the `screens-shown` Stop hook had fired on a turn that compared no screens (measured, `session_01K69KnD2jCKy2sJwcF55YRY` events at 10:48:15 and 10:48:25). The line lived only in that container's `KAIZEN.md`. | Every logged line reaches the sweep |
| Sweep of PR #399, 2026-11-23 21:10 | Six of fifteen `list_events` pages were scanned by eye, because `operator-messages.ts` read only spilled pages (logged by `transcript-399`) | Every page is parsed |

This sweep found the first line only because one inline page it fetched by
hand happened to hold it.

## Causal chain

- A friction line logged after the archive reached no sweep, and an operator
  message on an inline page could be missed.
  - The hand-off prompt was the only carrier for a late line. Its author writes
    it before the session's last turns end, so a line logged during or after
    the hand-off has no carrier at all.
  - `operator-messages.ts` took saved files as arguments. A page under about
    50k characters stays inline and is never saved, so the script never saw it.
    - Both rest on one belief about where a session's record lives.

## Root cause of occurrence

*Thought a session's record lives in files someone saves for the sweep (the
archive, the pasted lines, the spilled pages). Actually the record already
exists twice without anyone saving it.* The shipping session's transcript holds
every `[kaizen] logged as` line as a tool result, archived or not. The
sweeping session's own transcript, `~/.claude/projects/*/$CLAUDE_CODE_SESSION_ID.jsonl`,
holds every page `list_events` returned, an inline one as the same text blocks
a spilled file holds (measured on this session: 5 spilled pages and 2 inline).

## Detection failure causes

- **Review:** nothing checks a hand-off prompt against what the session logged
  afterwards. The claim "No line was logged after the archive" is the
  author's, and nothing can verify it once the container is gone.
- **The script:** it printed nothing for a page it was never given, so a
  skipped page looked like a page with no operator message.

## Countermeasure

`operator-messages.ts` takes no argument now. It finds every `list_events`
result in this session's transcript, inline or spilled, and prints the
operator's messages and then every friction line the listed session logged.
The hand-off prompt no longer carries late lines, so `/open-pr`, `CLAUDE.md`
and `/after-task-kaizen` drop that step.

## Eradication

**Type:** structural impossibility (level 1). A late line and an inline page
are read from the record itself, so no author has a step to forget.

**Reference:** the commit adding this file.

```diff
-const pages = process.argv.slice(2);
+const transcripts = globSync([`*/${sessionId}.jsonl`, `*/${sessionId}/**/*.jsonl`], { cwd: projects });
+const pages = transcripts.flatMap((transcript) => listListedPages(...));
```

**Proof it can fail:** run on this session after the shipping session's pages
were listed, it printed the line no prompt carried:

```
[operator-messages] 7 list_events page(s) read, 2 of them inline
Friction the listed sessions logged, archived or not:
- logged as main: The screens-shown Stop hook fired on a turn that compared no screens, only transcript pages read by eye
```

The old script, given no argument, printed its usage and exited 1.

**Similar instances:** `grep -rn -i "logged after\|pasted verbatim" .claude/ CLAUDE.md`
found the paste step in `/open-pr`, `CLAUDE.md` and `/after-task-kaizen`. All
three are gone. The page-reading half is in
[`reading-another-sessions-transcript-with-list-events`](../knowledge/reading-another-sessions-transcript-with-list-events.md).


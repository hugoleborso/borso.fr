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

- PR #401's sweep started without the friction line the shipping session
  logged at 10:48:25, and PR #399's sweep scanned six of fifteen pages by eye.
  - Branch 1, the late line. The shipping session wrote its hand-off prompt at
    10:48:15. Then its `screens-shown` Stop hook fired and it logged one more
    line into its own `KAIZEN.md`.
    - The sweep read late lines only from the hand-off prompt. `/open-pr` and
      `CLAUDE.md` told the shipping session to paste "any line logged after
      the archive" into it.
      - Commit `c54e32da7` (PR #224) wrote that step, which made a pasted copy
        the carrier of late lines (measured, `git log -S'logged after the
        archive'`).
  - Branch 2, the inline page. The sweep listed the shipping session's user
    events with `kinds: ["user"]`. Pages under about 50k characters came back
    inline and were never saved to a file.
    - `operator-messages.ts` read only the files passed as arguments, so it
      never saw an inline page:

      ```ts
      const pages = process.argv.slice(2); // only pages someone saved
      ```

      - Commit `ba0557404` (PR #389, sub-commit "make the kaizen sweep read
        every operator message from the transcript") wrote that line. It told
        `/after-task-kaizen` to "Save each page and run
        `operator-messages.ts <page.json>...`".
        - Its input was the operator's request that the kaizen read all of
          their messages. The agent built it on the sweep's existing method,
          where every input reaches the sweep through a step done by hand.

## Root cause of occurrence

*Thought a session's record reaches the sweep through files someone saves or
pastes for it (the archive, the pasted late lines, the saved pages). Actually
the record already exists twice without anyone saving it.* (Method)

The shipping session's transcript holds every `[kaizen] logged as` line as a
tool result, archived or not. The sweeping session's own transcript,
`~/.claude/projects/*/$CLAUDE_CODE_SESSION_ID.jsonl`, holds every page
`list_events` returned, an inline one as the same text blocks a spilled file
holds (measured on this session: 5 spilled pages and 2 inline).

The tag is Method because the sweep's process fed it through steps done by
hand. Under the agentic rule the inline half also has a Man part. At
`ba0557404^`,
[`reading-another-sessions-transcript-with-list-events`](../knowledge/reading-another-sessions-transcript-with-list-events.md)
already said "A `kinds` filter makes pages small enough to land inline", and
its trigger matches `list_events` output. Whether it was printed in that
session is inferred, not read from its transcript. Removing the step holds
either way.

## Detection failure causes

- **Review:** the claim "No line was logged after the archive" is the
  author's own, written before the session's last turns. The container that
  could disprove it is reclaimed when the session ends.
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

**Reference:** commit `b2238b1a7` (PR #404), which added this file. The
script still reads the session transcript today (`scripts/kaizen/operator-messages.ts`, line 21).

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

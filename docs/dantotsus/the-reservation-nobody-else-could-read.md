---
date: 2026-10-12
introduced-at: conception
detected-at: review
severity: low
related-pr: '#118, #163, #167'
fix-commits: [self]
eradication-level: 1
eradication-paths: [.claude/skills/adr/SKILL.md, scripts/check-adr-numbers-resolve.sh, scripts/check-numbered-sequences.sh]
time-to-detect: hours
tags: [adr, git, agents, orchestrator, meta]
zone: docs/adr
recurs: [an-adr-number-goes-to-whoever-writes-it-first]
---

# The reservation nobody else could read

## User impact

The operator's pull requests carried renumbered ADRs, and every citation of
them had to move (measured in the session).

| | Seen | Expected |
| --- | --- | --- |
| ADR numbers on the coordinator's branches | 0028 taken by kaizen PR #167. The Sentry branch renumbered to 0031, and #118's three ADRs moved to 0032 to 0034 | Each branch keeps the id it wrote, and no citation moves |

Each move touched the file name, its heading and every citation. Only parallel
branches that each wrote an ADR were affected.

## Causal chain

- PR #167 merged ADR 0028, a number the coordinator had given to Sentry.
  - #167 took the highest number on its checkout plus one, which was correct
    from where it stood.
    - It never saw the reservation. The coordinator had reserved 0028 for
      Sentry, 0029 for weak point management and 0030 for knowledge triggers
      by message, readable only by the twelve agents in its conversation.
      - The coordinator reserved numbers because the `/adr` skill's numbering
        step picked the highest number in the local `docs/adr` plus one, and a
        local folder cannot see other branches (Machine).

## Root cause of occurrence

*Thought a reservation in the conversation keeps parallel branches apart,
actually only a pushed file is visible to every agent, and the allocation step
read only its own checkout.* (Machine)

A sequential id needs one place that knows the last value. The skill's
allocator had no such place, so any branch that did not share the
coordinator's conversation computed the same next number (inferred from the
skill's numbering step as this entry first described it).

## Detection failure causes

- **CI / pre-commit:** `check-numbered-sequences.sh` refuses two records with
  one number once both are in one tree. That is after the second author has
  written, cited and pushed.

## Countermeasure

The first fix, `next-adr-number.sh`, fetched every branch on origin and printed
one more than the highest ADR number on any of them. It printed `0035` on this
branch and named #118's branch as the holder of 0034 (measured). It was removed
in `c54e32da7` (PR #224), when the minute id below made it unnecessary.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** `c54e32da7` (PR #224) replaced the allocator. The records 0001
to 0052 were renamed to minute ids on 2026-11-11.

A new ADR is named after the UTC minute it was written,
`YYYY-MM-DDTHHMM-<slug>.md`. Parallel branches take different ids without
reading each other, so there is nothing left to allocate or reserve. Step 3 of
`.claude/skills/adr/SKILL.md` runs `date -u +%Y-%m-%dT%H%M`.
`check-adr-numbers-resolve.sh` refuses a file that does not start with a
minute, so a branch cannot fall back to a number.
`check-numbered-sequences.sh` refuses two records in the same minute. Both run
in `.husky/pre-commit` (lines 373 and 374).

> 3. **Pick the id.** Run `date -u +%Y-%m-%dT%H%M` and take what it prints,
> for example `2026-10-29T1405`.

**Proof it can fail:** `check-numbered-sequences.sh` lists a minute claimed by
two files, and `check-adr-numbers-resolve.sh` refuses a numbered file name
(read in their source this session, not planted).

**Similar instances:** migrations are the other sequence
`check-numbered-sequences.sh` covers. They are numbered per app, and no
coordinator has reserved one, so they keep plain numbers.

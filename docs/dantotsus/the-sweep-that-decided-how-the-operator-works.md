---
date: 2026-11-12
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#310'
fix-pr: none (the kaizen pull request of PR #310, number unknown when this was written)
fix-commits: [self]
eradication-level: 5
eradication-paths: [.claude/skills/after-task-kaizen/SKILL.md]
time-to-detect: hours
tags: [meta, self-improvement-loop, process, gates, hooks]
zone: .claude/skills/after-task-kaizen/SKILL.md
recurs: [the-interface-that-explained-itself, a-written-runtime-budget-nobody-enforced]
---

# The sweep that decided how the operator works

## User impact

The operator read PR #310 and refused four of its mechanisms. Each had been
built and proved before he heard of it. Removing them took two commits
(`522fc33`, `54b943d`) and two rounds of his explanations in the session
(measured, transcript of `session_01K69KnDzbVY3yxgGHEWuPgJ`, 01:38 and 02:09 UTC).

| Mechanism | Built | What the operator said | Seen | Expected |
| --- | --- | --- | --- | --- |
| A draft pull request opens without a technical-validation report | `feb9caa`, 00:56 | « je veux pas qu'un draft déploie sa preview » | Built, then explained | Asked first |
| The report is asked for at the merge | `94695d1`, 01:53 | « ça fait [...] tu rejoues plein de fois la CI » | Picked from a closed question, then refused | A question that showed the CI cost |
| A hook keeps a validator in the foreground | `feb9caa`, 00:56 | « il faut absolument que le validateur soit en arrière-plan » | Built, then refused | Asked first |
| pragma's and talos's test clock starts at 23:10 UTC | `f5552f1`, 01:25 | « il faut qu'il y ait des tests qui gèrent la time zone » | Built on a test #298 had already fixed | No-op |

## Causal chain

- The operator spent two rounds undoing four mechanisms he did not ask for.
  - The sweep built each one and presented it in the pull request.
    - Each was the highest rung the session could reach for its defect: two
      hooks, a moved gate and a structural clock.
      - `/after-task-kaizen` told it to push for the highest level and called
        knowledge "almost always wrong", and nothing in it said who decides a
        rung that changes the operator's day.
        - `CLAUDE.md` says to do reversible work, then present it, and sends
          only product and architecture decisions to the operator. A change
          to when he is asked, when CI runs or whether a session waits is
          neither, so it fell on the reversible side.

## Root cause of occurrence

*Thought a reversible meta change is the sweep's to build and present,
actually a change to how the operator works is his decision, like a product
call.*

`CLAUDE.md`, *Principles*, read this session: « Never block on the human. Do
reversible work, then present it. » and « Only product and architecture
decisions go to the operator. Decide the rest. » The skill, before this entry:
« Almost always wrong. Re-read the root cause and push for the highest level
you can reach. »

The clock is the plainest case of the push. #298 had fixed the test, and
the code's reading of the Paris day already had tests on both sides of the
boundary (measured by the merged session at 02:10 UTC). The defect cost
nothing more, so the right level was none.

## Detection failure causes

- **Skill:** nothing in `/after-task-kaizen` separated a rung on an agent's
  artefact from a rung on the operator's own loop.
- **Hook:** none can. The kept fixes and the refused gate edited the same file,
  `.claude/hooks/pretool-api-change-needs-validation.sh` (`54b943d` keeps two
  refusal lines there, `94695d1` was refused there). A path check flags both
  or neither (measured from `git show --stat`). The same is true of a new
  refusal: `e933719` added one to the ADR gate and was kept.
- **Corpus:** the pattern had been seen three times before, each recorded as a
  side note in another entry. #151 withdrew a key-name gate as « une usine à
  gaz » (`the-interface-that-explained-itself`). The runtime-budget work moved
  checks to pre-push and the operator refused (`a-written-runtime-budget-nobody-enforced`).
  #228 added a workflow he removed (the skill's own reframe). No entry named
  the class.

## Countermeasure

`54b943d` removed the three remaining mechanisms and kept what the operator
asked for. The draft route was already out (`522fc33`).

## Eradication

**Type:** knowledge (level 5). The rule lives in the skill where all four
mechanisms were born. No hook can tell the two kinds of change apart, as the
detection section measures.

**Reference:** this entry's commit, in the kaizen pull request of PR #310.

```diff
-  → Almost always wrong. Re-read the root cause and push for the
-  highest level you can reach. Knowledge is the *floor*, not the
-  default. [...]
+  → Check the rungs above it first. But a defect already fixed and
+  tested, or one that costs no one anything, is a no-op, not a new
+  gate. [...]
+   **A mechanism that changes how the operator works is his call.** That
+   is one that changes when he is asked for something, when CI or a
+   preview runs, or what a session waits for. Write its entry in
+   [`/dantotsu`](../dantotsu/SKILL.md)'s analysis mode, ask him one
+   closed question, and build only the option he picks.
```

The skill also loses two lines of pressure: « give it your all » in its
description and « invest accordingly » in its quality bar. Its hard rule now
says an entry waiting on the operator's question is not a follow-up.

It reuses `/dantotsu`'s analysis mode, which already writes an entry as a
proposal with options and stops. Nothing new is built.

**Proof it can fail:** none. A level-5 rule has no check to fail.

**Similar instances:** `grep -rli "operator re\(jected\|fused\)" docs/dantotsus`
finds the two entries in `recurs:` and `the-report-committed-before-its-author-finished`,
which is this sweep's own. Whether the rule belongs in `CLAUDE.md` for every
session, not only for sweeps, is put to the operator in the kaizen pull
request.

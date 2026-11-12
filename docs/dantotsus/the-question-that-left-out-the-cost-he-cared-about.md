---
date: 2026-11-12
introduced-at: conception
detected-at: review
severity: low
related-pr: '#310'
fix-pr: none (the kaizen pull request of PR #310, number unknown when this was written)
fix-commits: [self]
eradication-level: 5
eradication-paths: [CLAUDE.md]
time-to-detect: minutes
tags: [meta, process, self-improvement-loop]
zone: CLAUDE.md
recurs: none (the-sweep-that-decided-how-the-operator-works is about building before asking; this one is about what the question and the summary said once he was asked)
---

# The question that left out the cost he cared about

## User impact

The operator answered a closed question, then refused the option he had
picked once he saw it in practice. He then asked for the summary to be
explained again (measured, transcript of `session_01K69KnDzbVY3yxgGHEWuPgJ`).

| Moment | Seen | Expected |
| --- | --- | --- |
| 01:50 UTC, question « Quand le hook doit-il exiger le rapport ? » | Three options. The recommended one listed two costs: unreviewed API code on a preview, and a merge in GitHub meets no hook | The cost he refused it for: a pull request opened early runs CI again at every push |
| 02:02 UTC, summary | A table of « candidats » 1 to 7, a hook named `merge-strands-no-work`, a `-wip` branch, « round » | What each change does for him |
| 02:06 UTC | « Explique mieux ce que tu as fait s'il te plaît, là c'est pas clair du tout. » | No second explanation needed |

## Causal chain

- The operator picked an option, then refused it, and asked for the summary
  again.
  - Each option's description listed what the hook would gate, not what he
    would see happen.
    - The session wrote the costs from the mechanism's side. The CI rerun is
      a consequence of the pull request being open longer, outside the hook.
      - `CLAUDE.md` asked for « one concrete example », and the session gave
        one for the problem (#298), none for each option.
  - The summary used the numbers of the prompt's candidate list and the
    hook's file name, which only the session had read.

## Root cause of occurrence

*Thought a concrete example of the problem lets him judge the options,
actually he judges an option by what it changes in his day.*

`CLAUDE.md`, *Writing*, before this entry: « Ask one closed question at a
time, in the words the operator sees on the screen, with one concrete
example, its options and your recommendation. » The rule does not say what the
example illustrates.

## Detection failure causes

- **Hook:** none reads an `AskUserQuestion` call or a reply. A check on the
  words of an option cannot tell a mechanism's cost from the operator's.
- **Rule:** « Lead with impact » was in `CLAUDE.md`, and `/plain-writing`
  forbids invented shorthand. The summary broke both, and neither is read at
  the moment a reply is written.

## Countermeasure

The merged session rewrote the summary at 02:06 UTC, and removed the gate
the operator refused (`54b943d`).

## Eradication

**Type:** knowledge (level 5). The rule sits in the two lines of `CLAUDE.md`
every session loads, where the gap was.

**Reference:** this entry's commit, in the kaizen pull request of PR #310.

```diff
-- Lead with impact. Say who the work is for and what changes for them, then what the next maintainer inherits.
+- Lead with impact. Say who the work is for and what changes for them, then what the next maintainer inherits. Name each change by what it does, never by a number or label from your own working list.
-- Ask one closed question at a time, [...] with one concrete example, its options and your recommendation.
+- Ask one closed question at a time, [...] with one concrete example, its options and your recommendation. Each option says what he would see happen day to day once it ships, such as CI running again at every push.
```

**Proof it can fail:** none. A level-5 rule has no check to fail.

**Similar instances:** `grep -rli "pas clair\|explain.* again\|own labels" docs/dantotsus docs/knowledge`
printed nothing. This is the first recorded case.

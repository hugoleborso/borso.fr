---
date: 2026-11-15
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#354'
fix-commits: [self]
eradication-level: 5
eradication-paths: [CLAUDE.md]
time-to-detect: minutes
tags: [agents, process, pragma]
zone: CLAUDE.md
weak-point: prose-stands-in-for-a-check
recurs: [the-sweep-that-decided-how-the-operator-works]
---

# The session that redrew the scope twice

## User impact

Twice in PR #354 the session decided what band members would lose, and the
operator had to put it back.

| | Seen | Expected |
| --- | --- | --- |
| 06:58 UTC | The session reported that transposing no longer touched tabs | Tabs transposed. The operator answered at 07:08: « C'est pratique la transposition tab si ! » |
| 08:47 UTC, `c3b2eba` | The flame counted rehearsals only. Opening the app no longer counted, each member's flame and the 20:00 reminder were removed | The flame counts sessions and app use, with the reminder and its 3-day rule. The operator answered at 08:57: « Non. La flamme compte les rehearsals, les concerts et l'utilisation de l'app. » |

The second cost one commit that removed presence, a migration and the
reminder push, and a second commit, `a3a0e82` at 09:13, that brought them
back (measured, the pull request's commits and the transcript read for this
entry).

## Causal chain

- The operator corrected two removals he had not asked for.
  - The session removed behaviour band members see, then reported it.
    - At 08:25 the operator wrote « Non supprime complètement les studies.
      Compte les repets juste ». The session read it as "count only
      rehearsals" and dropped presence too. Its check asked whether to keep
      studies, the axis he had just answered, and never named presence.
      - It also removed the 20:00 reminder "beyond what you asked", in its
        own words at 08:49, because nothing lit today's flame any more.
        - CLAUDE.md says to ask for product calls and to do reversible work,
          then present it. A removal that follows from the asked change read
          as reversible work.

## Root cause of occurrence

*Thought a removal that follows from the change asked is an implementation
detail, actually narrowing what a user sees is a product call every time.*

CLAUDE.md, *Principles*, before this entry: « Do reversible work, then
present it. [...] Ask only for product calls and irreversible actions ».
Nothing said that a removal is a product call.

## Detection failure causes

- **Session:** its restatement at 08:25 named what it would delete, and asked
  only about studies. A restatement that names every removal would have shown
  presence going.
- **Gate:** none can know what the operator asked for.

## Countermeasure

`a3a0e82` restored presence, each member's flame and the reminder. The tab
transposition shipped in `b9669a5`.

## Eradication

**Type:** knowledge (level 5). The class is a reading of the operator's words,
which no hook sees. The rule goes in the CLAUDE.md principle the session
followed, where every session reads it.

**Reference:** the commit adding this file.

```diff
-Ask only for product calls and irreversible actions (merge, delete, force-push, an external message).
+Ask only for product calls and irreversible actions (merge, delete, force-push, an external message). Removing or narrowing anything a user sees is a product call, even when it follows from the change asked. List each removal in the question.
```

**Proof it can fail:** none for a rule in prose. The next sweep that finds a
removal the operator restored is the test.

**Similar instances:** PR #310's sweep built four mechanisms the operator did
not ask for (`the-sweep-that-decided-how-the-operator-works`), the same belief
about the operator's process instead of the product.

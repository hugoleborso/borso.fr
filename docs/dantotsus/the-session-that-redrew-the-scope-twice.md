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
        - CLAUDE.md said to ask for product calls and to do reversible work,
          then present it. A removal that follows from the asked change read
          as reversible work.
          - **Method:** the one step that made the session list each removal
            came after the work. `c3b2eba`'s message carries "Removed, with
            the property each drops", naming presence, study rows and "The
            20:00 streak reminder push" (measured, `git show c3b2eba`). The
            inventory existed and reached the operator as a commit, not as a
            question.

## Root cause of occurrence

*Thought a removal that follows from the change asked is an implementation
detail, actually narrowing what a user sees is a product call every time.*
**Method:** the standard the session followed did not classify removals.

CLAUDE.md, *Principles*, before this entry: « Do reversible work, then
present it. [...] Ask only for product calls and irreversible actions ».
Nothing said that a removal is a product call. The commit-message habit of
listing "the property each drops" then put the inventory after the act.

## Detection failure causes

- **Session:** its restatement at 08:25 named what it would delete, and asked
  only about studies. A restatement that names every removal would have shown
  presence going.
- **Commit hook:** `.husky/commit-msg` runs only commitlint. `c3b2eba`
  deleted 25 lines from each of `apps/pragma/site/src/i18n/en.json` and
  `fr.json` (measured, `git show c3b2eba --stat`), and nothing looks at a
  commit that removes visible text.

## Countermeasure

`a3a0e82` restored presence, each member's flame and the reminder. The tab
transposition shipped in `b9669a5`.

## Eradication

**Type:** knowledge (level 5). The rule sits in the CLAUDE.md principle the
session followed, where every session reads it. What holds today is wider
than this entry's first diff. CLAUDE.md now reads « Removing, narrowing or
adding anything a user sees beyond the ask is a product call, even when it
follows from the change asked. List each one in the question. »

**Reference:** the commit adding this file.

```diff
-Ask only for product calls and irreversible actions (merge, delete, force-push, an external message).
+Ask only for product calls and irreversible actions (merge, delete, force-push, an external message). Removing or narrowing anything a user sees is a product call, even when it follows from the change asked. List each removal in the question.
```

Level 5 is a written instruction, the weakest rung. The reading of the
operator's words is invisible to a hook. Its result is not. A removal a user
sees leaves removed keys in an app's `site/src/i18n/en.json`.

**Proposed:** a check in `.husky/commit-msg` that compares the staged
`apps/*/site/src/i18n/en.json` with `HEAD` and refuses a commit that removes
a key unless the message carries a trailer quoting the operator's go-ahead,
such as `Removal-approved: « Non supprime complètement les studies »`. The
inventory `c3b2eba` wrote after the fact would then have to exist, with the
operator's words, before the commit lands. A removal with no quote becomes
impossible to commit. It would miss a removal that keeps its strings, such as
a push schedule, so it narrows the class rather than closing it.

**Proof it can fail:** none for the rule in prose. The proposed check would
be proven by staging `c3b2eba`'s `en.json` change and watching the commit be
refused.

**Similar instances:** PR #310's sweep built four mechanisms the operator did
not ask for (`the-sweep-that-decided-how-the-operator-works`), the same belief
about the operator's process instead of the product.

---
date: 2026-10-10
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#151'
fix-pr: '#154'
fix-commits: [eb092d9, d26622c]
eradication-level: 2
time-to-detect: hours
tags: [pragma, frontend, i18n, standards]
---

# The interface that explained itself

## Symptom

During the UX pass of PR #151 the operator corrected the same habit three
times: a page subtitle saying what the page is for, a create button labelled
« New song » instead of a `+`, a quick-add placeholder spelling out the
procedure. « Une UI qui explique ce qu'elle fait c'est un smell d'une mauvaise
UI. »

## Root-cause chain

1. **Why did each screen gain a sentence?** A sentence is the cheapest way to
   make a control understood, and it costs nothing in a review of one screen.
2. **Why did the rule not stop it?** There was no rule until `eb092d9` wrote
   one into standard 05, and that rule was a `reviewer` bullet: it held only
   when someone read for it.
3. **Why was it not caught by a gate?** Nothing reads message keys. The text
   lives in `en.json`, and its key name (`uploadHint`, `subtitle`,
   `recoverIntro`) already says what kind of text it is.

**Root cause:** we thought explanatory text could only be judged by reading
the screen, and actually its message key names it, so a script can list every
one.

## Detection failure causes

- **Linter:** no rule reads `en.json`.
- **Code review:** the reviewer bullet arrived with the corrections, after
  the text was written.
- **Visual validation:** a sentence renders correctly; it fails no assertion.

## Countermeasure

- **Code:** commit `eb092d9` (PR #151) removed the subtitles and hints that
  described the interface and added the standard 05 section.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-commit and CI script)

**Reference:** [PR #154](https://github.com/hugoleborso/borso.fr/pull/154) · commit `d26622c`

**The actual fix:**

```diff
+- `script:scripts/standards/check-explanatory-copy.ts` fails on a message key
+  named like an explanation (a hint, a subtitle, an intro, a description) that
+  `docs/standards/explanatory-copy-exceptions.json` does not list with a
+  reason, and on an exception whose key is gone.
```

A new `*Hint` or `*subtitle` key now needs a written reason before it can be
committed. Pragma's nine survivors carry theirs: a template's placeholder
syntax, an upload's accepted formats, a gesture with no visible affordance.
The seventeen keys of the other apps are listed as not yet reviewed.

**Limits:** a sentence filed under a neutral key (`members.title`) passes. The
reviewer bullet stays for that, and for button labels.

**Sibling defects swept:** `members.masteryMatrixSubtitle` is a paragraph of
instructions that survived the pass. It stays as an exception marked as a
redesign candidate, because removing it is a product decision.

## See also

- [`../standards/05-frontend-architecture.md`](../standards/05-frontend-architecture.md)

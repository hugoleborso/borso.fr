---
date: 2026-10-10
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#151'
fix-pr: '#154'
fix-commits: [eb092d9]
eradication-level: 5
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

**Type:** knowledge addition (level 5 — a written rule with a reviewer bullet)

**Reference:** [PR #151](https://github.com/hugoleborso/borso.fr/pull/151) · commit `eb092d9`

**The actual fix:** standard 05 gained « The interface does not explain
itself », with a `reviewer` bullet so `/standards-review` asks for it on every
screen change.

**A gate was tried and withdrawn.** `d26622c` added a script failing on any
message key named like an explanation (`*Hint`, `*subtitle`, `*Intro`) unless
a JSON file listed it with a reason. The operator rejected it the same day as
« une usine à gaz »: it depends on a list of key names, which a sentence filed
under any other name walks past, and it asks for a second file to be kept in
step with the messages. It was removed before merge. The rule stays a
reviewer's call.

**Sibling defects swept:** `mastery.subtitle` and `scaffold.subtitle`, two
messages nothing rendered, were removed in `d26622c` and stay removed.
`members.masteryMatrixSubtitle` is a paragraph of instructions that survived
the pass; removing it is a product decision.

## See also

- [`../standards/05-frontend-architecture.md`](../standards/05-frontend-architecture.md)

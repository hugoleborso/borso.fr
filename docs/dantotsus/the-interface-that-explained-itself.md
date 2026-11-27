---
date: 2026-10-10
introduced-at: implementation
detected-at: review
severity: low
related-pr: '#151'
fix-commits: [67bab828]
eradication-level: 5
time-to-detect: hours
tags: [pragma, frontend, i18n, standards]
eradication-paths: [docs/standards/05-frontend-architecture.md, .claude/agents/technical-validator.md]
zone: apps/pragma/site/src
recurs: none (screen copy that explains the interface, not a layout or audit defect)
---

# The interface that explained itself

## User impact

Pragma's band members read the same screens every day. During the UX pass of
PR #151 the operator corrected the same habit three times (measured, in that
review).

| | Seen | Expected |
| --- | --- | --- |
| A page header | a subtitle saying what the page is for | the title alone, or a subtitle carrying data |
| The create action | a button labelled « New song » | a round `+` button |
| The quick-add field | a placeholder spelling out the procedure | a placeholder naming the thing |

« Une UI qui explique ce qu'elle fait c'est un smell d'une mauvaise UI. »

## Causal chain

- The operator corrected three screens for explaining themselves.
  - Each screen rendered a sentence about itself from `en.json`. Before
    #151 the catalogue held, among others
    (`git show 67bab8288^:apps/pragma/site/src/i18n/en.json`):

    ```json
    "subtitle": "What the band wants changed in this application. The most voted idea is at the top.",
    ```

    - Agents wrote these sentences screen by screen, as each feature
      shipped. That one came with the improvement backlog, commit
      `180c05d4b` on 2026-09-15.
      - The operator's rule against explanatory text existed in no document
        those agents read. `git grep -i "explain\|subtitle" 180c05d4b^ -- docs/standards/05-frontend-architecture.md`
        prints nothing (measured). With no rule in context, the agents'
        default of helpful copy filled the gap. (Material)

## Root cause of occurrence

*Thought a sentence on the screen is the cheapest way to make a control
understood, actually a control that needs a sentence is the wrong control,
and the sentence costs the member a line of reading every day.* (Material)

The rule came from the operator and was written down only in #151.
`docs/standards/05-frontend-architecture.md`, read this session: "When a
control needs a sentence to be understood, change the control." Had the
writing agents had that line, they would have drawn a `+` and dropped the
subtitle.

## Detection failure causes

- **Lint:** no rule reads `en.json` for the kind of text a key holds.
- **Review:** no reviewer bullet asked for it until #151 wrote one.
- **Visual validation:** a sentence renders correctly, so it fails no
  assertion of a spec.

## Countermeasure

PR #151, squashed as `67bab8288`, removed the subtitles and hints that
described the interface and added the section « The interface does not
explain itself » to standard 05.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commit `67bab8288` (PR #151).

Standard 05 holds the rule and a `reviewer` bullet: "`reviewer` checks that no
new page subtitle, field hint or button label" explains the screen. The one
review agent left after PR #224, `.claude/agents/technical-validator.md`, reads
every `reviewer` bullet of `docs/standards/` against each changed source file.
The rule therefore reaches the branch at review, after the text is written.

A gate was tried and withdrawn. A branch commit of #151 added a script failing
on any message key named like an explanation (`*Hint`, `*subtitle`, `*Intro`)
unless a JSON file listed it with a reason. The operator rejected it the same
day as « une usine à gaz »: a sentence filed under another key walks past it,
and the list is a second file kept in step by hand. A lint rule cannot judge
whether a sentence explains the screen, so no rung above 5 holds this.

**Similar instances:** `mastery.subtitle` and `scaffold.subtitle`, two
messages nothing rendered, were removed in #151.
`members.masteryMatrixSubtitle` survived the pass, and
`grep -rn masteryMatrixSubtitle apps/pragma/site/src` finds nothing today
(measured).

**Proposed:** deliver the rule at the moment the copy is written, not at
review. A file under `docs/knowledge/` whose `triggers: paths:` names
`apps/*/site/src/i18n/en.json` would be printed by the knowledge-triggers hook
on every write to a catalogue, so the writing agent has the rule in context
before the sentence exists. It stays level 5, with no key-name list for anyone
to keep.

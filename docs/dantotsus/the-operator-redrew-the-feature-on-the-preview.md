---
date: 2026-11-14
introduced-at: conception
detected-at: qa
severity: medium
related-pr: '#327'
fix-pr: none (proposal under review)
fix-commits: none (proposal under review)
eradication-level: 5
eradication-paths: []
time-to-detect: hours
tags: [spec, skill, pragma, preview, process]
zone: .claude/skills/specification
recurs: none (docs/knowledge/a-spec-bullet-that-leans-on-what-the-code-already-does.md names the same belief for PR #300, as knowledge; no dantotsu holds it yet)
---

# The operator redrew the feature the first time he could touch it

> Status: proposal. The eradication waits on the operator's answer to the
> question at the end of *Countermeasure*.

## User impact

PR #327 opened its preview at 23:19 on 2026-11-13 with a spec every
perspective had ticked. The operator opened it and changed two product
decisions the spec had taken (measured, the spec's *Questions, Options and
Decisions* rows dated "operator, on the preview, 2026-11-13", commit
`abee2077e`).

| | Spec as ratified | What the operator asked on the preview |
| --- | --- | --- |
| What is a composition | A song with `origin = original`, so the compositions screen lists original songs | Its own record, which becomes a song only through **Add to catalogue** |
| Where an inspiration is created | The library page only | Also from a lane's add-clip sheet, landing on that lane |

The rework was six of the PR's eighteen commits, from `abee2077e` at 23:37 to
`5cec41564` at 01:01 (measured, `get_commits`). It added a third technical
validation report, a second visual validation that failed two rows, and
migration 0027, which recreated `sketch_lane` on `composition_id` because 0026
had already run on the preview. That wiped the preview's test lanes (measured,
the PR's *Decisions* table).

## Causal chain

- The operator saw a compositions screen that listed "Avignon Nice", a song
  written outside pragma, and could not start a sketch without a catalogue
  song.
  - The spec defined a composition as a song with `origin = original`.
    - The existing `/compos` screen already read songs with
      `origin = original`, and the spec extended that reading instead of
      asking what a composition is (inferred from the first spec,
      `d3e444556`, whose *Gemba* section read the screen and asked no
      question about the record).
- The operator wanted to capture a passage while sketching.
  - The spec's happy path created inspirations on the library page and only
    consumed them in the sketch.
    - No question in the spec walked the journey from the screen the member
      is on when the idea comes (inferred, the spec's question list before
      `abee2077e` holds no row on where an inspiration is created).

## Root cause of occurrence

*Thought the existing screen's data model was the operator's model of a
composition; actually it was the shortcut an earlier feature took, and he
had never been asked.*

The second spec says it plainly. "The band's own song 'Avignon Nice' sits in
the catalogue as `origin = cover`. The operator says it was written outside
pragma and does not belong on the compositions screen. A song is created when
a composition is finished, never before." (spec, *Gemba, second pass*). The
first pass of Gemba looked at the screen and the table, not at the operator.

This is the belief `docs/knowledge/a-spec-bullet-that-leans-on-what-the-code-already-does.md`
names for PR #300: a sentence about today ("the compositions screen lists
original songs") taken as a product decision. That entry is level 5, and it
fired on `spec.md` here too. It did not stop the second occurrence.

## Detection failure causes

- **Specification:** the five perspective boxes were ticked. The designer box
  recorded a timeline choice, which the operator did make. No row asked what
  the new entity is, or where each entity is created from, so step 12's
  re-read had nothing to contradict.
- **Knowledge hook:** printed on writing `spec.md`, where it reads as advice
  among others. A summary is not a question the operator answers.
- **Validation:** technical and visual validation check the code against the
  spec. A spec the operator would not ratify passes both, as it did twice
  (round 2 PASS at 22:59, visual PASS_EXCEPT_UNVERIFIABLE at 23:18).
- **Preview:** it caught both points, at the cost of the rework. It is the
  first moment the operator touches the screens.

## Countermeasure

Three options. Each changes when the operator is asked something, so the
choice is his.

| Option | What he sees day to day | Cost |
| --- | --- | --- |
| A. Entity questions are mandatory. `/specification` refuses to tick the product box until each entity in *Changes* that the feature adds or redefines has a closed question "is X its own record, or a Y?" with his answer, and each has a row "where is X created from?" | Two or three more closed questions per feature spec, asked before planning | A rule in the skill and a check in its spec template. Catches the composition question. Catches the inspiration question only if "created from" is asked per screen |
| B. Clickable screens before the plan. The spec session publishes a static, private artifact of the new screens with fake data, and he taps through it before ratifying | One link per feature spec to open on his phone before the plan starts | A prototype per feature. Catches both questions, because both came from touching the screens |
| C. Keep the preview as the prototype | Nothing changes | A revision like this one when the spec misses. Here, six commits, two extra validation passes and a migration |

**Recommendation:** A. Both reshapes were about the identity and origin of a
record, which a closed question settles. B is the stronger catch but adds a
deliverable to every spec.

**Closed question for the operator.** When a feature adds a record such as a
composition, should the spec session ask you, before planning, "is a
composition its own record or a song?" and "where is it created from?"

- A: yes, two to three such questions per spec (recommended).
- B: no, send me a clickable mock of the screens to tap through instead.
- C: no, keep finding it on the preview.

## Eradication

**Type:** knowledge (level 5), until the operator picks an option.

**Reference:** proposal, no commit yet.

**Proof it can fail:** not applicable to a proposal. Option A's check will be
proved by running it on the first spec of PR #327 (`d3e444556`), which must
be refused for its missing composition row.

**Similar instances:** `grep -l 'on the preview' docs/features/*/*/spec/spec.md`
lists the specs whose decisions the operator changed on a preview.

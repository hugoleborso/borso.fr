---
name: specification
description: Draft a feature specification that surfaces misalignments, confronts perspectives, and reveals inconsistencies before any code is written. Use when the user says they want to "spec", "write a spec", "kick off a feature", "discovery", "design a feature", or otherwise signals they are starting non-trivial work that has not yet been broken down. Skip for trivial bug fixes, isolated refactors, or work the user has already scoped.
---

# Specification skill

The specification is **not a description of what to build**. It is a working document used to surface misalignments, confront PM/tech perspectives, and reveal inconsistencies *before* implementation. Treating it as a hand-off document is the failure mode this skill exists to prevent.

The canonical standard this skill enforces lives at [`standard.md`](./standard.md) (in this skill's folder). When the standard and this SKILL.md disagree, the standard wins — open `standard.md` and re-read it before drafting. Edit `standard.md` when the underlying standard evolves; edit this file when the *enforcement* of it evolves.

## How this phase works

A spec is **a conversation, not a writing task**. Drive it with the `AskUserQuestion` tool — one focused question at a time, with concrete options where helpful. Do not silently fill in assumptions; if you are tempted to guess, ask instead. The whole point of this phase is to surface misalignments through dialogue, and that only happens if the user is actually answering questions.

Suggested cadence: ask, capture the answer in the draft, ask the next question, capture, repeat. Batch only when the questions are genuinely independent.

## Tech and product perspectives — both, in the same conversation

The spec must confront the **product** perspective (why, value, use cases, results, monitoring) **and** the **tech** perspective (data sources, components, implementation sequence, risks). The standard's #1 named failure is partitioning these into separate phases.

In this repo a single human often wears both hats. That is fine — explicitly switch hats with the user ("putting on the tech-lead hat now…") so each angle gets its own pass. Do not skip an angle just because the same person provides both.

If you finish the conversation having only meaningfully covered one side, **flag the spec at the top** with one of:

- `> ⚠️ Missing tech discussion` — product side covered, tech perspective not yet challenged.
- `> ⚠️ Missing product discussion` — tech side covered, product/value perspective not yet challenged.

The flag stays in the file until the missing pass happens. A flagged spec is not ready for implementation; call this out when the user tries to move on.

## When to invoke

Invoke this skill when the user signals the **start** of a feature: "I want to work on…", "let's spec…", "before we code…", "kick off…". Do **not** invoke for already-scoped tickets, mechanical refactors, dependency bumps, or one-line fixes — the ceremony costs more than the value there.

If unsure, ask one question: "Is this feature already scoped, or do you want to spec it first?" Then act on the answer.

## Deliverable

Produce a single markdown file at `docs/specs/<feature-slug>.md`. One file per feature, kebab-case slug derived from the feature's user-visible outcome (not the technical mechanism). The spec is **short by design** — if it grows past ~2 pages of prose, the team can no longer iterate on it. Cut, don't append.

## Required sections

Every spec must have these top-level sections, in this order. Empty sections are a smell — either fill them or justify the gap inline.

```markdown
# <Feature title — phrased as the user-visible outcome>

<!-- If only one perspective has been covered so far, leave one of these blockquotes at the top:
> ⚠️ Missing tech discussion
> ⚠️ Missing product discussion
Remove the line once both perspectives have been challenged. -->

## Why
- Business / customer / user value, in one paragraph.
- The measurable objective: revenue / quality / lead time / productivity. Pick one. A wish-list of four objectives means none of them.
- Link to any field observation (Gemba) that validates the *problem* exists, not just that the solution is wanted.

## Use cases
- The happy-path end-to-end journey, as a numbered list of user-visible steps.
- Edge cases and error cases, each one a bullet. If a use case is not listed here, it does not exist for this iteration.

## Results
- What changes for the user once shipped. Before / after.
- Mockups, screens, workflows. Link to Figma if it exists; embed ASCII or a screenshot otherwise. "No visible result" is a red flag — name it.

## Changes
- **Business model:** entities, relationships, shared vocabulary.
- **Data sources:** APIs / databases / files / external services. Verify availability *before* committing to the design.
- **Components:** 2–3 technical alternatives with a justified choice. Premature single-option lock-in is the failure mode.
- **Implementation sequence:** order of deployment, technical risks, critical dependencies.

## Questions / Options / Decisions
- Open questions, the options considered, and the decision taken (with date). This is the ADR-equivalent for the spec. Keep decisions even after they are resolved — future-you will need the reasoning.

## Monitoring
- **Analytics:** which events, which thresholds define success.
- **Zero-defect strategy:** which error cases trigger which alerts. The real feature is the one used in production; if you cannot see it, you cannot fix it.
```

## Operating mode

Walk the user through these 13 steps, in order. Do not skip ahead — each step exists because the next one is unsafe without it.

| # | Step | Section | Why this step exists |
| --- | --- | --- | --- |
| 1 | Work *back* from the solution to the problem | Why | Stakeholders arrive with a solution. Reverse-engineering the problem is faster than asking for it cold. |
| 2 | Observe the work in the field (Gemba) | Why | Prevents a solution in search of a problem. Watch the current behaviour with all its constraints before changing it. |
| 3 | Clarify the expected value | Why / Results | One measurable objective. Refuse a wish-list. |
| 4 | Map the target behaviour | Use cases | End-to-end happy path so inconsistencies are visible at a glance. |
| 5 | Conduct research (external + internal) | Why | Industry standards + Theodo blueprints / `docs/`. Reduces test-and-learn. |
| 6 | Collect use cases | Use cases | Normal + edge + error. Anything missing here will break in production. |
| 7 | Define the business model | Changes | Entities, relationships, shared vocabulary. Stabilises business/tech terminology. |
| 8 | Identify data sources | Changes | Verify required data actually exists before designing around it. |
| 9 | Define the interface | Results | Mockups, screens, before/after. Forces a visible result. |
| 10 | Make component choices | Changes / Q.O.D. | 2–3 alternatives, justified pick. Avoids premature constraints. |
| 11 | Identify key implementation points | Changes / Q.O.D. | Sequence, risks, critical dependencies. |
| 12 | Identify inconsistencies in the spec | Q.O.D. | Re-read the whole document looking for problem/solution misalignment. This is the step the skill exists for. |
| 13 | Identify how to iterate in production | Monitoring | Analytics + alerting. The real feature is the one used in production. |

After the draft is written, **do step 12 explicitly**: re-read the spec with the user and call out misalignments. This is non-negotiable — skipping it converts the spec into a hand-off document, which is the failure mode the standard exists to prevent.

## Failure modes to avoid

These are the common mistakes the standard names. Push back on them in real time when you see them.

- **"PM does discovery, tech-lead does the tech part."** The spec is the place where both perspectives confront each other. Do not partition it. If you can only get one side in this conversation, flag the spec with `> ⚠️ Missing tech discussion` or `> ⚠️ Missing product discussion` and refuse to call it ready.
- **"I'm writing this because the team asked for it."** Bureaucratic specs hide reasoning. If the *why* of a section is not in the section, delete the section or fix it.
- **"My vision only."** Ask the user what they have *not* considered. Pull from `docs/` and existing app blueprints before inventing.
- **"Forgot to link the ADR / Figma / blueprint / BPMN."** Three months from now, missing links force archaeology. Always link.
- **"The spec is too long."** Iteration becomes impossible. Cut. Two pages of prose is the soft ceiling.
- **"Adoption is someone else's problem."** Without analytics + alerting, the spec is incomplete. Step 13 is not optional.

## Repo-specific notes

- Specs live at `docs/specs/<slug>.md`. Create the folder if it does not exist.
- Slugs map to apps when relevant: prefix with the app slug (`borso-fr-`, `borsouvertures-`, `infra-`) so commitlint scopes line up trivially.
- Architectural decisions that survive past the spec belong in their own ADR under `docs/adr/` — reference them from the spec's *Questions / Options / Decisions* section, do not duplicate.
- For infra changes (`infra/cdk/**`, `infra/shared/**`), the *Changes* section must call out the test-coverage impact — those packages are coverage-gated.

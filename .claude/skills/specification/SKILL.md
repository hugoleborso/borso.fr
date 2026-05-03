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

## Perspectives to confront — five, not two

The standard names five perspectives that must look at the spec from their angle: **client / business**, **product**, **tech-lead**, **developer**, **designer**. The #1 named failure mode is partitioning these (e.g. PM does discovery, tech-lead does the tech part). The spec is the document where they confront each other.

In this single-developer repo one human wears several hats. That is fine — switch hats out loud with the user ("putting on the tech-lead hat now…", "looking at this from a designer angle…") so each perspective gets its own pass. Do not skip a perspective just because the same person provides several.

The two perspectives that get skipped most often, and that this skill must enforce, are **product** (why / value / use cases / production strategy) and **tech** (changes / data sources / sequencing / risks). If the conversation only covered one side meaningfully, **flag the spec at the top** with one of:

- `> ⚠️ Missing tech discussion` — product side covered, tech perspective not yet challenged.
- `> ⚠️ Missing product discussion` — tech side covered, product/value perspective not yet challenged.

Use the same blockquote pattern (`> ⚠️ Missing <perspective> discussion`) for designer / client / developer perspectives when relevant. The flag stays in the file until the missing pass happens. A flagged spec is not ready for implementation; call this out when the user tries to move on.

## When to invoke

Invoke this skill when the user signals the **start** of a feature: "I want to work on…", "let's spec…", "before we code…", "kick off…". Do **not** invoke for already-scoped tickets, mechanical refactors, dependency bumps, or one-line fixes — the ceremony costs more than the value there.

If unsure, ask one question: "Is this feature already scoped, or do you want to spec it first?" Then act on the answer.

## Deliverable

Produce a single markdown file at `docs/specs/<feature-slug>.md`. One file per feature, kebab-case slug derived from the feature's user-visible outcome (not the technical mechanism). The spec is **short by design** — if it grows past ~2 pages of prose, the team can no longer iterate on it. Cut, don't append.

## Required sections

Every spec must have these top-level sections, in this order. Empty sections are a smell — either fill them or justify the gap inline.

Section names match the canonical template kept locally at [`template.md`](./template.md), so that local specs and external Theodo Academy specs read the same. Copy that file into `docs/specs/<slug>.md` to start a new spec.

```markdown
# <Feature title — phrased as the user-visible outcome>

<!-- If a perspective has not yet been challenged, leave one of these blockquotes at the top:
> ⚠️ Missing tech discussion
> ⚠️ Missing product discussion
> ⚠️ Missing designer discussion
Remove the line once that perspective has been covered. -->

## Why
- Business / customer / user value, in one paragraph.
- One measurable objective: revenue / quality / lead time / productivity. A wish-list of four objectives means none of them.
- Link any field observation (Gemba) that validates the *problem* exists, not just that the solution is wanted.

## Result
- The final, visible result: Figma / wireframes / API endpoints / dashboard / before-and-after screens.
- "No visible result" is a red flag — name it.

## Use cases / edge cases
- Visual first: BPMN, sequence diagram, or domain model. Plain text only when a visual is genuinely overkill.
- Numbered happy path + bulleted edge cases + bulleted error cases. If a case is not listed here, it does not exist for this iteration.

## Questions, Options and Decisions
- Each hard point: the question, 2–3 options with trade-offs, and the decision taken (with date). ADR-equivalent. Keep resolved decisions — future-you needs the reasoning.
- Link out to full ADRs / blueprints / POCs when they exist; do not duplicate.
- Include what is explicitly **out of scope**.

## Changes
- **Types / domain model** (DDD): entities, value objects, relationships, shared vocabulary.
- **Database changes**: migrations, new columns, indexes.
- **Files to change**: backend + frontend, each path called out, marked NEW / UPDATE.
- **Test strategy**: what gives you confidence the feature works without defects.

## Production strategy
- **Analytics**: named events, p50/p75/p90 thresholds where relevant, success criteria.
- **Zero-defect strategy**: named error classes, when they fire, alerting thresholds (e.g. Sentry tags + N occurrences in M minutes).
```

For tone and depth, mirror the worked example at [`worked-example.md`](./worked-example.md) ("As a commuter, I want to see the waiting time for a new ride").

## Operating mode

Walk the user through these 13 steps, in order. Do not skip ahead — each step exists because the next one is unsafe without it.

| # | Step | Section | Why this step exists |
| --- | --- | --- | --- |
| 1 | Work *back* from the solution to the problem | Why | Stakeholders arrive with a solution. Reverse-engineering the problem is faster than asking for it cold. |
| 2 | Observe the work in the field (Gemba) | Why | Prevents a solution in search of a problem. Watch the current behaviour with all its constraints before changing it. |
| 3 | Clarify the expected value | Why / Result | One measurable objective. Refuse a wish-list. |
| 4 | Map the target behaviour | Use cases / edge cases | End-to-end happy path so inconsistencies are visible at a glance. |
| 5 | Conduct research (external + internal) | Why | Industry standards + repo `docs/` + any internal blueprint material the user can share. Reduces test-and-learn. |
| 6 | Collect use cases | Use cases / edge cases | Normal + edge + error. Anything missing here will break in production. |
| 7 | Define the business model | Changes | Entities, relationships, shared vocabulary (DDD). Stabilises business/tech terminology. |
| 8 | Identify data sources | Changes | Verify required data actually exists before designing around it. |
| 9 | Define the interface | Result | Mockups, screens, before/after. Forces a visible result. |
| 10 | Make component choices | Changes / Q.O.D. | 2–3 alternatives, justified pick. Avoids premature constraints. |
| 11 | Identify key implementation points | Changes / Q.O.D. | Sequence, risks, critical dependencies. |
| 12 | Identify inconsistencies in the spec | Q.O.D. | Re-read the whole document looking for problem/solution misalignment. This is the step the skill exists for. |
| 13 | Identify how to iterate in production | Production strategy | Analytics + alerting. The real feature is the one used in production. |

After the draft is written, **do step 12 explicitly**: re-read the spec with the user and call out misalignments. This is non-negotiable — skipping it converts the spec into a hand-off document, which is the failure mode the standard exists to prevent.

## Failure modes to avoid

These are the common mistakes the standard names. Push back on them in real time when you see them.

- **"PM does discovery, tech-lead does the tech part."** The spec is the place where both perspectives confront each other. Do not partition it. If you can only get one side in this conversation, flag the spec with `> ⚠️ Missing tech discussion` or `> ⚠️ Missing product discussion` and refuse to call it ready.
- **"I'm writing this because the team asked for it."** Bureaucratic specs hide reasoning. If the *why* of a section is not in the section, delete the section or fix it.
- **"My vision only."** Ask the user what they have *not* considered. Pull from `docs/` and any internal blueprint / mental-model reference the user can hand over before inventing.
- **"Forgot to link the ADR / Figma / blueprint / BPMN."** Three months from now, missing links force archaeology. Always link.
- **"The spec is too long."** Iteration becomes impossible. Cut. Two pages of prose is the soft ceiling.
- **"Adoption is someone else's problem."** Without analytics + alerting, the spec is incomplete. Step 13 is not optional.

## Repo-specific notes

- Specs live at `docs/specs/<slug>.md`. Create the folder if it does not exist.
- Slugs map to apps when relevant: prefix with the app slug (`borso-fr-`, `borsouvertures-`, `infra-`) so commitlint scopes line up trivially.
- Architectural decisions that survive past the spec belong in their own ADR under `docs/adr/` — reference them from the spec's *Questions / Options / Decisions* section, do not duplicate.
- For infra changes (`infra/cdk/**`, `infra/shared/**`), the *Changes* section must call out the test-coverage impact — those packages are coverage-gated.

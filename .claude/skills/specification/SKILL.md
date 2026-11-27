---
name: specification
description: Draft a feature specification that surfaces misalignments, confronts perspectives, and reveals inconsistencies before any code is written. Use when the user says they want to "spec", "write a spec", "kick off a feature", "discovery", "design a feature", or otherwise signals they are starting non-trivial work that has not yet been broken down. Skip for trivial bug fixes, isolated refactors, or work the user has already scoped.
---

# Specification skill

The specification is **not a description of what to build**. It is a working document that surfaces misalignments, confronts perspectives and reveals inconsistencies *before* implementation. Treating it as a hand-off document is the failure mode this skill exists to prevent.

Read [`standard.md`](./standard.md) before drafting. It holds the five perspectives, the 13-step operating mode with the reason for each step, input against output metrics, and the common mistakes. When it and this file disagree, the standard wins. For tone and depth, mirror [`worked-example.md`](./worked-example.md).

Invoke at the **start** of a feature. Skip already-scoped tickets, mechanical refactors, dependency bumps and one-line fixes. If unsure, ask: "Is this feature already scoped, or do you want to spec it first?"

## How this phase works

A spec is **a conversation, not a writing task**. Drive it with `AskUserQuestion`, one focused question at a time, with concrete options where helpful, capturing each answer in the draft before the next question. If you are tempted to guess, ask instead. Batch only questions that are genuinely independent.

1. **Copy [`template.md`](./template.md)** to `docs/features/<app>/<slug>/spec/spec.md`. `<app>` is the workspace slug under `apps/`, or `infra` for a feature touching only `infra/`. The slug names the user-visible outcome, not the mechanism. Supporting material (mockups, BPMN exports, design bundles) goes next to `spec.md` in `spec/`. Every section of the template stays. An empty one is a smell, so fill it or justify the gap inline.
2. **Confront the five perspectives** before drafting anything else, ticking each box of *Perspectives confronted* only once the user has answered a question from it. One human wears several hats here, so switch hats out loud ("putting on the tech-lead hat now…") and skip none.
3. **Walk the 13 steps of the standard's *Operating mode*, in order.** At step 7, ask the operator both *Records* questions for every new record (its own record or part of another one, and which screens create it), and write his dated answers. Never infer either from the existing schema: a record shaped by the nearest table gets redrawn on the preview, and `scripts/check-spec-records.sh` refuses a `CREATE TABLE` without its row.
4. **Do step 12 explicitly.** Re-read the whole spec with the user and call out every problem/solution misalignment. Skipping it turns the spec into a hand-off document.
5. **Keep it short.** Past about two pages of prose, nobody can iterate on it. Cut, do not append.

A perspective that was never challenged leaves `> ⚠️ Missing <perspective> discussion` at the top of the spec, and a flagged spec is not ready for implementation. Say so when the user tries to move on.

Push back in real time on the standard's common mistakes, and on two more:

- **"I'll click around to check it."** The spec is approved when `/visual-validation` and `/technical-validation` can clear it with no human clicking through anything. Split a manual assertion into a unit test or a visual-validation row. A manual check survives only as a post-deploy smoke check.
- **"Frontend-only apps don't need tests."** Pure helpers go in `*.utils.ts` at 100% coverage in every app.

## Auto-chain to `/technical-conception`

When no `> ⚠️ Missing` flag remains, every perspective box is ticked, and the user has approved the spec, invoke `/technical-conception` via the `Skill` tool with the spec path, without waiting for the user to type it. Never start implementation from a spec directly: the plan is the artefact a future Dantotsu traces defects back to.

**A piloted subagent cannot ask.** A subagent has no `AskUserQuestion`. When `state.json` says `"pilotedByTechLead": true`, write the draft with its `> ⚠️ Missing` flags, and return `status: question` with `next: { kind: answer-needed, question, options }` for the first open perspective. The orchestrator asks the operator and re-invokes you with the answer. Ask about every perspective before any decision that depends on it, because a late answer reopens the decisions built on it.

**Conditional suppression when piloted by `/tech-lead-orchestrator`.** Before auto-chaining, check whether `docs/features/<app>/<slug>/runs/<run-id>/state.json` exists and contains `"pilotedByTechLead": true`. If yes, **do not auto-chain**. Instead, emit a verdict at `runs/<run-id>/agents/specification-<step>.md` per [`.claude/skills/tech-lead-orchestrator/sub-agent-contract.md`](../tech-lead-orchestrator/sub-agent-contract.md) with `status: done`, `next: { kind: validate }`, and stop.

---
name: technical-conception
description: Translate a finished feature `spec.md` into a precise, exhaustive `plan.md` that maps every spec decision to where it lands in code, names every risk with detection + mitigation, and lists the pre-flight gates the implementation will pass before push. Use when the user says "write the plan", "technical conception", "/technical-conception", "spec is done, plan it", or otherwise asks for the engineering plan of an already-specified feature. Skip when there is no `spec.md`, when the spec still carries a `> ⚠️ Missing <perspective>` flag, or when the work is small enough to ship without a plan (one-line bug fix, dependency bump). The plan is **not** a hand-off artefact — it is an early quality check that a future Dantotsu can trace defects back to. Reads the standard at `.claude/skills/technical-conception/standard.md` before producing one.
---

# Technical-conception skill

The plan is **not a description of what to build**. The spec already does that. The plan is the *engineering* counterpart of the spec: it makes implementation choices explicit and traceable, so that when a defect ships, a Dantotsu can ask "did the plan name this risk and we missed it, did the plan miss it entirely, or did the bug come from outside the plan?" Without the plan, every defect is a fresh surprise.

The canonical standard this skill enforces lives at [`standard.md`](./standard.md). When the standard and this SKILL.md disagree, the standard wins.

## When to invoke

Invoke when:
- A feature spec exists at `docs/features/<app>/<slug>/spec/spec.md` and is not flagged with a missing-perspective blockquote.
- The user signals they want to move from spec → implementation: "let's plan", "technical conception", "/technical-conception", "spec is done, plan it".

Do **not** invoke when:
- There is no spec yet — run `/specification` first.
- The spec still has `> ⚠️ Missing …` flags — finish the spec.
- The work is trivial (one-line fix, dependency bump, mechanical refactor). The ceremony costs more than it returns there.

## How this phase works

A plan is **a writing task**, unlike the spec which is a conversation. The decisions have already been made (in the spec); the plan's job is to *project* them onto the codebase.

The skill agent does the work, end-to-end, without asking the user yes/no questions about decisions already settled in the spec. It only asks the user when:
- A spec decision turns out to be ambiguous when projected onto the code (in which case the spec is incomplete; flag it back to the user and offer to re-open the spec).
- A code-level choice has multiple sensible paths with different trade-offs (e.g. "extract this helper into a new module vs inline it") and the spec is silent. Use `AskUserQuestion` for these — bundle, don't drip.

The plan can be ~one screen of dense table per concern. Brevity is a feature: a plan that gets long stops being read.

## Composing with technical sub-skills

Every plan touches concrete tech: a router, a CSS pipeline, a data layer. As we build domain-specific skills (`/vite`, `/three-js`, `/controller`, `/database`, …) under `.claude/skills/`, this skill **invokes** them via the `Skill` tool when the spec touches that area.

Procedure:
1. Scan the spec for technical surface (build tool, framework, data store, third-party integrations).
2. For each surface, check `ls .claude/skills/` for a matching skill.
3. If present: invoke it via `Skill`, ask it to produce its slice of the plan (its own table rows + risks). Inline the result.
4. If absent: write the slice yourself, **and** flag it at the bottom of the plan under "Missing technical skills" so we know to seed one next time.

The seed for those skills is patterns.dev: <https://www.patterns.dev/ai/skills/>. Treat that as the starter library; rewrite each one to match this repo's conventions before adding to `.claude/skills/`.

## Deliverable

A single markdown file at `docs/features/<app>/<slug>/plan/plan.md`. Replaces the file if it exists — the plan is the latest snapshot, not an append-only log.

The plan **must** open with a one-line statement of intent and a link back to the spec. It **must** end with the pre-flight gates the implementation will pass.

## Required sections

Section names match the canonical template at [`template.md`](./template.md).

```markdown
# Plan — <feature title>

> Early quality check. Pair with [`../spec/spec.md`](../spec/spec.md). When a defect lands and a Dantotsu traces back here, the chain is visible: the plan either named the risk and we missed mitigating it, didn't name the risk at all (planning gap), or named it correctly and the defect comes from elsewhere.

## How each spec decision becomes code

| Spec ref | Decision | Where it lands | Self-check |
|---|---|---|---|

## Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |
|---|---|---|---|

## Code-quality self-check

- [ ] Repo lint rules pass (`pnpm exec biome lint`).
- [ ] Type-assertion plugin satisfied (only `as const`, `as unknown` allowed in this repo).
- [ ] No `any`.
- [ ] No abbreviations or single-letter locals outside trivial loop indices.
- [ ] Magic numbers / strings extracted to named constants.
- [ ] Comments document the WHY only.
- [ ] No JSDoc on internals.
- [ ] Function names describe the result, not the mechanism.

## Pre-flight gates

Run, in order, before push:
1. `pnpm install`.
2. `pnpm --filter <pkg> typecheck`.
3. `pnpm exec biome lint`.
4. `pnpm --filter <pkg> build`.
5. (UI work only) `/visual-validation` against the spec.
6. `pnpm exec knip` — no unused entries.
7. (Test-bearing code only) `/technical-validation` for the code-review pass.

## Open questions / unknowns

- One bullet per ambiguity surfaced during planning that the spec didn't resolve.

## Missing technical skills

- Skills that would have helped but don't yet exist under `.claude/skills/`. Seed them next.
```

For tone and depth, mirror the worked example at [`../../../docs/features/borso-fr/mondrian-atelier/plan/plan.md`](../../../docs/features/borso-fr/mondrian-atelier/plan/plan.md).

## Operating mode

Walk these 7 steps, in order.

| # | Step | Output | Why |
|---|---|---|---|
| 1 | Read the spec end-to-end | (mental model) | Plans built off summaries miss the load-bearing details. |
| 2 | Inventory the technical surface | (list) | Every framework / pipeline / data store mentioned in the spec maps to either an existing sub-skill or a "missing skill" flag. |
| 3 | Invoke each present sub-skill | (their plan slices) | They know their domain better than this skill. |
| 4 | Map every Q.O.D. + every Changes entry to a code location | "How each spec decision becomes code" table | Forces every decision to land somewhere concrete and verifiable. |
| 5 | Walk the spec's risks + your own | "Risk register" table | Every entry has severity, mitigation, *and* a detection path if mitigation fails. |
| 6 | Self-check repo code-quality rules | checkbox list | Catches "I'll fix that during impl" debt before it ships. |
| 7 | List pre-flight gates and open questions | last sections | Last-line-of-defence before push. |

## Failure modes to avoid

- **Restating the spec.** The plan must add information (where it lands, how it'll be checked, what could break). If a row only repeats what the spec already said, cut it.
- **Risks without detection.** Every risk needs a "how would I notice" column. A risk you can't detect when it slips is a future Sentry blind spot.
- **Pre-flight gates without a runner.** Every gate must be a command or a skill invocation. "Make sure it works" is not a gate.
- **Hidden assumptions.** Anything you assumed the spec said but didn't say belongs in "Open questions / unknowns" so it gets caught now, not in the post-mortem.
- **Skipping sub-skills you have.** If `/vite` exists and the plan touches Vite, invoke it. The skill author knows things you don't.
- **Pure helpers planned into `<name>.ts` instead of `<name>.utils.ts`.** Repo rule (CLAUDE.md "Clean code"): pure-function modules end in `.utils.ts` and ship at 100% coverage. The plan must commit to the suffix at planning time so the implementation skill doesn't have to rename files. Applies to every workspace, including frontend-only apps; no "too small to test" exemption. Each `*.utils.ts` row in *Files to change* is paired with the matching `*.utils.test.ts` row.
- **Planning a feature without a test runner.** If the touched workspace has no Vitest (or equivalent) wired up and the plan introduces utilities, *the plan must include the runner setup as one of its rows* — wired up by `/implementation`, not deferred.
- **Carrying forward imported deps and patterns without justification.** When a plan touches code that was ported in (or comes from a previous iteration that introduced a dep narrowly), question every dep and every state-management pattern instead of inheriting them. The trigger is *"introducing a new pattern"* — that's the moment to audit existing usages for unification. Run the **Pattern Coherence pass** in [step 3.5 of the operating mode](./standard.md#operating-mode) and write its outcome into section 1 of the plan or into *Open questions* if multiplicity is deliberate. Reference: [`docs/knowledge/audit-imported-deps-and-patterns-when-planning.md`](../../../docs/knowledge/audit-imported-deps-and-patterns-when-planning.md).

## Repo-specific notes

- Plans live at `docs/features/<app>/<slug>/plan/plan.md`. The folder is created next to the spec.
- For `infra/cdk/**` and `infra/shared/**` work, the plan must explicitly call out the 100%-coverage impact in the risk register.
- Pre-flight gate 5 (`/visual-validation`) only applies to UI work. Skip it for backend / infra.
- Pre-flight gate 7 (`/technical-validation`) applies whenever code is added, period.

## Auto-chain to `/implementation`

When this skill finishes (the plan is written, all open questions are answered or escalated, the user has approved the plan), the agent immediately invokes `/implementation` via the `Skill` tool with the spec path as argument. Do not stop and wait for the user to type "/implementation" — the chain is operational, not documentary.

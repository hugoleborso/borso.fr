# Technical conception — standard

> Source standard for the `technical-conception` skill. The skill enforces this; this file is the canonical text it points back to. Edit this file when the standard itself evolves; edit `SKILL.md` when the *enforcement* evolves.
>
> Companion docs in this folder:
> - [`template.md`](./template.md) — empty plan template.
> - The borso-fr Mondrian Atelier plan at `docs/features/borso-fr/mondrian-atelier/plan/plan.md` is kept as a reference example.

## What a plan is

A plan is the **engineering projection of a spec onto a codebase**. The spec settles *what* and *why*; the plan settles *where*, *how*, *what could break*, and *how we'd know*. It is read by a future Dantotsu when a defect ships, so that the post-mortem can trace the failure to a planning gap, an unfollowed plan, or an out-of-plan surprise.

It is **not** a hand-off document. Like the spec, it is a working artefact that exists to surface defects before they cost real money. The cost-saving move is the same as for the spec: an hour of plan beats a half-day of debug.

## Why this matters (Jidoka, again)

The spec catches *product* defects (this won't ship the right thing). The plan catches *engineering* defects (this won't ship cleanly, will flake in production, will rot for the next maintainer). Both are part of the same Lean discipline — surface defects at the earliest place they can appear.

A defect that maps cleanly to a plan row is recoverable: the team knows where the misconception was. A defect that doesn't map to anything in the plan is the expensive one, because the team has to re-investigate the whole feature to figure out what was missed. The plan's job is to make sure the second category is small.

## Audience

The plan has fewer audiences than the spec. It exists for:

- **The implementer** (often the same human who specced it, sometimes Claude). The plan reduces decisions during implementation.
- **The reviewer** — a `/technical-validation` agent, or a future Dantotsu coach. Both compare actual code against the plan.
- **Future-you**, three months from now, asking "why is this written this way?" The plan should answer without you re-reading the spec.

## Required sections

Five sections, in this order. The empty template lives at [`template.md`](./template.md).

### 1. How each spec decision becomes code

A two-column table is not enough. The required columns are:

| Spec ref | Decision | Where it lands | Self-check |

- **Spec ref** is the Q.O.D. number (`Q5`, `Q12`) or the Changes entry (`Files to change → main.tsx`). Without a back-pointer to the spec, the plan starts to drift.
- **Where it lands** is a concrete file path or — if the change is structural — a 1-line description of the structure. Vague is forbidden.
- **Self-check** is "how would I confirm this landed". Either a command, a manual sweep step, or a deterministic outcome ("`grep -r foo src/` returns nothing"). If you can't write the self-check, the row is half-thought.

Decisions in the spec that don't land in code (out-of-scope, deferred) get a row with `Where it lands = (out of scope)` so they're not forgotten.

### 2. Risk register

| Risk | Severity | Mitigation in plan | Detection if it slips |

The killer column is the last one. *Every* risk that can ship needs an answer to "how would I notice if my mitigation didn't take?" If the answer is "I wouldn't", the risk is a Sentry blind spot — escalate to the user.

Severity is `low` / `medium` / `high`. High-severity risks block the pre-flight gates; low-severity ones land in the open-questions list and get re-evaluated post-merge.

### 3. Code-quality self-check

A checkbox list of the repo's standing rules — pulled from CLAUDE.md, biome.jsonc, the ban-list of type assertions, the no-abbreviations rule, the magic-numbers rule. The agent ticks each box as it checks the implementation against the rule. **An unchecked box is a blocker.**

This section is repo-specific. The template carries a starter list pulled from CLAUDE.md; sub-skills extend it.

### 4. Pre-flight gates

A numbered list of commands or skill invocations to run before push. These are the gates the plan author commits to running. Every gate must be:

- **Reproducible** — anyone can re-run it.
- **Verifiable** — it has a pass / fail outcome that doesn't require interpretation.
- **Cheap** — running it costs less than catching the defect later.

Gates that need human judgement (e.g. "review the screenshots") are still listed, but as `human:` gates. They are real gates; they just don't pass automatically.

### 5. Open questions + missing technical skills

- **Open questions** are the ambiguities planning surfaced that the spec didn't resolve. They go back to the spec author. The plan does not proceed past them silently. Any item left here is a **hard block on `/implementation`** — the implementation skill's procedure step 1a refuses to walk the plan until every open question has an answer captured in the spec (or in a `## Decisions` section appended to the plan with the user's explicit confirmation).
- **Missing technical skills** are domains that would have benefited from a `.claude/skills/<name>/` skill but didn't have one. Seeded next iteration.

## Operating mode

| # | Step | Output |
|---|---|---|
| 1 | Read `spec.md` end-to-end | mental model |
| 2 | Inventory the technical surface | list of frameworks, pipelines, data stores |
| 3 | Invoke any present sub-skills (`/vite`, `/three-js`, `/controller`, …) | their plan slices |
| 3.5 | **Pattern Coherence pass** — list deps the spec doesn't justify, list state-management patterns, ask whether new patterns absorb old ones | one row in section 1 (or one entry in *Open questions* if multiplicity is deliberate). See [`docs/knowledge/audit-imported-deps-and-patterns-when-planning.md`](../../../docs/knowledge/audit-imported-deps-and-patterns-when-planning.md). |
| 4 | Map every Q.O.D. and every Changes entry to a code location | section 1 table |
| 5 | Walk the spec's risks + your own | section 2 table |
| 6 | Self-check repo code-quality rules | section 3 checkboxes |
| 7 | List pre-flight gates | section 4 list |
| 8 | List open questions and missing skills | section 5 |

## Common mistakes

| Typical error | Consequences |
| --- | --- |
| Plan is a paraphrase of the spec | No new information; pre-flight gates are skipped because nothing in the plan asked for them. |
| Risks named without detection paths | First production defect bypasses the plan entirely; Dantotsu can't trace it. |
| Pre-flight gates that require interpretation ("looks right", "feels good") | They get skipped under time pressure. |
| Hidden assumptions inlined into the table without flagging | Surface as defects later, with no record they were assumed. |
| Skipping a present sub-skill because the agent thinks it knows the domain | Sub-skill rules go unenforced; defects predicted by the sub-skill ship anyway. |
| Plan never re-read after written | Plans rot. Re-read at the end of step 8 with one question in mind: "would a future Dantotsu trace defects to anything I wrote here?" If not, cut the row and try again. |
| Carrying forward imported deps and patterns without justifying them | Vendor surface propagates by inertia; introducing a new pattern without re-evaluating existing ones leaves two parallel patterns the next maintainer has to learn. Run a Pattern Coherence pass — see [`docs/knowledge/audit-imported-deps-and-patterns-when-planning.md`](../../../docs/knowledge/audit-imported-deps-and-patterns-when-planning.md). The borsouvertures plan kept `zustand` next to two new `useSyncExternalStore` machines until the reviewer asked "why zustand?" — the audit should have surfaced it before the plan landed. |

---
name: adr
description: Help the operator take a good architectural decision — quickly. The skill walks the trade-off (frame the problem, surface options, define criteria, score, force the choice + its consequences) and produces an Architecture Decision Record at `docs/adr/<NNNN>-<slug>.md` as the byproduct. The walkthrough is the value; the markdown file is the audit trail. Use when the user says "/adr", "I need to decide between X and Y", "help me pick", "draft an ADR", "record this choice", or whenever a `/technical-conception` plan surfaces a row whose decision rationale isn't obvious. Loads its standard and template from `.claude/skills/adr/`.
---

# ADR skill

The skill is a **decision-support walk**. The 30-minute conversation the operator wishes they'd had before silently picking Option A and discovering at PR-time that Option C was strictly better. The markdown file at `docs/adr/<NNNN>-<slug>.md` is just the byproduct — useful, but downstream of the value.

Two failure modes the skill exists to prevent:

1. **Optimistic-default.** "We'll use X — everyone does." The skill forces the operator to name at least one viable alternative and articulate the cost of *not* picking it.
2. **Retro-justification.** Listing criteria *after* the choice is made is opinion dressed as analysis. The skill builds the rubric first and only then maps options onto it.

The canonical standard lives at [`standard.md`](./standard.md). The markdown template the skill emits is at [`template.md`](./template.md).

## The walkthrough (skill loop)

Five short rounds. Each round is one `AskUserQuestion` (or two, when the answer drives the next question). The skill never synthesises rationale on the operator's behalf — that defeats the audit.

### Round 1 — Frame the problem

Ask the operator to describe, in 3–5 sentences:

- **What forces are pushing on the decision?** Concrete observable forces — cost, latency, operator skillset, vendor lock, schema-drift risk. Not "we want it to be good".
- **What constraints close which doors?** Things that are non-negotiable: regulatory, budget cap, must run on Lambda, must work offline at the race.
- **What's the blast radius of getting it wrong?** Reversible at zero cost → consider skipping the ADR. One-way door → the whole walk is justified.

If the framing is fuzzy, the skill pushes back ("name the force in one phrase") rather than letting fuzziness propagate.

### Round 2 — Define criteria *before* options

Build the rubric. The operator names 3–5 criteria with weights (`high` / `medium` / `low`) — not 1-to-5 scales (hides reasoning). For each criterion, a one-line justification: *why does it matter, anchored to the framing*.

Example:

| Criterion | Weight | Why it matters |
|---|---|---|
| Idle cost ($/mo at peak-of-zero) | high | The race runs once a year; idle dominates. |
| Time-to-recovery on vendor outage | medium | DSQL is regional; outages are rare but long. |
| Drizzle/Postgres tooling familiarity | low | The author already drives drizzle daily. |

If a criterion can't be tied to the framing in one line, the skill pushes back. "Generic best practice" is not a criterion.

### Round 3 — Surface options

Ask the operator to list **at least two** viable options. The skill prompts:

- The "obvious default" (whatever the operator was about to pick).
- The strict alternative (the option that wins under a different weighting).
- The "no" option (do nothing / postpone / pick a smaller scope).

If the operator can't name a second viable option, the skill calls it out: *"This isn't a decision — it's a constraint. Either find an alternative or drop the ADR and write a code comment."*

### Round 4 — Score against the rubric

For each (option, criterion) pair, the operator supplies `✓ <one-line justification>` or `✗ <one-line justification>`. No grades, no stars — the audit value is the justification.

The skill renders a comparison matrix:

|   | Option A | Option B | Option C |
|---|---|---|---|
| Idle cost | ✓ <30 USD | ✗ 150 USD | ✓ <30 USD |
| Time-to-recovery | ✓ vendor-managed | ✗ on-call | ✓ vendor-managed |
| Tooling | ✓ drizzle | ✓ drizzle | ✗ custom |

If every cell is `✓` or every cell is `✗`, the rubric is broken. Push back: a useful rubric *differentiates* options.

### Round 5 — Force the choice + its consequences

Ask the operator to:

- **Name the winner**, in one paragraph. The skill writes this into *Decision*.
- **List two negative consequences** of the winner. *Closed doors, costs we're now paying.* The skill writes them into *Consequences* under `-`. If the operator can't name a negative, the analysis was lopsided.
- **State the rejection rationale** for each non-winner: *"loses on criterion X by Y"*. The skill writes those into *Alternatives considered*.

Then write the file via [`template.md`](./template.md), and update `docs/adr/README.md`.

## When to invoke

Yes:
- The operator faces two or more viable options. (Two is the floor; one is a constraint, not a decision.)
- The choice is hard to reverse — vendor lock, schema shape, framework choice, security model.
- A `/technical-conception` plan row already lists a trade-off but doesn't anchor *why this side won*.
- The operator says "I'm tempted to do X, but…"

No:
- Reversible-at-zero-cost choices (variable names, file layout within a folder).
- Cases where `CLAUDE.md` or a `docs/knowledge/` entry already settles the question. Cross-link instead.

## What `/open-pr` reads back

The PR description's `## Architecture choices` section is *built from the ADRs* referenced by the diff or the plan. Each ADR contributes:

- Its **Decision** paragraph at level 1 (PR body, always visible) — the one-sentence "we picked X because Y".
- Its **Alternatives considered + Evaluation rubric** at level 2 (collapsed `<details>`).
- Its **Implementation pointers** at level 3 (nested `<details>`).

The ADR is the only source for those sections. `/open-pr` does **not** synthesise architecture-choice content from commits or plan rows — if a non-trivial decision in the diff has no ADR, `/open-pr` flags it in *Known gaps* and points back here.

That's the contract: the ADR walk produces a record rich enough that the PR description carries the full reasoning without re-deriving it. If the ADR is sloppy, the PR body inherits the sloppiness.

## Failure modes the walk catches

- **Decision-without-alternatives** (Round 3). The skill refuses to write the file.
- **Retro-justification** (Round 2 before Round 3). Criteria locked before options are scored.
- **Lopsided rubric** (Round 4). If every cell agrees, the skill pushes back.
- **Missing consequences** (Round 5). Two negatives are mandatory, not optional.
- **Subjective grades** (Round 4). `✓ / ✗` with a justification — no scales.

## Auto-chain & maintenance

- On PR merge (`/after-task-dantotsus`), every ADR whose status is `proposed` and whose commit SHA matches the merge gets stamped to `accepted`.
- ADRs are append-only. To replace, the new ADR carries `**Supersedes:** ADR-XXXX` and the old one's status flips to `superseded by ADR-NNNN`. Both files stay.

## Repo-specific notes

- ADRs live at `docs/adr/`, next to `docs/dantotsus/` and `docs/knowledge/`.
- Filename: `NNNN-kebab-slug.md`. NNNN is zero-padded to 4 digits, monotonically increasing.
- The skill always reads [`standard.md`](./standard.md) before walking — that's where section names, status lifecycle, and the rubric format are pinned. Drift would break `/open-pr`.

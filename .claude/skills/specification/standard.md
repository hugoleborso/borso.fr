# Specification — standard

> Source standard for the `specification` skill. The skill enforces this; this file is the canonical text it points back to. Edit this file when the standard itself evolves; edit `SKILL.md` when the *enforcement* of the standard evolves.
>
> Companion docs in this folder:
> - [`template.md`](./template.md) — empty template to copy into `docs/features/<app>/<slug>/spec/spec.md`.
> - [`worked-example.md`](./worked-example.md) — a complete spec used as a depth/brevity reference.

## What a specification is

> 🎖️ Its intended usage is to surface **misalignments**, confront **perspectives**, and reveal **inconsistencies** early to ensure a **well-designed and shared solution.**

A specification is an end-to-end understanding of a requested feature, the domain, and the solution **before any development starts**. It aligns all stakeholders around a single source of truth and ensures the team designs the right solution — technically, functionally, and operationally. It is also the history of decisions and perspectives shared during design.

## Why this matters (Jidoka)

The principle is borrowed from lean / TPS *jidoka*: to go faster, you make fewer defects; to make fewer defects, you catch them as early as possible. In feature work, the earliest place defects appear is **the specification**. The role of the spec is to confront the perspectives of client, product, and tech *as early as possible* so that contradictions surface on paper instead of during development or, worse, in production.

A defect is usually the moment someone took a decision on one dimension of the product without seeing the consequences on another — UX without infra, API without callers, schema without analytics. A good spec lets every perspective look at the feature from its angle before a line of code is written.

> "Ne pas prévoir, c'est déjà gémir." — Leonardo da Vinci.

An hour spent on the spec is far cheaper than the cost of fighting delays, last-minute UX rework with the client, and ping-ponging with developers afterwards.

## Input vs output metrics (Amazon flywheel)

Borrowed from Amazon's *controllable input metrics* framing (Bezos: "obsess over input
metrics; output metrics will follow"). Every spec's *Why → measurable objective* names two
kinds of metric, and the *Test strategy* / *Production strategy* sections must be honest about
which kind each gate proves.

- **Output metric** — the lagging, multi-causal end-state we actually care about. *"Users
  learn an opening." "Cart abandonment drops." "Customer NPS rises."* You can measure it
  eventually, in production, with real users — but never directly, never from CI, and never on
  a single PR. Most output metrics are months-long signals.
- **Input metric** — the leading, controllable, observable behaviour that — when consistently
  executed — produces the output. *"Variation drilled to completion." "Add-to-cart →
  checkout completes within 2 s p75." "Page load p75 < 1 s."* Input metrics are deterministic
  flows or numeric thresholds an automated harness can verify on demand.

| Output metric (lagging, real-world)         | Input metric(s) (leading, machine-observable)                                                            |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Users learn an opening                      | Variation drilled to completion; user clicks "Switch to Play" after drill; Play scope reaches every leaf without OOB |
| Users buy more                              | Add-to-cart → checkout p75 < 2 s; abandonment rate; logged-in user opens product page                    |
| Customer happiness                          | Page load p75 < 1 s; support response time < 4 h; zero P1s in last 30 d                                  |
| Engineers ship faster                       | PR review p75 < 24 h; CI green-rate > 95 %; rollback rate < 1 % of deploys                               |

Rules for the spec:

1. *Why → measurable objective* names the **output metric** in plain language. One. Not four.
2. *Why → input metrics* (sub-bullet) names the leading behaviours that drive the output —
   the ones a future Claude session can assert.
3. *Test strategy* states explicitly which input metrics `/visual-validation` will drive. Output
   metrics are out of scope for `/visual-validation`; never claim a green visual-validation run
   proves the output.
4. *Production strategy → Analytics* lists the named events / thresholds that surface the input
   metrics in production. Output-metric measurement (NPS, retention, learning self-reports) is
   labelled as such — out-of-band of CI, often manual or third-party.

Reference: [`docs/knowledge/input-vs-output-metrics.md`](../../../docs/knowledge/input-vs-output-metrics.md).

## Audience — five perspectives

A spec is not a hand-off between PM and tech-lead. It is the document where these perspectives converge and challenge each other:

- **Client / business** — does this match the real need?
- **Product** — value, journey, edge cases.
- **Tech-lead** — feasibility, architecture, sequencing, risks.
- **Developer** — what gets implemented, where, how testable.
- **Designer** — visible result, before/after, UX edge cases.

In a single-dev repo one human wears several hats. That is fine — switch hats explicitly so each perspective gets its own pass.

## Required sections (canonical template)

Six sections, in this order. The full empty template lives in [`template.md`](./template.md); the prompt text below is reproduced verbatim from the canonical Notion callouts so the standard is self-contained.

### 1. Why
> *Describe what is requested. Describe how it contributes to the business or user value. Level 2: relate it to your product's critical performances.*

### 2. Result
> *Include the final result: Figma / proof-of-concept / wireframes / API endpoints / CSV dashboard.*

### 3. Use cases / edge cases
> *Use a **visual** interface to explain how the feature will work: BPMN / sequence diagram / domain modelling (DDD) / database changes.*

### 4. Questions, Options and Decisions
> *List the hard points you need to solve. This part is needed to help your team understand your way of crafting the feature. Empower your reflection with LLM. Include ADRs, POCs, blueprints considered as support, and what has been put out of scope.*

### 5. Changes
> *Show types you need to create/update (DDD). Show database changes. Include the architectural schema and files to change (use LLM for challenging). Show the test strategy implemented by the team, that will give you 100% confidence the feature is working without defects.*

### 6. Production strategy
> *Include what analytics you will add and the key metrics to consider to make the feature a success. Include error cases you manage and how it reflects in your alerting system.*

## Operating mode

| # | Step | Section | Key points | Rationale |
| --- | --- | --- | --- | --- |
| 1 | Work back from the solution to the problem | Why | Value for the business / customer / users | Easier to start from the solution stakeholders already have in mind |
| 2 | Observe the work in the field (Gemba) | Why | Validate the real problem | Prevents a solution in search of a problem; understand current behaviour, with all its constraints, before changing it |
| 3 | Clarify the expected value | Why / Result | Measurable objective (revenue / quality / lead time / productivity) | Avoids a "wish list" by focusing on value |
| 4 | Map the target behaviour | Use cases / edge cases | End-to-end user journey (happy path) | Lets everyone visualise the solution and spot inconsistencies |
| 5 | Conduct research (external + internal) | Why | Industry standards + repo `docs/` + existing blueprints + **live state of any `apps/<slug>/` / `infra/<slug>/` the feature touches** | Reduces "test & learn". **Imported briefs (Claude Design bundles, Figma exports, hand-off READMEs) are *snapshots* of intent, not of the live workspace. Before drafting any Q.O.D. row that names a toolchain — build pipeline, framework, test runner, package manager, deploy mechanism — `cat apps/<slug>/package.json`, skim its config files, and surface every divergence between the brief and the live state as an explicit Q.O.D. row. The brief documents intent; `package.json` documents reality. The spec is where they reconcile.** |
| 6 | Collect use cases | Use cases / edge cases | Normal + edge + error cases | Avoids breaking points caused by ignored use cases |
| 7 | Define the business model | Changes | Entities / relationships / shared business terminology | Stabilises business/tech vocabulary (DDD) |
| 8 | Identify data sources | Changes | APIs / databases / files / external services | Avoids poorly-scoped external dependencies |
| 9 | Define the interface | Result | Mockups / screens / workflows / before-and-after | Forces a visible result |
| 10 | Make component choices | Changes / Q.O.D. | 2–3 technical alternatives + justified choice | Avoids premature constraints |
| 11 | Identify key implementation points | Changes / Q.O.D. | Deployment sequence / technical risks / critical dependencies | Anticipates difficulties and helps planning |
| 12 | Identify inconsistencies in the spec | Q.O.D. | Verify problem/solution alignment + implementation feasibility | Avoids rework during implementation, or worse, delivering a product that is not used |
| 13 | Identify how to iterate in production | Production strategy | Analytics + success thresholds + zero-defect alerting | The real feature is the one used in production; you need to know fast which part is broken |

## Common mistakes

| Typical error | Consequences |
| --- | --- |
| As a PM, I do the discovery and the tech-lead will do the tech part | The tech-lead challenges PM assumptions and suggests reworks ⇒ waste. The spec is the document where all perspectives are shared and worked together. |
| I write the spec to describe what to do in the EPIC | Edge cases are raised by the tech team later, estimation is wrong, rework ensues. The spec is the support for *all* points to tackle, discussed before development starts. |
| I write the spec because the team asks for it (bureaucratic tool) | The reasoning around the solution is not explained, exposing the feature to future mistakes. |
| I write the spec with my vision only | You don't capitalise on group knowledge. Sharing is the key to developing the basic parts (blueprints) so you can focus on the ingenious parts. |
| Forget to update the deliverable with the ADR, blueprints, Figma and BPMN links | The spec is a long-term tool. Three months later you do archaeology to find the right info. |
| The spec is too long | The team can no longer iterate on it. Lead-time estimation becomes hard. |
| I do not consider adoption as the final result of the spec | No quality monitoring (zero-defect strategy), no usage monitoring (analytics, gain, value), and future investigations become very hard. |
| I confuse output for input metric | The spec's *measurable objective* reads "users learn an opening" and the test strategy claims `/visual-validation` will validate it. Visual-validation cannot drive a human's brain; it can only assert the behaviours that *lead to* learning. The result is a green CI gate that proves nothing about adoption, and a missing input-metric layer that *could* have been gated. See [`input-vs-output-metrics`](#input-vs-output-metrics-amazon-flywheel) above. |
| I trust the imported brief about the workspace's toolchain | The spec inherits a stale picture of `apps/<slug>/` from a hand-off README or design-bundle README; a Q.O.D. row about *build pipeline / framework / test runner / deploy mechanism* gets ratified on a wrong premise, and an ADR built on top is invalidated in code review. The brief documents *intent*; `apps/<slug>/package.json` documents *reality*. Cat the live `package.json` before locking any toolchain-shaped Q.O.D. row. See [`docs/dantotsus/believed-the-bundle-readme-not-the-live-package-json.md`](../../../docs/dantotsus/believed-the-bundle-readme-not-the-live-package-json.md). |

## Worked example

See [`worked-example.md`](./worked-example.md) — a complete spec ("As a commuter, I want to see the waiting time for a new ride") covering all six sections with measurable targets, a Q.O.D. table, code & SQL changes, and analytics + alerting thresholds. Use it as a reference for the level of detail expected, and for the level of brevity (well under two pages despite covering everything).

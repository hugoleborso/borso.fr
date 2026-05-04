# Spec template

Copy this into `docs/features/<app>/<feature-slug>/spec/spec.md` and fill it in. Section names and italic guidance match the canonical Theodo Academy template — keep them identical so local specs and external specs read the same.

Drop supporting material (mockups, BPMN exports, design-tool bundles) **next to `spec.md`** inside the same `spec/` folder rather than inlining megabytes into the spec body.

The block-quoted prompt under each heading is guidance for the author; delete it once the section is written.

---

# <Feature title — phrased as the user-visible outcome>

## Perspectives confronted

> *Hard gate: every checkbox below must be ticked **and** carry a one-line justification before any other section is drafted. A box may be ticked only after the user has answered at least one `AskUserQuestion` from that perspective, OR has explicitly confirmed (also via `AskUserQuestion`) that the perspective is degenerate for this feature. Silent self-reported "N/A" is the failure mode this gate is built to prevent — see [`docs/dantotsus/spec-skill-let-perspectives-be-skipped.md`](../../../docs/dantotsus/spec-skill-let-perspectives-be-skipped.md).*

- [ ] **Client / business** — <one-line: what was confirmed; or "user confirmed degenerate because <reason>">
- [ ] **Product** — <one-line>
- [ ] **Tech-lead** — <one-line>
- [ ] **Developer** — <one-line>
- [ ] **Designer** — <one-line>

<!-- Optional fallback if a perspective is genuinely missing despite a confront attempt:
> ⚠️ Missing <perspective> discussion
Use only when the user knowingly defers the perspective for a follow-up; never as a substitute for the checklist. -->

## Why

> *Describe what is requested. Describe how it contributes to the business or user value. Level 2: relate it to your product's critical performances.*

- The user / business / customer value, in one paragraph.
- One measurable objective: revenue / quality / lead time / productivity. A wish-list of four objectives means none of them.
- Any field observation (Gemba) that validates the **problem** exists, not just that the solution is wanted.

## Result

> *Include the final result: Figma / proof-of-concept / wireframes / API endpoints / CSV dashboard.*

- The final, visible result. Embed mockups, screenshots, or before/after diagrams inline.
- For backend-only features, show the endpoint shape or the dashboard row that did not exist before.
- "No visible result" is a red flag — name it.

## Use cases / edge cases

> *Use a visual interface to explain how the feature will work: BPMN / sequence diagram / domain modelling (DDD) / database changes.*

- **Visual first.** BPMN / sequence diagram / domain model. Plain text only when a visual is genuinely overkill.
- Numbered happy path.
- Bulleted edge cases.
- Bulleted error cases.
- **On-mount side-effects.** *Required* sub-section if the feature mirrors React state (or any client-side state) to an external system on first paint — URL, `localStorage`, `document.title`, focus management, analytics events. Each mirror is a discrete assertion with the same status as a happy-path step: `<state> mirrored to <system> via <call> (<push|replace|other>)` on initial render, before any user interaction. The validators check these explicitly; if you don't list it, the technical-validator can't see it (it tests what's named, not what's missing) and any defect lives until visual-validation catches it the hard way. See [`docs/dantotsus/mount-time-side-effects-implied-not-asserted.md`](../../../docs/dantotsus/mount-time-side-effects-implied-not-asserted.md) for the worked example.
- If a case is not listed here, it does not exist for this iteration.

## Questions, Options and Decisions

> *List the hard points you need to solve. This part is needed to help your team understand your way of crafting the feature. Empower your reflection with LLM. Include ADRs, POCs, blueprints considered as support, and what has been put out of scope.*

| Question | Options | Decision (date) |
| --- | --- | --- |
|  |  |  |

- One row per hard point. Keep resolved decisions — future-you will need the reasoning.
- Reference full ADRs (`docs/adr/`) and blueprints rather than duplicating their contents.
- **Out of scope:** explicit list.

## Changes

> *Show types you need to create/update (DDD). Show database changes. Include the architectural schema and files to change (use LLM for challenging). Show the test strategy that will give you 100% confidence the feature is working without defects.*

### Types / domain model
```ts
// New value objects, entities, request/response shapes.
```

### Database changes
```sql
-- Migrations, new columns, indexes.
```

### Files to change
```
src/.../New.ts                       // NEW
src/.../Existing.ts                  // UPDATE: <what>
```

### Test strategy

> *The validation pipeline must be **autonomous** — a future Claude session running `/visual-validation` and `/technical-validation` should be able to clear the spec without a human-in-the-loop manual sweep. "I'll click around to check it" is **not** a valid test strategy. List the autonomous pieces below; each pure helper goes through unit tests, each behavioural use case goes through `/visual-validation`, the diff goes through `/technical-validation`.*

- **Unit tests on pure utilities.** Every file matching `**/*.utils.ts` ships at 100% coverage (statement / branch / function / line). List the new utility files this feature introduces, and any pure helpers extracted from existing modules.
- **Visual validation.** Every numbered happy-path step and every edge / error case under *Use cases / edge cases* is asserted by the `/visual-validation` agent driving the running app via agent-browser. The agent reads this section to build its assertion list, so phrasing matters.
- **Technical validation.** `/technical-validation` runs after the implementation lands: lint + knip + typecheck + build + the unit-test runner above, plus a per-Q.O.D. correctness pass on the diff.
- **Coverage gates already in place** stay in place: `infra/cdk/**` and `infra/shared/**` are 100% line-coverage gated and any change here must restate the impact.
- **Manual sweeps are not allowed as the test strategy.** They are at most a *belt* on top of the automated suspenders, called out under "Production strategy → Manual smoke after deploy" if relevant.

## Production strategy

> *Include what analytics you will add and the key metrics to consider to make the feature a success. Include error cases you manage and how it reflects in your alerting system.*

### Analytics
- Named events (e.g. `feature_action_completed`).
- Metrics + thresholds (p50 / p75 / p90 where relevant).
- Success criteria, ideally over a rolling window.

### Zero-defect strategy
- Named error classes, when each one fires, where it surfaces (Sentry tags, log fields).
- Alerting thresholds (e.g. *N occurrences in M minutes in production*).

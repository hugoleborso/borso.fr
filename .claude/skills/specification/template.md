# Spec template

Copy this into `docs/features/<app>/<feature-slug>/spec/spec.md` and fill it in. Section names and italic guidance match the canonical Theodo Academy template — keep them identical so local specs and external specs read the same.

Drop supporting material (mockups, BPMN exports, design-tool bundles) **next to `spec.md`** inside the same `spec/` folder rather than inlining megabytes into the spec body.

The block-quoted prompt under each heading is guidance for the author; delete it once the section is written.

---

# <Feature title — phrased as the user-visible outcome>

<!-- If a perspective has not yet been challenged, leave one of these blockquotes at the top:
> ⚠️ Missing tech discussion
> ⚠️ Missing product discussion
> ⚠️ Missing designer discussion
> ⚠️ Missing client discussion
> ⚠️ Missing developer discussion
Remove the line once that perspective has been covered. -->

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

# Specification — standard

> Source standard for the `specification` skill. The skill enforces this; this file is the canonical text it points back to. Edit this file when the standard itself evolves; edit `SKILL.md` when the *enforcement* of the standard evolves.

## Usage Intent (What you are trying to achieve by writing a specification)

> 🎖️ Its intended usage is to surface **misalignments**, confront **perspectives**, and reveal **inconsistencies** early to ensure a **well-designed and shared solution.**

## Key points

The spec is structured around six recurring lenses:

- **Why** — business / customer / user value, and the measurable objective.
- **Use cases** — happy path + edge cases + error cases.
- **Results** — the visible before / after for the user.
- **Changes** — business model, data sources, components, implementation sequence.
- **Questions / Options / Decisions** — the ADR-equivalent inside the spec.
- **Monitoring** — analytics + zero-defect strategy in production.

## Operating mode

| # | Step | Aligned with | Key Points | Rationale |
| --- | --- | --- | --- | --- |
| 1 | Work back from the solution to the problem | Why | Value for the business / the customer / the users | It is easier to start from the solution stakeholders already have in mind |
| 2 | Observe the work in the field (Gemba) | Why | Validate the real problem | Prevents a solution in search of a problem: we understand the current behavior, with all its constraints, before changing it |
| 3 | Clarify the expected value | Why / Results | Measurable objective (revenue / quality / lead time / productivity) | Avoids a "wish list" that multiplies costs by focusing on value |
| 4 | Map the target behavior | Use cases | End-to-end user journey (happy path) | Makes the solution easy to visualize as a whole so everyone can spot inconsistencies |
| 5 | Conduct research (external / internal) | Why | Research industry standards for this type of functionality. Research Theodo knowledge (Blueprints) | Reduces "test & learn" |
| 6 | Collect use cases | Use cases | Complete scenarios: normal cases + edge cases + error cases | Avoids breaking points caused by ignored use cases: all practical interactions are covered |
| 7 | Define the business model | Changes | Entities / relationships / shared business terminology | Stabilizes business/tech vocabulary and provides a solid structure for what comes next |
| 8 | Identify data sources | Changes | APIs / databases / files / external services | Avoids poorly scoped external dependencies by verifying required data availability |
| 9 | Define the interface | Result | Mockups / screens / workflows / before-and-after experience | Avoids "no visible result": clearly shows what the solution will look like |
| 10 | Make component choices | Changes / Questions / Options / Decisions | 2–3 technical alternatives + justified choice | Avoids premature constraints that could disrupt implementation |
| 11 | Identify key implementation points | Changes / Questions / Options / Decisions | Deployment sequence / technical risks / critical dependencies | Anticipates difficulties and facilitates development planning |
| 12 | Identify inconsistencies in the spec | Questions / Options / Decisions | Verify problem/solution alignment + implementation feasibility | Avoids rework during implementation — or worse, delivering a product that is not used |
| 13 | Identify how to iterate in production | Monitoring | Continuous improvement — measure from the real use in production. Define how you will monitor the feature in production (analytics and success thresholds). Define your zero-defect strategy (explain error cases and set up alerting for managing errors). | The real feature is the one used in production. You need to know exactly what is used and what is not. You need to know fast which part of the feature will be broken to react fast. |

## Common mistakes

| Typical error | Consequences |
| --- | --- |
| As a PM, I do the discovery and the tech lead will do the tech part | The tech lead will challenge the assumptions done by the PM and will suggest reworks ⇒ waste. The specification is a document to share all perspectives (PM / TL) and work together on the best solution to provide. |
| I write the spec to describe what to do in the EPIC | I forget edge cases that will be raised by the tech team further and my estimation is incorrect because of the rework. The specification is a support for describing all points to tackle, that we will need to discuss together as a team before starting development of the feature. |
| I write the spec because the team asks for it. I see the spec as a bureaucratic tool | I do not explain all the reasoning around the solution and expose the feature to future mistakes. |
| I write the spec with my vision only | You do not capitalise on the group knowledge. Sharing is the key to develop the basic parts of the feature (blueprints), so that you can focus on the ingenious part of the feature. |
| Forget to update the deliverable with the ADR, blueprints, Figma and BPMN links | The spec is a tool to work together on the long term. 3 months later you have to do archaeology work to find the right info. |
| The spec is too long | The team does not manage to iterate on it. The team has difficulty estimating the lead time to develop. |
| I do not consider the adoption as the final result of the spec | The team does not monitor the feature in production from quality's point of view (zero-defect strategy) nor usage's point of view (analytics, gain, value), which leads to difficulties investigating future problems. |

## Enabler

- Spec template (Notion).
- App blueprints (Notion).

## Resources

- Books / mental schemas (Notion).

## Admin examples (Notion references)

- "As a commuter, I want to see the waiting time for a new ride."
- "Pitch de reframe."
- "Visuals for building the page."

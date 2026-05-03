# Visual validation — standard

> Source standard for the `visual-validation` skill. The skill enforces this; this file is the canonical text it points back to. Edit this file when the standard itself evolves; edit `SKILL.md` when the *enforcement* evolves.
>
> Companion docs in this folder:
> - [`template.md`](./template.md) — the validation-report template *and* the self-contained prompt template the skill passes to the dispatched agent.

## What a visual validation is

A visual validation **opens the implemented feature in a browser and checks, point by point, that every assertion the spec makes about visible behaviour actually holds.** It is not a type-check, not a lint, not a unit test. It is the gate that catches:

- Code that compiles and ships, but doesn't render anything.
- Buttons that exist but don't do what the spec says they should.
- Edge cases (narrow viewports, reduced motion, URL state) that the implementer never tried.
- "Looks right at the developer's resolution; broken everywhere else."

A visual validation that passes is high confidence the feature ships. A visual validation that fails is grounds to halt push, not negotiate. There is no half-credit.

## Why standalone

LLM-driven implementation has a confirmation-bias failure mode: the same agent that implemented the feature is asked to validate it, and finds it fine. The validation agent **must** run in a fresh Agent invocation with no chat history, no implementation summary, no narrative pressure. It reads the spec and the running app, and nothing else.

This is a structural mitigation, not a culture rule. The skill is required to use the `Agent` tool. The dispatched agent is required to base its verdict on the spec text and the browser observation.

## Why this matters (Jidoka)

Same lineage as `specification` and `technical-conception`: catch defects at the earliest place they can appear. For *visible* defects that, by definition, is the moment the feature renders in a real browser. Earlier than production smoke-test. Later than nothing.

A visible defect that ships erodes trust faster than any other kind. The user sees it. They tell their friends. They don't open a Sentry ticket — they leave. Visual validation is the cheapest gate against that class of damage.

## What gets validated

Pulled from the spec, in this order:

1. **Result** — every visible artefact named in the Result section. Typography, layout, copy, colours, spacing. Mockups and Figma references go here.
2. **Use cases / edge cases — happy path** — each numbered step, in order, with a concrete browser action.
3. **Use cases / edge cases — edge cases** — narrow viewport, reduced motion, dark-mode preference, slow network, large input, empty input.
4. **Use cases / edge cases — error cases** — invalid URL params, third-party failures (timeouts, 5xx), keyboard accidents.
5. **Q.O.D. user-visible decisions** — anything in the decisions table that the user can see (palette options, default mode, URL behaviour, mobile affordances, accessibility decisions). Skip Q.O.D. rows that are purely engineering (build tool choice, file layout, dependency choice).

Q.O.D. rows that are not user-visible are **not** validated — they're code-quality concerns that belong to `/technical-validation`.

## What does not get validated

- Performance metrics that need a baseline (LCP, INP, bundle size). Those are observability concerns.
- Cross-browser parity. The agent runs Chromium. Other browsers are out of scope here.
- Visual diff against pixel-perfect golden images. The agent compares against the spec's *claims*, not against a reference snapshot. If pixel-perfection is required, the spec must say so explicitly and golden images must be checked into the repo.

## Verdict semantics

The agent assigns one tag per assertion:

- **PASS** — the agent observed the assertion to hold. Evidence: a deterministic check (selector found, attribute matches, URL matches, screenshot saved) is referenced in the row.
- **FAIL** — the agent observed the assertion to *not* hold. Evidence: the captured screenshot or the value that contradicted the assertion is referenced.
- **UNVERIFIABLE** — the assertion is not concrete enough to test, *or* a tooling limit prevents the agent from observing the relevant state. Evidence: a one-line note saying what's missing.

Final verdict:

- All rows PASS → **PASS**.
- ≥ 1 FAIL row → **FAIL**.
- 0 FAIL rows + ≥ 1 UNVERIFIABLE row → **PARTIAL**.

There is no rounding up. PARTIAL is not PASS.

## Tooling

Today: Playwright (already installed in `apps/borso-fr`). The agent uses the JS API to launch Chromium, navigate, click, type, resize, screenshot.

Tomorrow: agent-browser (the `mcp__browser__*` family of tools, when present) is preferred — the agent drives a real browser session interactively, can navigate exploratory paths, and is not limited to scripted Playwright actions. Validation reports are richer.

The skill detects which is available and uses the richer one.

## Common mistakes

| Typical error | Consequences |
|---|---|
| Skill summarises the implementation for the agent | Validation inherits the bias the standalone rule exists to prevent. |
| Agent screenshots without waiting for animation settle | Flaky FAILs on rAF-driven animations; ignored after the third false alarm; real defects then slip. |
| Agent infers intent from the implementation when the spec is vague | Implementer's bug is laundered through validation. The agent must tag UNVERIFIABLE and force the spec to be tightened. |
| Verdict reports don't reference evidence | Reviewers can't tell PASS from "agent said so". Treat unsourced PASS as UNVERIFIABLE. |
| Skipping edge-case rows because they require setup (resize, emulateMedia) | The defects users hit live there. Pre-flight gate is meaningless without them. |
| Pixel-diff against a reference image without the spec asking for it | Validation goes red on every cosmetic change. Implementers stop reading the report. |

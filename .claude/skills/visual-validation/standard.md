# Visual validation — standard

> Source standard for the `visual-validation` skill. The skill enforces this; this file is the canonical text it points back to. Edit this file when the standard itself evolves; edit `SKILL.md` when the *enforcement* evolves.
>
> Companion docs in this folder:
> - [`template.md`](./template.md) — the dispatch-brief template the skill passes to the validator agent, and the report template the agent writes.
> - The dedicated agent definition lives at [`../../agents/visual-validator.md`](../../agents/visual-validator.md).

## What a visual validation is

A visual validation **opens the implemented feature in a browser and checks, point by point, that every assertion the spec makes about visible behaviour actually holds.** It is not a type-check, not a lint, not a unit test. It is the gate that catches:

- Code that compiles and ships, but doesn't render anything.
- Buttons that exist but don't do what the spec says they should.
- Edge cases (narrow viewports, reduced motion, URL state) that the implementer never tried.
- "Looks right at the developer's resolution; broken everywhere else."

A visual validation that passes is high confidence the feature ships. A visual validation that fails is grounds to halt push, not negotiate. There is no half-credit.

## Why standalone

LLM-driven implementation has a confirmation-bias failure mode: the same agent that implemented the feature is asked to validate it, and finds it fine. The validator **must** run in a fresh Agent invocation with no chat history, no implementation summary, no narrative pressure. It reads the spec and the running app, and nothing else.

This is a structural mitigation, not a culture rule. The skill is required to use the dedicated `visual-validator` agent (defined in `.claude/agents/visual-validator.md`) — not `general-purpose`. The agent's frontmatter and brief are the carriers of the rule; a generic agent would dilute them.

## Why this matters (Jidoka)

Same lineage as `specification` and `technical-conception`: catch defects at the earliest place they can appear. For *visible* defects that, by definition, is the moment the feature renders in a real browser. Earlier than production smoke-test. Later than nothing.

A visible defect that ships erodes trust faster than any other kind. The user sees it. They tell their friends. They don't open a Sentry ticket — they leave. Visual validation is the cheapest gate against that class of damage.

## Tooling: agent-browser

The validator uses [`agent-browser`](https://github.com/vercel-labs/agent-browser) — a Rust CLI that exposes browser control to LLM agents through:

- **Reference-based snapshots.** `agent-browser snapshot -i --json` returns the accessibility tree with `@e1`, `@e2` refs. The agent acts on refs, not CSS selectors. This eliminates a category of selector-fragility that plagues Playwright in agent hands.
- **Stateful daemon.** A persistent process holds the browser session; commands are individual shell calls. The agent's loop is "snapshot → reason → act → re-snapshot", which matches LLM affordances.
- **Built-in emulation.** `set viewport`, `set device`, `set media [dark|light]` cover the spec's edge-case checklist without scripting.

Playwright would have worked for this skill, but agent-browser is *shaped* for LLMs. The validation reports are richer because the agent isn't fighting an imperative JS API.

## What gets validated

Pulled from the spec, in this order:

1. **Result** — every visible artefact named in the Result section. Typography, layout, copy, colours, spacing.
2. **Use cases / edge cases — happy path** — each numbered step, in order, with a concrete browser action.
3. **Use cases / edge cases — edge cases** — narrow viewport, reduced motion, dark-mode preference, slow network, large input, empty input.
4. **Use cases / edge cases — error cases** — invalid URL params, third-party failures, keyboard accidents.
5. **Q.O.D. user-visible decisions** — anything in the decisions table that the user can see (palette options, default mode, URL behaviour, mobile affordances, accessibility decisions). Skip Q.O.D. rows that are purely engineering — those go to `/technical-validation`.

The Production strategy section is **not** validated here — analytics + alerting are observability concerns, not visible-behaviour concerns.

## What does not get validated

- Performance metrics that need a baseline (LCP, INP, bundle size).
- Cross-browser parity. The validator runs Chromium via agent-browser. Other browsers are out of scope.
- Pixel-perfect diff against a golden image. The validator compares against the spec's *claims*, not against a reference snapshot. If pixel-perfection is required, the spec must say so explicitly and golden images must be checked into the repo.

## Verdict semantics

The agent assigns one tag per assertion:

- **PASS** — the agent observed the assertion to hold. Evidence: a deterministic check (selector found, attribute matches, URL matches, screenshot saved) is referenced in the row.
- **FAIL** — the agent observed the assertion to *not* hold. Evidence: the captured screenshot or the value that contradicted the assertion is referenced.
- **UNVERIFIABLE** — the assertion is not concrete enough to test, *or* a tooling limit prevents observing the relevant state. Evidence: a one-line note saying what's missing.

Final verdict:

- All rows PASS → **PASS**.
- ≥ 1 FAIL row → **FAIL**.
- 0 FAIL rows + ≥ 1 UNVERIFIABLE row → **PASS_EXCEPT_UNVERIFIABLE**.

There is no rounding up. PASS_EXCEPT_UNVERIFIABLE is its own verdict, not a flavour of PASS — it is mergeable only if the operator copies the UNVERIFIABLE rows into the PR description per the disclosure rule in `SKILL.md`. **FAIL is never mergeable** — the operator fixes the implementation (or the spec) and re-runs.

## Evidence is committed

Screenshots referenced from a verdict report are checked into git alongside the report itself. Both live under `docs/features/<app>/<slug>/validation/` — explicitly *not* gitignored. The reasoning:

- A FAIL report without the screenshot it references is unrebuttable.
- A PASS report without screenshots is "trust me".
- Validation runs do not happen often enough for storage to matter; the size of three or four PNGs per feature is negligible against the value of a permanent record.

`.gitignore` at the repo root **must not** match `docs/features/**/validation/**`. The visual-validator agent never writes outside its given `evidence_dir` so the rule is enforced by the agent's behaviour, not by an ignore pattern.

## Pixel-content checks (every screenshot)

Before declaring any row PASS, the validator runs the broken-image scan
against the current page. A typical PWA / SPA defect is that an `<img src>`
404s or 403s (third-party CDN block, CORS refusal, missing asset) and the
browser falls back to rendering the `alt` text in place of the image. DOM
assertions pass — the `<img>` is there, the parent component rendered, the
layout is correct — but the user sees broken alt-text where pieces /
icons / glyphs should be.

The canonical check:

```js
Array.from(document.querySelectorAll('img'))
  .filter((img) => img.complete && img.naturalWidth === 0)
  .map((img) => ({ src: img.src, alt: img.alt, parent: img.parentElement?.tagName }));
```

Returns the set of `<img>` tags that completed loading their alt text
instead of the actual image. Non-empty → FAIL the row that covered the
screenshot and name the broken src(s) in the report. The validator runs
this **for every screenshot it takes**, not just suspect ones; the cost is
one `agent-browser eval` per shot.

Sibling checks worth running per row when the asserted UI has them:

- *"Does the rendered text match what the spec says?"* — `eval`
  `document.querySelector(<selector>).textContent` and compare verbatim,
  not just check existence.
- *"Is the element positioned where the spec says it should be?"* —
  `getBoundingClientRect()` against the related elements (e.g. "banner
  above board" → `banner.top < board.top`).

These three checks together turn the validator from a *DOM-presence
inspector* into a *rendered-pixel-content inspector*. The gap closed
here is the one where DOM assertions pass against an image that never
actually rendered.

## Common mistakes

| Typical error | Consequences |
|---|---|
| Skill summarises the implementation for the agent | Validation inherits the bias the standalone rule exists to prevent. |
| Skill dispatches `general-purpose` instead of `visual-validator` | The dedicated agent's frontmatter rules don't apply; the validator can drift. |
| Falling back to Playwright when agent-browser is missing | The structural fit-for-LLM advantage disappears; surface the install instead. |
| Agent screenshots without waiting for animation settle | Flaky FAILs on rAF-driven animations; ignored after the third false alarm; real defects then slip. |
| Agent infers intent from the implementation when the spec is vague | Implementer's bug is laundered through validation. The agent must tag UNVERIFIABLE and force the spec to be tightened. |
| Verdict reports don't reference evidence | Reviewers can't tell PASS from "agent said so". Treat unsourced PASS as UNVERIFIABLE. |
| Skipping edge-case rows because they require setup (resize, set device, set media) | The defects users hit live there. Pre-flight gate is meaningless without them. |
| Gitignoring the validation folder | Evidence vanishes; reports become hearsay. |
| **Verdict on DOM-presence without checking rendered pixels** | Broken `<img>` tags + alt-text fallback + content-mismatched text all pass DOM checks while users see a broken UI. Run the *Pixel-content checks* section above per screenshot. |

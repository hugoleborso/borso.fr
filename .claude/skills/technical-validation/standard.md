# Technical validation — standard

> Source standard for the `technical-validation` skill. The skill enforces this; this file is the canonical text it points back to. Edit this file when the standard itself evolves; edit `SKILL.md` when the *enforcement* evolves.
>
> Companion docs in this folder:
> - [`template.md`](./template.md) — the dispatch-brief template the skill passes to the validator agent, and the report template the agent writes.
> - The dedicated agent definition lives at [`../../agents/technical-validator.md`](../../agents/technical-validator.md).

## What a technical validation is

A technical validation **reads the diff on the current branch and asks four questions about it**:

1. **Correctness** — does the code do what the spec said it would? Quote the code, cross-reference the Q.O.D. or Changes entry.
2. **Cleanliness** — does the code follow the repo's standing rules (CLAUDE.md, biome, the type-assertion plugin)? Run lint, search for forbidden patterns, sample names.
3. **Tests pass** — `pnpm test` succeeds on every touched workspace. For coverage-gated workspaces, `test:coverage` succeeds at 100%.
4. **Coverage** — every use case the spec lists is exercised by a test that exists.

A passing technical validation is high confidence the feature ships *clean*. A failing one is grounds to halt push, same as visual-validation.

## Why standalone

LLM-driven implementation has the same confirmation-bias failure mode for code as for pixels: the agent that wrote the code thinks the code is fine. The validator runs in a fresh Agent invocation with no chat history and no implementation summary. It reads only the spec, the plan, the diff, and the test results.

This is structural, not cultural. The skill is required to use the dedicated `technical-validator` agent (defined in `.claude/agents/technical-validator.md`) — not `general-purpose`. The agent's frontmatter and brief are the carriers of the rule.

## Why this matters (Jidoka)

Visual-validation catches *visible* defects. Technical-validation catches the rest:

- Code that ships visibly working but is dirty (will rot fast).
- Code that ships visibly working but has no tests (will regress silently).
- Code that ships visibly working but doesn't match what the spec actually said (the spec author and the implementer fell out of sync somewhere; this catches it).

A defect of any of these classes is a future Dantotsu. Technical-validation catches them at the cheapest moment — before push.

## What gets validated

### A. Correctness vs spec

Every row in the spec's *Questions, Options and Decisions* table whose decision is implementation-bearing. Every entry in the spec's *Changes → Files to change* list. The validator opens the relevant file, finds the relevant code, quotes 2–4 lines, and checks the decision actually landed.

Skip rows that are pure deferral ("out of scope"). Skip rows that the spec marks as future work. Note them in the report's preamble for context.

### B. Code cleanliness (repo rules)

Pulled from CLAUDE.md "Clean code" and the repo's biome config:

- Names carry intent — no `c`, `x`, `r` outside trivial loop indices. No abbreviations.
- Magic numbers / strings extracted to named constants.
- Comments document the WHY only — no what-comments, no JSDoc on internals.
- Function names describe the result, not the mechanism.
- Type assertions limited to `as const` and `as unknown` (the `no-type-assertion-except-unknown` Biome plugin enforces, but the rule must hold even where the plugin doesn't lint, e.g. type-only files).
- `noExplicitAny` — no `any`.
- `noUncheckedIndexedAccess` honoured.
- `pnpm exec biome lint` passes on changed files.
- `pnpm exec knip` clean on the workspace.
- **`useEffect` is a smell.** Every `useEffect` introduced or modified in the diff has to justify itself in the row's evidence — what external system is being synchronised, why CSS / derived state / event handlers / `useSyncExternalStore` couldn't do it. Effects that watch React state to set other React state are the classic anti-pattern (almost always `useMemo` in disguise) and land FAIL. Effects that subscribe to globals (`addEventListener`, `setInterval`, `MutationObserver`, `matchMedia`) or run a one-time mount-side replace (URL replaceState mirroring initial state) are legitimate and PASS with a one-line note. See CLAUDE.md "Clean code" and [*You Might Not Need an Effect*](https://react.dev/learn/you-might-not-need-an-effect).

### C. Tests pass

For each touched workspace, run the test script and capture exit code + tail of output.

- App workspaces: `pnpm --filter <pkg> run test`. **A workspace that touched any `*.utils.ts` file but has no `test` script is FAIL** — utilities are coverage-gated by repo rule (CLAUDE.md "Clean code"), so a missing runner is a missing gate, not an "ah well".
- Coverage-gated workspaces (`infra/cdk`, `infra/shared`): `pnpm --filter <pkg> run test:coverage`. <100% is FAIL.
- A workspace with no `*.utils.ts` files and no test script is UNVERIFIABLE with a note — not a free PASS.

The validator additionally enumerates every `*.utils.ts` file in the touched workspaces and confirms each one has a sibling test (`*.utils.test.ts`) that the runner picks up. Files matching `*.utils.ts` without a corresponding test file are FAIL.

### D. Test coverage of spec

`/technical-validation` and `/visual-validation` split the work. **Each behavioural assertion belongs to exactly one of them — never both.** Category D below covers only the assertions assigned to *this* validator. Browser-runtime assertions live in `/visual-validation`'s report.

The split:

- **In scope for category D** — assertions whose ground truth is a pure function or a deterministic non-DOM behaviour. Unit tests in `*.utils.test.ts` (or, when integration is required, a JSDOM-backed test) cover them. Examples: RNG determinism, URL parser behaviour, palette validators, dominant-colour selection, keyboard-event guards.
- **Out of scope for category D — handled by `/visual-validation`.** Assertions whose ground truth lives in the running browser: rendered layout, animation visibility, focus rings, click → screenshot diff, viewport-driven layout shifts, media-query-driven defaults (`prefers-reduced-motion`, `prefers-color-scheme`), DOM side-effect-only flows like the PNG download.

The spec's *Test strategy* section enumerates which assertions go where. The **"UI behavioural assertions — `/visual-validation`"** sub-section lists every assertion that is *not* this validator's concern. Procedure:

1. Read that sub-section first.
2. Build the category D row list from the spec's "Use cases / edge cases" minus everything routed to `/visual-validation`. The remaining rows are pure-function or deterministic non-DOM behaviours.
3. Note in the report's preamble: `N use cases routed to /visual-validation; out of scope for this report.`
4. For each in-scope row, locate a test that exercises it. Quote the test's `describe`/`it` text and file:line. If no test exists, the row is **FAIL** — the spec asked for unit coverage and the implementation didn't deliver.
5. **Do not emit UNVERIFIABLE rows for visual-routed assertions.** They are not your job; tagging them UNVERIFIABLE pretends they are and clutters the report.

**Manual-sweep waivers are not honoured.** The repo's spec rule (see `.claude/skills/specification/SKILL.md`) forbids manual-sweep test strategies. If the spec under validation has one anyway, the validator emits a single FAIL row at the top of category D titled "Spec waives autonomous coverage — non-conformant" and recommends re-running `/specification` to fix the spec. Do **not** echo UNVERIFIABLE across every use case — one root-cause row, surfaced once.

Trivially-static features that have no behaviour to test (e.g. a static-content page with no logic) skip category D entirely with a note in the preamble.

## What does not get validated

- **Performance** — bundle size, runtime profile, memory. Out of scope; observability concern.
- **Security** — that's `/security-review`.
- **Accessibility audit** — `/visual-validation` covers what the spec asserts; deeper a11y is a separate audit pass.
- **Architectural fit** beyond what the spec/plan named — the validator validates against the spec, not against an architectural opinion the spec didn't carry.

## Verdict semantics

The agent assigns one tag per row:

- **PASS** — the agent observed the assertion to hold; evidence (quoted code with file:line, command output, test description) is in the row.
- **FAIL** — the agent observed the assertion to *not* hold.
- **UNVERIFIABLE** — the agent could not determine pass/fail (missing input, missing test, ambiguous spec).

Final verdict, aggregated across categories A–D:

- All rows PASS → **PASS**.
- ≥ 1 FAIL row → **FAIL**.
- 0 FAIL + ≥ 1 UNVERIFIABLE → **PARTIAL**.

PARTIAL is not PASS.

## Common mistakes

| Typical error | Consequences |
|---|---|
| Skill summarises the implementation for the agent | Validation inherits the bias the standalone rule exists to prevent. |
| Skill dispatches `general-purpose` instead of `technical-validator` | Dedicated agent's frontmatter rules don't apply; validator drifts. |
| Agent reports "tests pass" without running them | First post-merge regression catches the team off-guard. |
| Agent quotes evidence without file:line | Reviewers can't audit the verdict. |
| Conflating C and D | A workspace with one trivial test passes C and silently masks gaps in D. |
| Validating against the implementation, not the spec | Implementer's bug is laundered through validation. |
| Missing-plan UNVERIFIABLE noise | When the plan is missing, the report should say so once, not echo it across every row. |
| Skipping the run on infra workspaces because they're slow | Coverage gate matters most where coverage is mandatory. |

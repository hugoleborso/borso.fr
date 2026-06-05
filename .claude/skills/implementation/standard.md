# Implementation — standard

> Source standard for the `implementation` skill. The skill enforces this; this file is the canonical text it points back to. Edit this file when the standard itself evolves; edit `SKILL.md` when the *enforcement* of it evolves.

## What an implementation phase is

The implementation phase **converts a plan into a diff**. The spec settled product intent; the plan settled engineering intent; this phase produces code, tests, and the docs/screenshots that the validators will read. It is the only phase that produces source-code changes.

It is **not** the place to re-litigate spec decisions or plan decisions. If the implementer hits a question the plan didn't anticipate, the question goes back to `/technical-conception` (or, in a structural case, back to `/specification`) — not into the diff as an inline judgement call.

## Why this phase deserves a skill

Implementation feels like "just write the code", but in an AI-driven repo it has the same failure modes as the upstream phases:

- **Drift** — the diff stops tracking the plan; later rows of the plan get implemented "from memory" and miss decisions.
- **Quality erosion** — the code-quality rules in CLAUDE.md fire at review time, not write time, so an entire feature gets shipped with `r` and `c` and `idx` everywhere; rewriting names later is expensive.
- **Coverage debt** — pure helpers land in `<name>.ts` instead of `<name>.utils.ts`; no test exists; the technical-validator FAILs them; the implementer goes back to add tests one feature later.
- **Sub-skill bypass** — domain skills like `/vite` exist precisely because the implementer would otherwise rediscover their conventions; bypassing them duplicates effort and produces inconsistent codebases.

The implementation skill exists to make these failures structural rather than cultural — checked at write-time, traceable in the plan, and inherited by every future feature.

## Why this matters (Jidoka)

Same lineage as the prior skills: catch defects at the earliest point they can appear. For *clean-code* defects, write-time is earlier than review-time. For *coverage* defects, write-time is earlier than the validator's run. For *plan-drift* defects, walking the plan row-by-row is earlier than reconstructing intent from a diff.

A defect that maps to a plan row has a known origin and a clear fix path. A defect that surfaces at review with no plan row to anchor it costs much more to investigate.

## Audience

The implementer (Claude, in nearly every case in this repo). The skill exists to make sure the implementer:

- Reads the plan before opening any file.
- Walks the plan top-down rather than picking the most interesting bits first.
- Splits pure code into `*.utils.ts` and writes the test alongside.
- Invokes domain sub-skills when the plan named them.
- Runs the pre-flight gates and reads their reports.

## Required behaviours

### Read the plan

Before any edit. Mental model first; without it, the diff drifts. Plan rows that don't exist (e.g. a missing `/technical-conception` run) are blockers — implementation does not proceed.

### Walk the plan's code map

The "How each spec decision becomes code" table is the work order. Implement rows top-down; stop and re-read the plan when a row turns out to need a structural change the plan didn't anticipate.

### Re-walk the plan's §3 Code-quality self-check before pre-flight

The plan ships a *Code-quality self-check* section listing repo-rule risks the plan author flagged for *this* feature ("rename `y` → `candidateYear`", "extract `pickDefaultMonth` to `data.utils.ts`", "no `useEffect` to derive state"). The author wrote them because they predicted the implementation would slip on them — the list is feature-specific, not a generic CLAUDE.md restatement. Re-walk it bullet by bullet against the diff before invoking the pre-flight gates. An unchecked bullet is a blocker: fix the diff. The skill enforces this via procedure step 3a; PR #11's `/technical-validation` FAIL ([`docs/dantotsus/plan-code-quality-self-check-not-walked-at-write-time.md`](../../../docs/dantotsus/plan-code-quality-self-check-not-walked-at-write-time.md)) is the precedent.

### Compose with technical sub-skills

Sub-skills (`/vite`, `/three-js`, `/controller`, `/database`, …) hold domain conventions. Before writing code that touches their surface, invoke them. Missing sub-skills get one-line entries in the plan's *Missing technical skills* section so the loop catches them.

### Pure helpers in `*.utils.ts` at 100% coverage

Repo rule (CLAUDE.md "Clean code"): every pure-function module is named `<thing>.utils.ts`, and every `*.utils.ts` ships with a sibling `*.utils.test.ts` covered at 100%. The rule applies to every workspace, including frontend-only apps. There is no "too small to test" exemption.

If the workspace lacks a test runner, **set one up as part of this implementation**. Vitest + `@vitest/coverage-v8` is the repo default. Wiring is a one-time cost; the absence of a runner cannot be allowed to leak coverage debt into the rest of the codebase.

### Live with the clean-code rules

Names carry intent; magic numbers get named constants; comments document the WHY only; type assertions limited to `as const` / `as unknown`; no `any`; `noUncheckedIndexedAccess` honoured; JSDoc only on shared exports. These rules apply at write time, not at review time.

### Tests track the spec

Every behavioural assertion the spec makes lives somewhere the autonomous validators can find: a `*.utils.test.ts` row for pure-function logic, a `/visual-validation` assertion for UI behaviour, a Vitest+JSDOM row for integration. Manual sweeps are not a coverage path.

### Commit small, push only after gates

Conventional-commit, small focused units. Push only after typecheck, biome, knip, build, `/visual-validation` (UI work), `/technical-validation` (always) all pass. Hooks must not be bypassed; their failures are the gate.

## Procedure

| # | Step | Output |
|---|---|---|
| 1 | Read `spec.md` and `plan.md` end-to-end | mental model |
| 2 | Inventory technical surfaces; invoke each present sub-skill | conventions loaded |
| 3 | Walk the plan's code-map table top-down, applying each change and committing in small units | the diff |
| 3a | **Before creating any file under `apps/<app>/api/src/`**, answer: *"which bounded context owns this?"* The answer names the folder; the layered triad names the filename. Every backend domain folder must contain at minimum `<domain>.controller.ts` + `<domain>.service.ts` + `<domain>.repository.ts` + `<domain>.schema.ts` (plus optional `<domain>.core.ts` and `<domain>.types.ts`). Never create horizontal aggregator folders (`domain/`, `controllers/`, `services/`, `repositories/`, `routes/`) — pure-domain `.core.ts` files live INSIDE the bounded context's folder. The plan's *Where it lands* column names paths; treat path strings as advisory hints, not as licence to bypass the triad. Reference: `apps/last-loop-lepin/api/src/{auth,edition,punch,runner,ranking,media}/`. See CLAUDE.md "Clean code" — *Back-end domains are vertical slices*. | per-domain layered triad |
| 3b | **When `docs/features/<app>/<slug>/spec/design-bundle/` exists, the bundle IS the visual spec — pixel-perfectly, ported to Tailwind + atomic design.** See CLAUDE.md "Clean code" — *Styling is Tailwind classes inline* and *React components follow atomic design*. Concretely, before writing feature UI: (a) read the bundle README + every chat transcript under `design-bundle/chats/` (the chats reveal what the user iterated toward); (b) port `design-bundle/project/src/styles.css` palette + typography into Tailwind v4 `@theme` declarations in `apps/<app>/site/src/styles/tokens.css` — every named CSS variable from the prototype (`--bg-elev`, `--bg-sunk`, every `--ink-*` tone, every `--m-*` member tone, `--accent-soft`, `--warn`, `--t-display` / `--t-ui` / `--t-mono`) becomes a Tailwind utility (`bg-bg-elev`, `text-ink-700`, `font-display`, etc.); (c) wire fonts via `@fontsource-variable/<name>` or `@fontsource/<name>` npm packages imported once in the entry; (d) **decompose every prototype screen into atoms / molecules / organisms**, then place them under `apps/<app>/site/src/components/{atoms,molecules,organisms}/` — atoms are UI primitives (Button, Chip, Badge, Icon, Input), molecules are small compositions (SearchBar, FilterPill, SongCardHeader, MemberChip), organisms are screen-region compositions (CatalogGrid, SetlistEditor, MasteryMatrix); (e) routes under `apps/<app>/site/src/routes/<screen>/` compose organisms — they own routing + data-fetching, NOT layout primitives; (f) every component uses Tailwind utility classes inline, NO raw `.css` files per component, no CSS modules, no styled-components. The visual-validator's design-bundle fidelity rubric (see `.claude/skills/visual-validation/standard.md`) compares each screen's implementation against the prototype side-by-side — typography stack, layout structure, affordances, palette tokens, microcopy must all match. Token-level conformance (accent / bg matches) is NOT design fidelity. | pixel-faithful Tailwind UI on atomic-design hierarchy |
| 4 | For every pure helper introduced, file ends in `.utils.ts` and a sibling `.utils.test.ts` ships with it | tested utilities |
| 5 | Run pre-flight gates (typecheck, biome, knip, build) | green gates |
| 6 | Run `/visual-validation` for UI work; read the report | UI verdict |
| 7 | Run `/technical-validation` always; read the report | code verdict |
| 8 | Push only after both verdicts are PASS | shippable branch |

## Common mistakes

| Typical error | Consequences |
| --- | --- |
| Skipping `/technical-conception` and implementing straight from the spec | Plan-drift; risk register absent; defects rediscovered late. |
| Naming a pure helper `<name>.ts` instead of `<name>.utils.ts` | Coverage gate misses it; technical-validator FAILs the row; rewrite filename in a follow-up commit. |
| "I'll add tests later" | Later never comes; coverage debt compounds; a future feature inherits the gap. |
| Stuffing pure helpers into a file with DOM / network code | The file can't be coverage-gated cleanly. Split it. |
| Creating a horizontal `domain/` (or `controllers/`, `services/`, `repositories/`, `routes/`) folder in `api/src/` | Forbidden by CLAUDE.md. Pure-domain `.core.ts` files live in the bounded context's folder (`song/tonality.core.ts`, not `domain/tonality.core.ts`). The technical-validator FAILs the row; rewrite the folder structure in a follow-up commit. |
| Shipping a controller without its sibling `service` / `repository` / `schema` files | Layered triad missing. The controller ends up with DB queries + business rules + HTTP shape co-mingled. Split into the four files; the controller carries only Hono routing + response shape. Pattern reference: `apps/last-loop-lepin/api/src/punch/`. |
| Skipping an existing sub-skill | The sub-skill's conventions go unenforced; defects predicted by it ship anyway. |
| Bypassing a hook (`--no-verify`) | Repo rule says never. The gate exists because culture wasn't enough. |
| Deferring the test-runner setup | The implementation lands without coverage and the next session inherits a broken gate. |
| One giant commit at the end | Reviewers (and the technical-validator) cannot bisect; risk regression goes up. |
| Implementing rows out of order to chase the interesting parts first | Plan rows that depend on earlier ones get implemented against an incomplete foundation; refactor cost balloons. |

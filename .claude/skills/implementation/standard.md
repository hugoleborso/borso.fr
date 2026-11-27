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

## Required behaviours

### Open the blueprint for the layer before writing the file

Every layer this repository writes has a canonical example marked in place with a `@Blueprint` JSDoc block, and [`blueprint-index.md`](../../../.claude/skills/blueprint/blueprint-index.md) maps identifier to file and line. Read the index, open the blueprint for the layer you are about to write, and copy its shape. New code that follows one carries `// @FollowsBlueprint <id>` on the line above the declaration, which is what makes adoption countable rather than assumed.

A standard states the rule and a blueprint is the working instance of it, so the two are read together: [`docs/standards/`](../../../docs/standards/README.md) for what is required, the blueprint for the shape to copy. When they disagree the standard wins and the blueprint is stale.

When the layer has no blueprint, say so and write the file against the standard, then propose the blueprint in the same change rather than leaving the next author with the same gap. [`blueprint-coverage.html`](../../../.claude/skills/blueprint/blueprint-coverage.html) is where to check before assuming one exists.

The pre-commit hook and CI both run the generators in `--check` mode, so a missing tag, a duplicated identifier, a `// @FollowsBlueprint` naming a blueprint that does not exist, or a stale generated file fails the gate. Do not run them by hand.

### Compose with technical sub-skills

Sub-skills (`/vite`, `/three-js`, `/controller`, `/database`, …) hold domain conventions. Before writing code that touches their surface, invoke them. Missing sub-skills get one-line entries in the plan's *Missing technical skills* section so the loop catches them.

### Pure helpers in `*.utils.ts` at 100% coverage

Repo rule (CLAUDE.md "Clean code"): every pure-function module is named `<thing>.utils.ts`, and every `*.utils.ts` ships with a sibling `*.utils.test.ts` covered at 100%. The rule applies to every workspace, including frontend-only apps. There is no "too small to test" exemption.

If the workspace lacks a test runner, **set one up as part of this implementation**. Vitest + `@vitest/coverage-v8` is the repo default. Wiring is a one-time cost; the absence of a runner cannot be allowed to leak coverage debt into the rest of the codebase.

### Live with the clean-code rules

Names carry intent; magic numbers get named constants; no prose comments (`borso/no-comments`); type assertions limited to `as const` / `as unknown`; no `any`; `noUncheckedIndexedAccess` honoured; JSDoc only on shared exports. These rules apply at write time, not at review time.

### Tests track the spec

Every behavioural assertion the spec makes lives somewhere the autonomous validators can find: a `*.utils.test.ts` row for pure-function logic, a `/visual-validation` assertion for UI behaviour, a Vitest+JSDOM row for integration. Manual sweeps are not a coverage path.

### Commit small, push only after gates

Conventional-commit, small focused units. Push only after build, `/visual-validation` (UI work) and `/technical-validation` (always) pass. The commit and push hooks run typecheck, oxlint, oxfmt, knip and the changed tests, so do not run them by hand. Hooks must not be bypassed; their failures are the gate.

When the verdict asserts a **routing or auth property that differs by stage** (e.g. "same-origin `/api`"), name the stage(s) where it holds — *"same-origin in prod, cross-origin via `VITE_API_BASE` in preview by design"* — never a bare yes/no. A stageless claim gets inherited verbatim by the next validator and flagged as a FAIL that is actually by-design. Cf. [`docs/knowledge/preview-api-cross-origin.md`](../../../docs/knowledge/preview-api-cross-origin.md).

## Two rules the procedure in SKILL.md leaves out

- per-domain layered triad |
- pixel-faithful Tailwind UI on atomic-design hierarchy |

## Common mistakes

| Typical error | Consequences |
| --- | --- |
| Creating a horizontal `domain/` (or `controllers/`, `services/`, `repositories/`, `routes/`) folder in `api/src/` | Forbidden by CLAUDE.md. Pure-domain `.core.ts` files live in the bounded context's folder (`song/tonality.core.ts`, not `domain/tonality.core.ts`). The technical-validator FAILs the row; rewrite the folder structure in a follow-up commit. |
| Shipping a controller without its sibling `service` / `repository` / `schema` files | Layered triad missing. The controller ends up with DB queries + business rules + HTTP shape co-mingled. Split into the four files; the controller carries only Hono routing + response shape. Pattern reference: `apps/last-loop-lepin/api/src/punch/`. |
| One giant commit at the end | Reviewers (and the technical-validator) cannot bisect; risk regression goes up. |
| Implementing rows out of order to chase the interesting parts first | Plan rows that depend on earlier ones get implemented against an incomplete foundation; refactor cost balloons. |

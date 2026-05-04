---
name: implementation
description: Execute the engineering plan in `plan.md`, enforcing the repo's clean-code rules and test-coverage rules as the code is written rather than discovered after the fact by `/technical-validation`. Use when the user says "/implementation", "implement the plan", "ship the feature", "write the code", or as the natural next step after `/technical-conception`. Loads `spec.md` + `plan.md`, walks the plan's table row-by-row, splits pure helpers into `*.utils.ts` with sibling `*.utils.test.ts` at 100% coverage, applies CLAUDE.md "Clean code" rules (named constants, no abbreviations, type-assertion ban, comments document WHY only), composes with technical sub-skills (`/vite`, `/three-js`, `/controller`, `/database`, …) for domain-specific guidance, and runs pre-flight gates before push. Reads the standard at `.claude/skills/implementation/standard.md` before starting.
---

# Implementation skill

The implementation phase **executes the plan**. The spec said *what*; the plan said *where and how*; the implementation lays down code, tests, and the assets that make the gates pass. It is the only phase that produces a diff.

The canonical standard lives at [`standard.md`](./standard.md). Read it before starting.

## When to invoke

Invoke when:
- A plan exists at `docs/features/<app>/<slug>/plan/plan.md` and is current.
- The spec at `docs/features/<app>/<slug>/spec/spec.md` carries no `> ⚠️ Missing …` flag.
- The user signals "go": `/implementation`, "ship it", "write the code", "let's do it now".

Do **not** invoke when:
- The plan is missing — run `/technical-conception` first.
- The spec is flagged — close the missing-perspective discussion before code.
- The work is a one-line fix or a mechanical refactor — direct edit, no ceremony.

## Composability with technical sub-skills

The plan's *Inventory the technical surface* step (from `/technical-conception`) lists which sub-skills apply. Before writing code that touches one of those surfaces, **invoke that sub-skill** via the `Skill` tool to get domain-specific guidance:

- `/vite` — multi-page, plugin order, asset handling, env vars.
- `/three-js` — scene / camera / loop conventions, ref handling, perf.
- `/controller` — controller-shape conventions for the project.
- `/database` — migration conventions, `dsql` rules, schema-vs-data separation.
- (any other skill the plan named).

If a needed sub-skill doesn't exist, write the slice yourself and add a one-line `Missing technical skill: /<name>` row to the plan's *Missing technical skills* section so the loop catches it.

The seed library for these sub-skills is patterns.dev (<https://www.patterns.dev/ai/skills/>) — copy a relevant skill in, then rewrite to the repo's conventions before adding to `.claude/skills/`.

## Load-bearing rules (enforced as you write)

These come from CLAUDE.md and the plan; restated here so they fire at *write* time, not at *review* time. A defect that slips past these here is a defect `/technical-validation` will catch — but the cost of fixing late is much higher than the cost of writing it correctly first.

### 1. Pure helpers go in `*.utils.ts` at 100% coverage

Repo rule (CLAUDE.md "Clean code"): any file whose contents are deterministic, side-effect-free functions (RNG, parsers, formatters, transformers, palette/title/url builders, etc.) is named `<thing>.utils.ts` and ships at 100% statement / branch / function / line coverage in the workspace's test runner.

The rule has no exemption for:
- "Too small to test" — utilities are *cheaper* to test precisely because they are small.
- "Frontend-only app" — Vitest is two dependencies (`vitest`, `@vitest/coverage-v8`) and a 5-line `vitest.config.ts`.
- "We'll add tests later" — later never comes; ship them with the helper.

The implementer's checklist:

- [ ] Every new pure helper file ends in `.utils.ts`.
- [ ] Every `*.utils.ts` has a sibling `*.utils.test.ts`.
- [ ] The workspace's `package.json` has a `test` script that runs the runner.
- [ ] The runner is configured to fail under 100% coverage on any `*.utils.ts`.
- [ ] Modules that mix pure helpers with side-effect code are **split**, not waived. The pure half goes in `<name>.utils.ts`; the rest stays in `<name>.ts`.

If the workspace doesn't yet have a test runner, **set one up as part of this implementation**, not as a follow-up. Vitest is the repo's default for browser/Node code; the `@vitest/coverage-v8` provider gives the per-file coverage gate.

### 2. CLAUDE.md "Clean code" rules

Live as you write, not as you review:

- **Names carry intent.** `secondsElapsed`, not `t`. `currentRect`, not `r`. `nextRandom`, not `rng`. Repo rule, no exceptions outside trivial loop indices.
- **Magic numbers / strings get named constants.** A bare `5500` becomes `CASCADE_INTERVAL_MS`. The const declaration documents the choice.
- **Comments document the WHY only.** Default to none. Only when a future reader would otherwise misread (non-obvious infra constraints, third-party bug workarounds, behaviour the code can't make obvious itself).
- **Type assertions are restricted.** Only `as const` and `as unknown` allowed. For narrower typing after `as unknown`, write a TS type guard or a Zod schema.
- **No `any`.** `noExplicitAny` is hard-banned. If you can't type something, that's a design problem, not a typing problem.
- **`noUncheckedIndexedAccess` is on.** Every array access has a fallback (`?? default`) or a guard (`if (!current) break`). No `arr[0]!` workarounds.
- **JSDoc only on shared / exported functions** — and only to capture contract the types don't carry. No JSDoc on internals.
- **`useEffect` is a smell.** Before writing `useEffect`, try the alternatives in this order:
  1. **Derived state** — compute the value during render (a plain expression, or `useMemo` if expensive). Most "set state when prop X changes" effects are derived state in disguise.
  2. **Event handlers** — do the work in `onClick` / `onChange` / etc., not in an effect that watches the resulting state.
  3. **CSS** — media queries, animations, transitions, hover/focus pseudo-classes. If the only thing your effect drives is text content or a class flip on a media query, CSS does it without re-renders. (See the `useCoarsePointer` removal in commit history for the canonical example.)
  4. **`useSyncExternalStore`** — for third-party stores or browser APIs that already expose subscribe/unsubscribe, this is the React-team-recommended escape hatch.
  Reach for `useEffect` only when you genuinely need to synchronise React state with an external system — focus management after a real user action, `addEventListener` for global keyboard shortcuts, an interval/observer that owns its own lifecycle, a `replaceState` reflecting initial state into the URL once on mount. If you're updating React state inside an effect that watched another piece of React state, you've almost certainly recreated `useMemo`. See [*You Might Not Need an Effect*](https://react.dev/learn/you-might-not-need-an-effect). Every effect that survives the filter should be obvious-on-rereading why it earned its place; a future `/technical-validation` will ask.

### 3. Tests track the spec

For every numbered happy-path step, every edge case, every error case in the spec's *Use cases / edge cases* section: write the assertion **somewhere the autonomous validators can find it.**

- Pure-function assertions → `*.utils.test.ts`.
- UI behavioural assertions → automatically picked up by `/visual-validation` from the spec — but the *code* must support them (deterministic seeds in URL state, stable selectors, accessible labels).
- Integration assertions (URL state, history, focus management) → either a Vitest test against a JSDOM render, or a visual-validation row.

Manual sweeps are not a valid coverage path — repo rule.

## Procedure

1. **Read** `spec.md` and `plan.md` end-to-end. Build a mental model.
2. **Inventory** technical surfaces. For each, invoke the matching sub-skill via `Skill` if one exists. Note any missing.
3. **Walk the plan's "How each spec decision becomes code" table top-down.** For each row:
   a. Open the file the row points at (or create it).
   b. Apply the change.
   c. If the change is a pure helper, the file ends in `.utils.ts`; write the matching `.utils.test.ts` alongside it.
   d. Update local commits as you go — do not save the diff for one giant commit.
4. **Run the plan's pre-flight gates** in order. Fix issues, do not bypass.
5. **Run `/visual-validation`** for UI work. Read the report; the verdict must be PASS before push.
6. **Run `/technical-validation`** always. Read the report; the verdict must be PASS before push.
7. **Push.** The branch's CI is the last gate; the local gates are stricter.
8. **Open the PR.** A **FAIL** validator verdict is fix-required — do not open a PR while the latest validation report is FAIL. A **PASS_EXCEPT_UNVERIFIABLE** verdict is mergeable, but the PR description must include a `## Validation gaps` section listing the UNVERIFIABLE rows verbatim with the one-line reason + report-path link. **PASS** ships without per-row disclosure. Either way, the PR description includes a `## Visual evidence` section with the screenshots from the latest visual-validation report — see `/visual-validation`'s "Visual evidence in the PR body" section for the SHA-pinned-raw-URL generator. Reviewers read the PR description, not the validation report; the gap and the visuals have to be up-front.

> **The skill ends here.** Prod deploys are NOT a step of `/implementation`. Per CLAUDE.md "Deployments" + "Don'ts", `pnpm --filter @borso-app/<app> run deploy` (and the `@borso/infra` / `@borso/shared-infra` equivalents) require explicit human approval, every time, run from the user's own terminal. Preview deploys are automatic on PR push; the implementation skill does not invoke either. If at any point in this skill you find yourself about to type a prod-deploy command, stop and ask the user.

## Failure modes to avoid

- **Skipping `/technical-conception`** — implementing straight from the spec misses the plan's risk register and self-checks; the implementer ends up rediscovering the same questions.
- **Naming a pure helper `something.ts`** — it isn't covered, the technical-validator FAILs the row, and you're rewriting filenames in a follow-up commit.
- **"I'll add tests later"** — repo rule says no. The next commit is the test, not "later".
- **Stuffing utilities into a file that also has DOM/network code** — split. The pure half is `<name>.utils.ts`; the rest stays in `<name>.ts`. Mixed files cannot be coverage-gated cleanly.
- **Skipping a sub-skill that exists** — domain knowledge in the sub-skill goes unenforced; defects predicted by it ship anyway.
- **Bypassing a hook** with `--no-verify` — repo rule says never. Fix the hook failure.
- **Deferring the test-runner setup** — if the workspace has no Vitest yet, set it up *as part of this implementation*. Otherwise the implementation lands without coverage and the next session inherits a broken gate.

## Repo-specific notes

- pnpm always; no npm/yarn.
- Conventional-commit scopes: `borso-fr`, `borsouvertures`, `infra`, `ci`, `docs`, `deps`. Multi-commit per feature is fine; small, focused commits beat one giant landing.
- `infra/cdk` and `infra/shared` are 100%-coverage gated by hook; their pre-commit runs `test:coverage` before letting the commit through.
- Reports from validators land at `docs/features/<app>/<slug>/validation/`; commit them alongside the implementation diff in the same PR.

## Auto-chain on PR merge: `/after-task-dantotsus`

After step 8 the agent's job in `/implementation` is done. The chain continues *off-session* — when GitHub fires `pull_request.closed` with `merged: true` (visible to the agent as a `<github-webhook-activity>` block), the agent immediately invokes `/after-task-dantotsus` for the merged PR. If the agent is not subscribed to the PR's webhook activity, it asks the user once whether to subscribe. See [`docs/dantotsus/feature-flow-skills-do-not-auto-trigger.md`](../../docs/dantotsus/feature-flow-skills-do-not-auto-trigger.md).

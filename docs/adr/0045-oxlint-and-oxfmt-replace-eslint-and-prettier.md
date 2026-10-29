# ADR-0045: oxlint and oxfmt replace ESLint and Prettier

- **Status:** accepted
- **Date:** 2026-10-27
- **Deciders:** Hugo Borsoni
- **Tags:** meta, tooling, linting, gates
- **Supersedes:** ADR-0007

## Context

[ADR-0007](./0007-eslint-with-type-aware-rules-replaces-biome.md) chose ESLint
with type-aware rules because the standards need type information, and it
accepted a much slower lint for it. [Standard 14](../standards/14-tool-runtime-budgets.md)
then gave every hook a runtime budget: 300 ms of CPU per check on the commit,
about 3 s for a whole commit, 60 s for a push and 10 minutes for CI.

ESLint does not fit those budgets. One changed pragma file took 21 s on the
commit, because ESLint builds a TypeScript program for the workspace before it
runs a rule. A cold run over the repository took 454 s, and one process for the
whole repository ran out of heap, so it ran one process per workspace behind a
cache that replayed fixed type errors three times. Prettier took 43.7 s to check
the repository. The first answer to the budget moved ESLint and five other
checks from the commit to the push and CI, and the operator rejected that: a
check should stay where it was, or move earlier, and the tool should get faster
instead.

Two constraints close doors before the trade-off. No rule may be lost, the
custom rules under `eslint-rules/` included. And the
`// eslint-disable-next-line <rule> -- <reason>` convention has to keep working,
with a reason required and an unused directive refused.

## Decision

**oxlint, with tsgolint for the type-aware rules and JavaScript plugins for the
rest, plus oxfmt.** `.oxlintrc.json` holds every rule the ESLint configuration
turned on. oxlint runs the rules it implements natively in Rust, hands the
type-aware ones to `oxlint-tsgolint`, which builds programs with the TypeScript
7 compiler, and loads the custom rules under `eslint-rules/` as a JavaScript
plugin unchanged. Where oxlint has no rule, or has one that disagrees with the
ESLint plugin on this repository's code, the upstream ESLint rule itself runs as
a JavaScript plugin under an alias (`unicorn-js`, `jsx-a11y-js`,
`react-hooks-js`, `eslint-js`). oxfmt replaces Prettier with the same settings
and the same ignore list, markdown still excluded. ESLint stays installed for
the two core rule files `eslint-js` loads and as the upstream plugins' peer;
the RuleTester suites run on oxlint's own tester
([ADR-0046](./0046-typescript-7-replaces-typescript-5-9.md)).

On the commit, `scripts/lint-staged-files.sh` runs every rule, the type-aware
ones included, over the staged files. tsgolint builds the program of the
`tsconfig.json` nearest each file, so it lints from a temporary tree in which
each touched workspace's `tsconfig.json` extends the real one and lists only
the staged files. The configuration is split in two halves run side by side,
the JavaScript plugins' rules and everything else, and a directive is reported
as unused only when both halves report it. The commit budget is 4 s rather
than 3 s to make room for the type-aware rules: the operator's decision of
2026-10-27. A 3.5 s budget came first, and the same fixture commit on CI's
runner took 1.8 to 3.4 s over seven runs, so the runner's spread alone could
fail it.

## Consequences

- `+` The lint and format checks are back on the commit, every rule and the
  unused-directive report included, where ESLint ran them on main. A one-file
  pragma commit lints in about 2 s of wall time and 4 to 5 s of CPU, against
  5.2 s and 12.5 s with the program of the whole workspace.
- `+` The whole repository lints in one process in 28 to 38 s with the
  type-aware rules, against 454 s cold for ESLint, so there is no lint cache
  left to replay a stale error. oxfmt checks the repository in 1.5 s.
- `+` The enforcement ledger reads `.oxlintrc.json` directly, 0.5 s, where it
  built an ESLint instance per probe for 6.4 s, so it runs on the commit again.
- `-` The commit budget grows from 3 s to 4 s, and a commit touching several
  components or workspaces can still go past it: five pragma components took
  4.2 to 4.6 s on a shared machine.
- `-` The commit's program holds the staged files and what they import, not
  the whole workspace. A type-aware finding that depends on a file the commit
  does not import is found on push and in CI instead. A directive naming one
  rule from each half, one of them unused, is reported only in CI.
- `-` Rule names change where oxlint has its own: `@typescript-eslint/` becomes
  `typescript/`, `react-hooks/` becomes `react/`, `import-x/` becomes
  `import/`. Directives keep working under the old names, but a new directive
  for a rule run through an alias has to use the alias, such as
  `jsx-a11y-js/no-autofocus`.
- `-` Four rules are read through the inside of their package rather than its
  public entry point: `unicorn-js` imports single rule files from
  `eslint-plugin-unicorn`, whose `exports` map offers only the whole plugin,
  which costs 0.7 s to load. A version bump that moves those files fails the
  config load, loudly.
- `~` `import/no-cycle` resolves `.ts` imports where `import-x/no-cycle` never
  did, so it found 26 cycles across 15 files that ESLint had never reported.
  Those 15 files are listed in an override that turns the rule off for them, so
  the rule fails no commit it did not fail before, and catches any new cycle
  elsewhere. Removing the cycles is a change of its own.

## Alternatives considered

### Option A — oxlint with JavaScript plugins, and oxfmt (chosen)

- **Summary:** as in the decision.
- **Strengths:**
  - Every rule keeps running, measured: on the whole tree both linters report
    nothing, and on a set of planted violations they report the same 55
    findings on the same lines, with the three differences listed in the PR.
  - Fits the 4 s commit budget with every rule, through a program of the
    staged files.
- **Costs:**
  - Two dependencies for linting, one for formatting, and alias names for the
    rules oxlint runs from upstream ESLint plugins.
- **Rationale:** the only option that keeps every rule and brings the checks
  back to the commit.

### Option B — oxlint for what it covers, ESLint for the rest (rejected)

- **Summary:** the configuration the brief described: oxlint for its native
  rules, and a reduced ESLint configuration running only the rules oxlint
  cannot run.
- **Strengths:** every rule keeps running on its original engine.
- **Costs:** ESLint's start-up and parser load on every commit, about a second.
- **Rejection rationale:** two linters cannot both report unused disable
  directives. Each sees the other's directives as unused, so one of them has to
  stop reporting, and the convention loses half of its check. Loading the same
  upstream rules into oxlint gives the same verdicts without that conflict.

### Option C — keep ESLint and Prettier, run them later (rejected)

- **Summary:** the first version of this pull request: ESLint and five
  generators move from the commit to the push and CI.
- **Strengths:** no new dependency.
- **Costs:** a type error or a lint error found a push later, every time.
- **Rejection rationale:** the operator rejected moving checks right.

## Evaluation rubric

| Criterion | Weight | Why it matters |
|---|---|---|
| No rule lost | high | The standards cite each rule as their enforcement |
| Fits the commit budget | high | Standard 14; a slow gate is paid on every commit |
| The disable convention keeps its checks | medium | A reason required, an unused directive refused |
| Dependencies added | low | Each one is an ADR trigger |

|  | Option A | Option B | Option C |
|---|---|---|---|
| No rule lost | ✓ native, tsgolint or upstream plugin | ✓ | ✓ |
| Fits the commit budget | ✓ at 4 s, the operator's 2026-10-27 decision | ✗ ESLint start-up on every commit | ✗ checks leave the commit |
| Disable convention | ✓ on the commit, on push and in CI | ✗ one linter must stop reporting | ✓ |
| Dependencies added | ✗ three | ✗ three | ✓ none |

## Implementation pointers

- Files: `.oxlintrc.json`, `.oxfmtrc.json`, `eslint-rules/js-plugins/`,
  `scripts/lint-repository.sh`, `scripts/lint-staged-files.sh`,
  `.husky/pre-commit`, `.husky/pre-push`,
  `scripts/standards/lint-configuration.core.ts`
- Standards: [12. Linting and gates](../standards/12-linting-and-gates.md),
  [14. Tool runtime budgets](../standards/14-tool-runtime-budgets.md)
- Related ADRs: supersedes ADR-0007; ADR-0046 for the TypeScript 7 compiler
  tsgolint and the type checks use
- Commit: stamped on merge

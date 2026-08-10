# ADR-0007: ESLint with type-aware rules replaces Biome

- **Status:** Accepted
- **Date:** 2026-08-08
- **Deciders:** Hugo Le Borso
- **Tags:** meta, tooling, linting, ci, gates
- **First applied in:** PR #40 (`claude/complete-sites-refactoring-yr8pqd`)

## Context

Biome did linting and formatting for the whole monorepo in one Rust binary. It
was fast: 3.5 s for both, over every workspace, cold.

The brief for PR #40 asked for standards that a machine can check. Writing them
down produced thirteen documents, and about half the rules in them cannot be
checked without type information:

- "conditions live in pure functions" needs to know whether an expression is a
  narrowing check on a nullable type or a comparison between two domain values.
- "no type assertion except `as unknown` and `as const`" was already enforced,
  but by a Biome GritQL plugin, which is syntax-only and could not tell
  `as unknown as Foo` from `as unknown`.
- The `@typescript-eslint` `no-unsafe-*` family, `no-unnecessary-condition`,
  `no-floating-promises` and `no-misused-promises` are type-aware by
  construction. Biome has no equivalent and cannot have one without a type
  checker.

Biome's plugin surface is GritQL patterns. Six existed in the repo. Writing
twenty more, several of which need type information, was not possible.

The formatting question is separable from the linting question, but the tools
are not: dropping Biome's linter means dropping its formatter too.

## Decision

**Replace Biome with ESLint 10 flat config plus Prettier. Enable
`typescript-eslint` on `strictTypeChecked` and `stylisticTypeChecked` with
`projectService: true`, accepting a cold lint of roughly 80 s in exchange for
type-aware rules. Record the existing violations in `eslint-suppressions.json`
rather than fixing them all before the first commit, and rely on `.eslintcache`
plus a CI cache to keep the warm path at the old cost.**

Three parts of this are load-bearing:

1. **`projectService` rather than an explicit `project` array.** Six workspaces
   with their own `tsconfig.json` plus root config files means a hand-maintained
   list would drift. `projectService` resolves the nearest config per file and
   handles files that belong to no project via a separate `allowDefaultProject`
   block.
2. **A local `borso` plugin under `eslint-rules/`, in plain JavaScript, with a
   `RuleTester` suite per rule.** No build step, so the rules load from
   `eslint.config.js` directly. 26 rules, 444 tests.
3. **Suppressions rather than warnings.** Every rule sits at `error` from day
   one. The 1,631 pre-existing violations went into `eslint-suppressions.json`,
   which is keyed by file and rule, so a new violation in a touched file fails
   the build.

## Consequences

- `+` **Rules that need types now exist.** Roughly half the standards documents
  name an enforcement mechanism that was impossible before.
- `+` **Custom rules are ordinary JavaScript with ordinary tests.** A GritQL
  pattern could not be unit-tested; a `RuleTester` case can, and the 444 of them
  are what makes the rules trustworthy enough to run at `error`.
- `+` **The debt is countable.** `eslint-suppressions.json` shrinks or it does
  not, and the number is in the diff either way.
- `−` **Cold linting is 23 times slower.** 3.5 s became 80.7 s. Measured on the
  sandbox that ran the migration; see
  [`docs/knowledge/gate-timings-before-and-after.md`](../knowledge/gate-timings-before-and-after.md).
  CI absorbs this on a cache miss, which is every change to the lockfile,
  `eslint.config.js` or `.prettierrc.json`.
- `−` **Two tools where there was one.** A contributor now needs both to be
  configured in their editor, and formatting drift is a separate CI step rather
  than a side effect of the linter.
- `−` **Prettier does not format markdown here.** It rewrites `*emphasis*` to
  `_emphasis_` and pads table cells with no option to stop, which produced 236
  files of churn on the first run. `**/*.md` is in `.prettierignore`, so
  markdown is hand-formatted and nothing checks it.
- `~` **The commit hook can no longer see cross-file rules.** It lints staged
  files only, so `import-x/no-cycle` and the layering rules are effectively
  CI-only. This was a deliberate trade to keep the commit hook under 3 s.

## Alternatives considered

### Option A — ESLint with type-aware rules, Prettier for formatting (chosen)

- **Summary:** full `strictTypeChecked` + `stylisticTypeChecked`, custom rules in
  a local plugin, Prettier for formatting, suppressions for existing violations.
- **Strengths:** the only option where the standards documents are enforceable
  as written; the largest rule ecosystem; `RuleTester` makes custom rules
  reviewable.
- **Costs:** 23× slower cold; two tools; a suppressions file to carry.
- **Rationale:** the cost is a one-time wait on a cache miss. The benefit is
  every rule the standards name.

### Option B — Keep Biome, write the remaining rules as GritQL plugins (rejected)

- **Summary:** stay on one fast binary, express the twenty new rules as GritQL
  patterns.
- **Strengths:** 3.5 s stays 3.5 s; one tool; no suppressions file.
- **Costs:** GritQL is syntactic. It cannot distinguish a null check from a
  domain comparison, cannot see through a type alias, and cannot be unit-tested.
  The six existing plugins were already the easy cases, and two of them were
  imprecise in ways the ESLint ports fixed.
- **Rejection rationale:** roughly half the standards would have had to be
  downgraded from "enforced" to "reviewed", which is the failure mode the whole
  branch exists to avoid.

### Option C — Biome for formatting, ESLint for linting (rejected)

- **Summary:** keep Biome's formatter, which is fast and has no markdown
  problem, and add ESLint alongside it for rules.
- **Strengths:** formatting stays fast; markdown stays untouched without an
  ignore file.
- **Costs:** two formatters' opinions have to be reconciled — `eslint-config-prettier`
  exists to disable ESLint's stylistic rules against *Prettier*, not against
  Biome, so every stylistic conflict would be found by hand. Contributors would
  need three tools configured.
- **Rejection rationale:** the reconciliation work is unbounded and recurring on
  every ESLint upgrade, against a saving of about 14 s on a cold format check.

### Option D — ESLint without type-aware rules (rejected)

- **Summary:** flat config, no `projectService`, syntax-only rules.
- **Strengths:** cold lint stays in single-digit seconds; no per-workspace
  TypeScript program to build.
- **Costs:** identical to Option B in what it cannot check, but without Biome's
  speed.
- **Rejection rationale:** strictly worse than both A and B.

## How this is enforced

- `.github/workflows/ci.yml` runs `eslint .` and `prettier --check .` as separate
  steps in the `build` job, and caches `.eslintcache` and the Prettier cache keyed
  on `pnpm-lock.yaml`, `eslint.config.js` and `.prettierrc.json`.
- `.husky/pre-commit` lints and formats the staged files.
- `pnpm run test:eslint-rules` runs the 444 `RuleTester` cases, in CI and on push.
- ESLint exits non-zero on an unused suppression, so a fixed violation cannot sit
  in the inventory pretending to be debt.

## See also

- [`docs/standards/12-linting-and-gates.md`](../standards/12-linting-and-gates.md)
- [`docs/knowledge/gate-timings-before-and-after.md`](../knowledge/gate-timings-before-and-after.md)
- [ADR-0008](./0008-purity-enforced-structurally.md), which depends on the custom
  rule mechanism this ADR introduces.

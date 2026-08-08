# What the gates cost, before and after the ESLint migration

Every number here was measured on the sandbox that ran the refactor, on the
commits named. None is an estimate. Where a measurement is confounded, the entry
says so rather than quoting it anyway.

The short version. Linting got much slower cold and stayed the same warm, so the
caches are what make it affordable. Committing got faster, because the commit
hook now lints the staged files rather than the repository. Pushing got slower
by design, since the infra coverage suites moved there and mutation testing is
new. The test suites roughly doubled in size and in wall-clock, because the
refactor added around 90 pure files with full coverage.

## Linting and formatting

Biome did linting and formatting in one binary. It is now ESLint plus Prettier.

| Check | Biome, before | ESLint and Prettier, after |
|-------|---------------|----------------------------|
| Lint the repository, cold | 3.5 s | 80.7 s |
| Lint the repository, warm cache | not applicable | 3.2 s |
| Format check, cold | included in the 3.5 s | 20.4 s |
| Format check, warm cache | not applicable | 6.6 s |
| Lint three staged files, warm | not applicable | 2.9 s |

A cold ESLint run is 23 times slower than the whole Biome check. The reason is
type-aware linting: `typescript-eslint` builds a TypeScript program for every
workspace before a single rule runs, which is what buys
`no-unnecessary-condition`, the `no-unsafe-*` family, and the type-aware parts
of the custom rules. Biome had no type information and could not have run those
rules at any speed.

The warm number is what a developer actually feels, and it is unchanged.

## Git hooks

| Hook | Before | After |
|------|--------|-------|
| pre-commit, typical | Biome over the repository, plus infra coverage when infra changed | ESLint and Prettier over the staged files, plus three greps |
| pre-commit, measured | about 3.5 s, or about 28 s when infra changed | 2.9 s for a three-file commit |
| pre-push, without mutation testing | 2.5 s, knip only | 3.2 s |
| pre-push, with mutation testing | not applicable | tens of minutes for a workspace whose pure files changed |

The commit hook got cheaper because it stopped linting the whole repository.
The trade is that a staged-file run cannot see the cross-file rules, of which
`import-x/no-cycle` is the one that matters, so CI still lints everything.

The push hook got more expensive on purpose. The infra coverage suites moved
there from pre-commit, because 25 s is too slow to sit on every commit and
nothing about a CDK snapshot needs checking more than once per push. Mutation
testing is new and only runs for a workspace whose `*.core.ts` or `*.utils.ts`
files changed on the branch.

## Continuous integration

Thirty successful `ci.yml` runs on `main`, before the migration:

| | Wall clock |
|---|---|
| Fastest | 59 s |
| Median | 97 s |
| Slowest | 134 s |

The first run on this branch, at commit `14fc404`, with no cache to restore:

| Job | Duration |
|-----|----------|
| `build`, which is typecheck, ESLint, Prettier, rule tests, infra coverage, build, knip | 177 s |
| `app-tests` | 78 s |
| `commitlint` | 27 s |
| `detect` | 30 s |

So CI went from a 97 s median to about 180 s on a cold-cache run, which is
roughly 85% slower. The job now also does three things it did not do before,
which are checking formatting separately, running the custom rule tests, and
saving the caches. That run carried 390 rule tests; the suite has since grown to
444, so the job is a little slower than the figure above.

CI persists `.eslintcache` and the Prettier cache, keyed on the lockfile,
`eslint.config.js` and `.prettierrc.json`. Three `build` runs on this branch:

| Commit | Config changed in that commit? | `build` |
|--------|-------------------------------|---------|
| `14fc404` | first run on the branch, nothing to restore | 177 s |
| `02dde0c` | yes, `eslint.config.js` | 206 s |
| `7893b1e` | no, a docs-only commit | 183 s |

The cache did not help, and the reason turned out to be a defect rather than a
property of the job. The per-step breakdown of the `7893b1e` run, which restored
a cache written by the previous run:

| Step | Duration |
|------|---------:|
| set up job, checkout, node, pnpm | 14 s |
| `pnpm install --frozen-lockfile` | 4 s |
| `pnpm --filter @borso/infra build` | 4 s |
| `pnpm -r typecheck` | 34 s |
| restore `.eslintcache` | 1 s |
| `pnpm exec eslint .` | 68 s |
| `pnpm exec prettier --check .` | 4 s |
| `pnpm run test:eslint-rules` | 12 s |
| `@borso/infra test:coverage` | 21 s |
| `@borso/shared-infra test:coverage` | 3 s |
| `pnpm -r build` | 11 s |
| `pnpm exec knip` | 2 s |

68 s on a restored cache, against 3.2 s warm on the sandbox. ESLint's `--cache`
compares mtime and size by default, and `actions/checkout` gives every file a
new mtime, so the restored cache matched nothing. Every invocation now passes
`--cache-strategy content`, which hashes contents instead. See
[`docs/dantotsus/eslint-cache-useless-on-a-fresh-checkout.md`](../dantotsus/eslint-cache-useless-on-a-fresh-checkout.md).

The figures above are what the job cost before that fix, so treat 180 s as the
worst case rather than the current cost. This document will carry the corrected
number once two runs have gone through with the content strategy in place.

## Test suites

The suites grew because the refactor extracted around 90 new pure files, each of
which ships a sibling test at full coverage.

| Suite | Before | After |
|-------|--------|-------|
| `borso-fr` | 115 tests, 1.8 s | 270 tests, 12.7 s |
| `borsouvertures` | 146 tests, 3.3 s | 274 tests, 14.4 s |
| `pragma` core | 408 tests, 40.3 s | 538 tests, 49.5 s |
| `last-loop-lepin` core | 310 tests, 24.5 s | 630 tests, 38.4 s |
| `last-loop-lepin` back end end-to-end | not separately timed | 321 tests |
| Custom ESLint rule tests | did not exist | 444 tests, 13.0 s |
| `knip` | 2.5 s | 2.7 s |

Total application tests went from 979 to 1712, plus 444 rule tests.

The two front-end-only suites grew the most in relative terms, from about 2 s to
about 13 s. Most of that is the jsdom environment, which those apps barely used
before and now need for the Testing Library suites that replaced behaviour
removed from `useEffect`.

## How to reproduce any of these

```bash
# Lint, cold. Delete the cache first or the number is meaningless.
rm -f .eslintcache && time pnpm exec eslint .

# Lint, warm.
time pnpm exec eslint . --cache --cache-location .eslintcache

# A hook, end to end.
time bash .husky/pre-commit
time SKIP_MUTATION_GATE=1 bash .husky/pre-push

# CI wall clock, from the API rather than from the web interface.
# Compare `created_at` with `updated_at` on each run.
```

## One measurement that should not be trusted

The pre-commit hook was measured at 96.7 s at one point during the refactor,
which is roughly thirty times the honest figure. Four agents were rewriting the
four applications at the time, so the ESLint cache was invalidated on every
pass. The number is recorded here only as a warning: a cache-sensitive
measurement taken while something else is writing to the tree measures the other
process, not the gate.

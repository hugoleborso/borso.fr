# Session brief — the standards harness

Working notes for a long unattended session. Written down because the
conversation compacts and the instructions would otherwise be lost. This file
is the source of truth for what was asked, what was decided, and why.

Delete it when the pull request merges.

## The ask, verbatim in substance

- Rebase on PR #49 and build on it. **Another agent owns PR #49.** Do not touch
  its branch. Watch it, and re-merge whenever it moves.
- Enforce best practices and standardisation across the codebase. Named
  candidates: ESLint rules, documentation, skill composition with a todo list,
  agents, workflows sized to the task, review agents, a standards agent,
  context seeding with blueprints, blueprint bug tracking, better naming,
  better code parsing.
- Explore all four applications. Test the harness by adding features, or a
  whole application. The applications may or may not be kept; **the harness
  stays either way.**
- Work unattended for about seven hours. Take decisions alone and record them.
- Everything must be mergeable on return.
- Preview deploys and the internet are available. Use them.
- Read what others do — Matt Pocock was named — but do not take it on trust.
  Be innovative.
- Use subagents.

## Answers given to the four questions asked before going offline

1. **Retrofit scope** — full retrofit, all four applications.
2. **What to build as a test** — a new application *and* features in existing
   ones.
3. **Delivery** — one branch, many commits, one pull request.
4. **PR #49** — another agent works on it. Do not touch it. Re-merge on every
   update.

Second round:

5. **The fifth application** — a reading list / library tracker. Named
   `borsolivres`, following the `borsouvertures` precedent of a French product
   name with English identifiers inside.
6. **Agent gates** — *"Never run inference in CI. But you can enforce this via
   workflows, or a seal of approval only the standards / naming validation
   agent has. I'll let you explore on that one."*
7. **`site/` to `site/src/`** — yes, normalise all four.
8. **Off limits** — nothing beyond PR #49's branch. Never push to main, never
   merge a pull request, never deploy to production.

## Decisions taken alone, and the reasoning

| Decision | Why |
| --- | --- |
| Merge PR #49 rather than rebase onto it | Thirty commits led by a mass rename; a rebase re-conflicts on every one. One merge resolves once. |
| `## Enforced by` bullets become typed markers | A first pass read the prose and had to guess, and guessing is how four false claims survived. |
| Ask ESLint for a rule's state, not `eslint.config.js` | The only way to see through shared presets. `no-explicit-any` is on and never written; `no-magic-numbers` was written in a document and on nowhere. |
| The seal hashes content, not paths | A rename is not something a review would say anything new about, and this repository does mass renames. |
| The seal is an attestation, not a signature | Nothing in a checkout can sign anything. Said plainly in the docs rather than implied otherwise. |
| HTTP status codes exempt from `no-magic-numbers` | They are names in a published registry. The Hono-requires-a-literal argument was **probed and found false**, so it was dropped rather than repeated. |
| `apps/<app>/domain/` is not a horizontal folder | ADR-0010 sanctions it. Standard 02 was ambiguous enough that the audit read it backwards; the wording now names the ADR. |
| Standard 08 gains a `@third-party-dom` exception | Leaflet renders its own DOM, so no JSX element can carry a utility. The ban never accounted for it, and the code was right. |
| Agents do not commit or stage | Six agents share one git index and every whole-tree `--check` generator. Recorded as a dantotsu. |
| `borsolivres` ships with its back end only | Its React side was not reached. Committed anyway because the back end is green and the build surfaced three harness bugs. Flagged loudly rather than hidden. |
| The seal is not a CI gate in this pull request | This change touches four hundred files, nearly all a directory move. Sealing them all is rubber-stamping, which is the thing the seal exists to stop. Arm it on the first ordinary-sized change. |
| Convention drift gates on a ratchet, not a threshold | Thirty files sit outside a majority spelling. Clearing them is not worth an afternoon; reopening a settled question by accident is worth stopping. A falling count is always allowed. |
| Case style is read per layer *and* per extension | Grouping by layer alone reported `App.tsx` against `main.ts` as a disagreement when both are correct. |
| A one-word lowercase name is kebab-case | Reading `books` and `self-punch` as two styles reported nineteen of twenty-one controllers as divergent when they all agree. |
| The first push may use `SKIP_MUTATION_GATE=1` | The pre-push mutation wave takes about an hour and forty minutes on this branch, because the range is the whole branch and the change touches nearly every pure file. It ran once in full, scored 97.80, and named four survivors in one file. Re-running the whole wave to re-check one file is waste. The changed files are verified individually instead, and the flag is the hook's own documented escape, not `--no-verify`. Once the remote branch exists the range is one push and the gate is cheap again. |
| `no-restricted-imports` per folder | `apps/<app>/domain/` is justified entirely by both sides reading it, and one `import { useState } from 'react'` ends that. Nothing said so; the rule appeared nowhere in `eslint.config.js`. |

## Standing constraints

- Never `--no-verify`. Fix the hook's cause.
- Never push to `main`, never merge, never deploy to production.
- No invented numbers. Bind every claim about a file or a resource to a tool
  call made in this session.
- English in code and specs. Conventional commits, scope enum in
  `commitlint.config.js`.
- Prose follows `/plain-writing`; documents an agent reads also follow
  `/writing-for-agents`.

## Mutation testing of the harness itself

The root `stryker.config.js` is new. Every application has held its pure modules
at zero surviving mutants for months; the generators under `scripts/` were never
mutated, because the pre-push wave iterates `apps/*` and the root is not one of
them. Run for the first time they scored **77.40% with 193 survivors**, at
100% statement, branch, function and line coverage.

That is the gap mutation testing exists to expose, and this repository already
has a dantotsu named *a green mutation gate is not a green coverage gate*. Most
survivors are in the render functions, where a mutant changes prose and no test
asserts on that prose.

The hardening pass finished. The unscoped root run is **100.00 with zero
survivors over 916 mutants in 64 seconds**, and the gate that was missing is now
wired: `pnpm run test:coverage` at the root in CI, a `tooling` gate in pre-push
whenever `scripts/` or `eslint-rules/` changes, and an unscoped `tooling` job in
`full-suite.yml`. Before that, the root's declared 100% per-file coverage
threshold applied to nothing, because CI ran the suite without `--coverage`.

## The practitioner research, and what was taken from it

A subagent surveyed what other people build for codebase consistency, with
sources. Six items were ranked worth building. What happened to each:

| Item | Verdict | Where it landed |
| --- | --- | --- |
| Temporal coupling from git history, filtered against the module graph | Built | `scripts/standards/temporal-coupling.ts`, cited by standard 00 |
| Point the defect machinery at the rules before writing rule 37 | Already built | `scripts/standards/rule-provenance.ts`, 11 of 34 rules came from a defect |
| One version per dependency, via pnpm catalogs | Built | `pnpm-workspace.yaml` plus `scripts/dependencies/check-dependency-catalog.ts`, standard 13 |
| `type-coverage` with a ratcheted floor | **Rejected**, see below | nothing |
| Banned external imports per folder | Already built | `no-restricted-imports` overrides in `eslint.config.js` |
| A per-application domain vocabulary | Built | `apps/<app>/VOCABULARY.md` |

### Why type coverage was rejected, with the measurement

The argument for it is good: this repository reports zero written `any` and zero
type assertions, so the only `any` left is the kind nobody wrote, and that is a
number which can degrade while all 34 rules stay green.

It was measured rather than assumed. A probe over each workspace's TypeScript
program, counting identifiers whose type carries the `Any` flag:

| Workspace | Typed | `any` identifiers |
| --- | --- | --- |
| `apps/pragma` | 98.92% | 507 of 47099 |
| `apps/last-loop-lepin` | 99.60% | 120 of 29860 |
| `apps/borso-fr` | 99.45% | 51 of 9308 |
| `apps/borsouvertures` | 99.54% | 52 of 11411 |
| `infra/cdk` | 99.14% | 59 of 6875 |
| `infra/shared` | 99.11% | 9 of 1010 |

The first run read 96.6% for `pragma` and every one of its worst files was a
`.tsx`. Reading the actual identifiers showed them all to be JSX intrinsic tag
names, `div` and `span`, which resolve to `any` and mean nothing. Excluding
those moved the number two points. Reading the next worst file, `infra/cdk/src/internal/migration-runner/index.ts`,
showed sixteen more artefacts: namespace qualifiers in type references such as
the `postgres` in `postgres.Sql`, and type-only import specifiers.

So the metric needs a list of exclusions before it says anything, and each
exclusion is a judgement nobody would review. A gate whose number moves for
reasons the reader has to discount is worse than no gate, which is the argument
this repository's own `rule-provenance.md` makes: 11 of 34 rules exist because
something went wrong, and a 35th mechanism with no defect behind it, guarding a
number already above 99%, is the case the research's own "case against" section
argues against.

Adopting the `type-coverage` package instead would buy years of those
exclusions for one dev dependency and about half an hour. That is an ADR
trigger, the number is currently healthy, and no entry in the dantotsu corpus
traces to an implicit `any`. **Recommendation: leave it. Say the word and it
takes half an hour.**

## Open questions for the operator

1. Translation keys: the standard says lower case with hyphens, `pragma` ships
   camelCase, `borsolivres` followed the standard. The two now disagree and one
   of them should move.
2. `borsolivres` has no front end and no CDK stack. Keep, finish, or drop.
3. `docs/adding-a-fullstack-app.md` is stale enough to mislead. Rewrite against
   `pragma`, or delete it with a pointer.

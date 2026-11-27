---
date: 2026-08-19
introduced-at: conception
detected-at: ci
severity: medium
related-pr: '#55'
fix-commits: [24a70649df]
eradication-level: 2
eradication-paths: [tsconfig.json, .husky/pre-commit, .github/workflows/ci.yml]
time-to-detect: days
tags: [typescript, tooling, gates, ci, meta]
zone: tsconfig.json
weak-point: gate-measures-nothing
recurs: [two-guard-hooks-that-never-guarded]
---

# Every gate in this repository was written in TypeScript that nothing type-checked

## User impact

The operator saw CI fail on PR #55 with an error no local gate had shown. A
generator's `--check` branch threw `ReferenceError: reason is not defined`.
ESLint, the pre-commit hook and `pnpm -r typecheck` had all passed on the
file (measured, from the CI log and the local runs).

| | Seen | Expected |
| --- | --- | --- |
| A generator's `--check` on a stale file | `ReferenceError: reason is not defined` | the stale file named, exit 1 |
| `pnpm -r typecheck` on the same tree | passes | fails on the undefined name |

On the same branch, deleting a slice between two anchors took an unrelated
function with it, and nothing said so until a call site in another file
broke. A third instance was live on `main` when this was written:

```
scripts/architecture/architecture-graph.ts(1620,51): error TS2304: Cannot find name 'DiffReport'.
```

Everyone who relied on a generator, a `check-*.ts` gate or the architecture
map was relying on code no compiler had read.

## Causal chain

- CI's `--check` branch threw `ReferenceError: reason is not defined`.
  - The branch referenced a name it never declared, and ran for the first
    time on CI, because it only executes when a generated file is stale.
    - `tsx` ran the file. It strips types without reading them, so an
      undefined name costs nothing until control reaches the line.
    - The same shape had shipped before, in commit `7a4fe16fe`:
      `function buildDiffReport(input: DiffReportInput): DiffReport {`, where
      `DiffReport` is declared in `architecture-page.ts` and never imported.
      - The writers annotated and referenced names as if a compiler would
        refuse a missing one. `pnpm -r typecheck` passed.
        - `pnpm -r typecheck` runs `tsc --noEmit` in each workspace.
          `pnpm-workspace.yaml` lists `apps/*` and `infra/*`. `scripts/`,
          `.claude/skills/` and `eslint-rules/` own no `package.json` and sit
          outside that list, so `-r` never visits them.
          - The repository grew its tooling outside the workspaces, and the
            only type gate was defined per workspace. There was no root
            `tsconfig.json` (Machine).

## Root cause of occurrence

*Thought `pnpm -r typecheck` type-checks the repository, actually it
type-checks the workspaces listed in `pnpm-workspace.yaml`, and the tooling
sat in none of them.* (Machine)

The layout made the belief natural. `ci.yml` showed a typecheck step, and
every script was TypeScript. `eslint.config.js` even listed a root
`tsconfig.json` in `TSCONFIG_PATHS` for its import resolver, and that file
did not exist.

## Detection failure causes

- **Typing:** `tsc` never ran on these paths, as above.
- **Linter:** ESLint reached the paths, but `UNPROJECTED_TYPESCRIPT_FILES`
  gave them `projectService: false, project: false, program: null`, so no
  type-aware rule could run. `no-undef` is off under `typescript-eslint` by
  design, because the compiler is meant to catch an undefined name.
- **Local validation:** a generator's happy path runs on every commit. Its
  failure branch runs only when something is already wrong.
- **CI and review:** reading `ci.yml` shows a typecheck step, and reading a
  script shows TypeScript. Nothing on either side says the two never meet.
  A `ReferenceError` in a `--check` branch reads as a logic bug in that
  branch.

## Countermeasure

A `tsconfig.json` at the repository root covering `scripts/**/*.ts`,
`.claude/skills/**/*.ts` and `eslint-rules/**/*.js`, with the same `strict`
and `noUncheckedIndexedAccess` settings the applications use, and a root
`typecheck` script that runs it.

It found eleven errors on its first run. One was the undefined `DiffReport`.
The other ten were `noUncheckedIndexedAccess` violations in the blueprint
indexer and the architecture model. All eleven were fixed by handling the
absent case, none by widening a type. Every generator re-run gave
byte-identical output, and 949 tests passed (measured).

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `24a70649df` (#55).

The compiler reads the tooling at commit and in CI:

- `.husky/pre-commit` launches `typecheck-tooling`, which runs
  `tsc -p tsconfig.json --noEmit`.
- `.github/workflows/ci.yml` runs `pnpm run typecheck` right after
  `pnpm -r typecheck`.

**Proof it can fail:** with the `DiffReport` import removed again, the root
type check failed with `architecture-graph.ts(1620,51): error TS2304`, exit 2
(measured on the tree that produced this entry).

The gate covers a list kept by hand. The root `tsconfig.json` reads
`"include": ["scripts/**/*.ts", ".claude/skills/**/*.ts", "eslint-rules/**/*.js"]`.
A new top-level folder of TypeScript is unguarded again, and the root
`vitest.config.ts` already is (`git ls-files '*.ts'` outside `apps/`,
`infra/` and the three folders prints `vitest.config.ts`, measured on
2026-11-27).

These files stay in `UNPROJECTED_TYPESCRIPT_FILES`, so ESLint's type-aware
rules still do not run on them. Projecting them reported 54 errors, almost
all `@typescript-eslint/no-unsafe-*` on vendor surfaces that return `any`
(measured when the entry was written). That is a separate subject. The
compiler closes the undefined-name defect.

**Proposed:** make coverage the default. The root `tsconfig.json` would
include `**/*.ts` and `**/*.js` and exclude `apps`, `infra` and
`node_modules`, which `pnpm -r typecheck` already covers. Any new folder of
tooling would then be type-checked without anyone adding it, and a file
outside every type gate would need an explicit exclude.

**Similar instances:** the `git ls-files` search above found one, the root
`vitest.config.ts`. `knip` confirmed the wiring: `typecheck` had sat in
`knip.json`'s `ignoreBinaries` because no root script defined it, and that
line was removed.

**Related.**

- [`a-gate-that-reported-success-while-measuring-nothing`](./a-gate-that-reported-success-while-measuring-nothing.md), the same shape one layer up: a gate that runs and covers nothing.
- [`the-gate-that-was-never-pointed-at-the-code`](./the-gate-that-was-never-pointed-at-the-code.md), a mutation gate that existed and reached no workspace.
- [`three-green-gates-on-code-that-ran-nowhere`](./three-green-gates-on-code-that-ran-nowhere.md), green measurements over code nothing exercised.

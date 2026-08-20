---
date: 2026-08-19
introduced-at: conception
detected-at: ci
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/55
fix-pr: https://github.com/hugoleborso/borso.fr/pull/55
fix-commits: []
eradication-level: 1
time-to-detect: days
tags: [typescript, tooling, gates, ci, meta]
---

# Every gate in this repository was written in TypeScript that nothing type-checked

## Symptom

A generator's `--check` branch threw `ReferenceError: reason is not defined` in
CI. The branch had never run locally, because it only executes when a generated
file is stale, and locally it never was. ESLint passed on the file, the
pre-commit hook passed, and `pnpm -r typecheck` passed.

Separately, on the same branch, deleting a slice between two anchors took an
unrelated function with it. Nothing said so. It surfaced later, from a call site
in a different file.

Both are the same absence, and this is the shape of it, live in `main` at the
moment this was written:

```
scripts/architecture/architecture-graph.ts(1620,51): error TS2304: Cannot find name 'DiffReport'.
```

`buildDiffReport` is annotated as returning a type that the file never imports.
It has been that way through every push, every green CI run and every review.

## Root-cause chain

1. `pnpm -r typecheck` runs `tsc --noEmit` in each workspace. There are six:
   four applications, `infra/cdk`, `infra/shared`.
2. `scripts/`, `.claude/skills/` and `eslint-rules/` are not workspaces. They
   are not in `pnpm-workspace.yaml` and they own no `package.json`, so `-r`
   never visits them.
3. There was no `tsconfig.json` at the repository root either — `eslint.config.js`
   listed one in `TSCONFIG_PATHS` for its import resolver, and the file did not
   exist.
4. ESLint reaches those paths, but `UNPROJECTED_TYPESCRIPT_FILES` gives them
   `projectService: false, project: false, program: null`, which is correct as
   far as it goes: without a project there is no type information, so no
   type-aware rule can run. `no-undef` is off under `typescript-eslint` by
   design, because the compiler is supposed to be the thing that catches an
   undefined name.
5. Nothing was that compiler. So the layer holding every generator, every
   `check-*.ts` gate, the enforcement ledger, the architecture map and the
   blueprint index — the machinery this repository uses to check itself — was
   the only TypeScript in the tree with no type checking at all.
6. `tsx` strips types without reading them. A broken annotation costs nothing at
   runtime, and an undefined *value* costs nothing either until control reaches
   the line.

The general form: **`pnpm -r <script>` is a claim about workspaces, not about
the repository.** Any path that belongs to no workspace is outside every
`-r` gate, and the more infrastructure a repository grows outside its
workspaces, the more of it is unguarded.

## Detection failure causes

- **The gap is invisible from either end.** Reading `ci.yml` you see a
  typecheck step. Reading a script you see TypeScript. Nothing on either side
  says the two never meet.
- **Every symptom points somewhere else.** A `ReferenceError` in a `--check`
  branch reads as a logic bug in that branch. A function that vanished in a
  delete reads as a bad edit.
- **The error paths are the unchecked ones.** A generator's happy path runs on
  every commit; its failure branch runs only when something is already wrong,
  which is the worst moment to discover it also throws.
- **`no-undef` being off is right, and was load-bearing in the wrong direction.**
  Turning it on for these files would have caught the `DiffReport` case, and the
  reason it is off — "the compiler does this better" — was true everywhere
  except here.

## Countermeasure

A `tsconfig.json` at the repository root covering `scripts/**/*.ts`,
`.claude/skills/**/*.ts` and `eslint-rules/**/*.js`, with the same
`strict` and `noUncheckedIndexedAccess` settings the applications use, and a
root `typecheck` script that runs it.

It found eleven errors on its first run. One was the undefined `DiffReport`
above. The other ten were `noUncheckedIndexedAccess` violations — a regex
capture group or an array index read as `string` where the type is
`string | undefined` — in the blueprint indexer and the architecture model, i.e.
in the code that decides what every generated page says. All eleven are fixed
here, none by widening a type: each one reads the optional value and handles the
absent case.

## Eradication

**Structural, level 1.** The compiler now reads these files, so an undefined
name cannot survive a commit that touches them.

Wired in two places:

- `.husky/pre-commit`, scoped to commits touching `scripts/`,
  `.claude/skills/`, `eslint-rules/` or `tsconfig.json`, so an
  application-only commit pays nothing.
- `.github/workflows/ci.yml`, immediately after `pnpm -r typecheck`, which is
  the line whose reach this corrects.

Both cited from [`03. Typing`](../standards/03-typing.md) and
[`12. Linting and gates`](../standards/12-linting-and-gates.md), and
`gates.core.ts` now names the commit hook as a site for the `typecheck` gate, so
the enforcement ledger fails if either site loses the step.

Verified both ways on the tree that produced it:

| Scenario | Expected | Result |
| --- | --- | --- |
| The tree as fixed | passes | passes, 0 errors |
| The `DiffReport` import removed again | fails, naming the file and line | fails: `architecture-graph.ts(1620,51): error TS2304`, exit 2 |
| Every generator re-run after the eleven fixes | byte-identical output | identical; all seven `--check` gates green, 949 tests pass |

`knip` confirmed the wiring independently: `typecheck` had been sitting in
`knip.json`'s `ignoreBinaries` because no root script defined it, and knip
reported the entry as removable the moment one did. That line is gone.

**What this deliberately does not do.** These files stay in
`UNPROJECTED_TYPESCRIPT_FILES`, so ESLint's type-aware rules still do not run on
them. Measured before deciding: projecting them reports **54 errors**, almost
all `@typescript-eslint/no-unsafe-*` where ESLint's own `calculateConfigForFile`
and `elkjs` return `any` into the enforcement ledger, the provenance report and
the architecture page. Fixing those properly means parsing two vendor surfaces
into real types, which is a change of its own size and its own risk. The
compiler gate above is what closes the defect this entry is about — an undefined
name — and it closes it completely; the `any` surface is a separate subject with
a separate number attached to it, not a deferred half of this one.

## See also

- [`a-gate-that-reported-success-while-measuring-nothing`](./a-gate-that-reported-success-while-measuring-nothing.md) — the same shape one layer up: a gate that runs and covers nothing.
- [`the-gate-that-was-never-pointed-at-the-code`](./the-gate-that-was-never-pointed-at-the-code.md) — a mutation gate that existed and reached no workspace.
- [`three-green-gates-on-code-that-ran-nowhere`](./three-green-gates-on-code-that-ran-nowhere.md) — green measurements over code nothing exercised.

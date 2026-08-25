# 14. Connascence

## Rule

When two pieces of code must change together, one of them owns the decision and
the other imports it. A value, an ordering, or a rule that is written a second
time is written in one place and read from there.

```ts
// apps/pragma/site/src/routes/catalog/chart-kind.utils.ts — do
export type ChartKind = 'chordpro' | 'pdf' | 'image';
export const CHART_KINDS: readonly ChartKind[] = ['chordpro', 'pdf', 'image'];

// apps/pragma/site/src/components/molecules/ChartKindIcon.tsx — do
import { type ChartKind } from '../../routes/catalog/chart-kind.utils';

// apps/pragma/site/src/components/molecules/ChartKindIcon.tsx — don't
export type ChartKind = 'chordpro' | 'pdf' | 'image' | null | undefined;
```

## Reason

Coupling is not one thing, and "these two files are coupled" does not say what
it will cost to change them. Connascence, from Meilir Page-Jones, splits it into
kinds and orders them by how hard each is to find and to undo: agreeing on a
**name** is the cheapest, then on a **type**, then on the **meaning** of a
literal, then on the **position** of an argument, then on an **algorithm**. The
runtime kinds are worse still, because no compiler sees them: agreeing on
**execution order**, on **timing**, on a **value** that several places must hold
at once, on **identity**.

Two properties make an instance expensive rather than merely present. **Degree**
is how many places participate: one decision spread over fifteen files is
fifteen edits and fourteen chances to miss one. **Locality** is how far apart
they sit: two lines of one function agreeing on a literal is nothing, the same
agreement between a controller and a component in another container is a defect
waiting for the day someone changes one side.

The repository's existing gates all read one file at a time. ESLint sees a
magic number and can ask for a name; it cannot see that the same number is
already named next door. Coverage sees an untested branch; it cannot see that
the branch enumerates a union declared in a file that will grow a fourth member
next month. Connascence is the property none of them can hold, because it is
never a property of a file.

## What is measured

`scripts/standards/connascence.ts` parses every source file under `apps/` and
`infra/` with the TypeScript compiler, tests excluded, and reports five kinds.
Nothing is inferred by a model; a run on an unchanged tree produces an identical
report.

| Kind          | Rank | What it looks for                                                                   |
| ------------- | ---- | ----------------------------------------------------------------------------------- |
| **meaning**   | 3    | one literal, string or number, written in two or more files                          |
| **position**  | 4    | an exported callable with three or more positional parameters                        |
| **algorithm** | 5    | one regular expression, or one function body token for token, written in two files   |
| **execution** | 6    | module state one export writes and another reads, so callers must order their calls  |
| **value**     | 8    | a string-literal union whose every member is re-enumerated by a file that never imports it |

Each finding carries a **degree**, the number of participating sites, and a
**locality**, the widest distance between any two of them: same file, same
bounded context, same container, same workspace. The score is
`rank × (degree − 1) × localityWeight`, with weights `1, 2, 4, 8`. It ranks; it
is not a budget anybody should read as an absolute number.

## Findings are scoped to one workspace

`apps/pragma` and `apps/last-loop-lepin` both write `404`, and neither has to
change when the other does — no import connects them and the repository forbids
one. Counting that as connascence made the first report's ten worst entries all
cross-application noise. Sites are grouped per workspace before anything is
tallied, which is why the widest locality is `same workspace` rather than
anything above it.

## Vocabulary the repository did not choose

`zValidator('json', …)` is not this repository agreeing with itself about the
meaning of `"json"`; it is Hono's parameter, and renaming it is not an option
the codebase has. `docs/standards/connascence-vocabulary.json` holds those
words, one line each, with the reason and the evidence that justified it. Keep
it short: every entry is a finding nobody will ever see again, so an entry added
to quiet a report is a rule switched off.

## The gate is a ratchet, not a threshold

`docs/standards/connascence-baseline.json` records the current count per kind
and the current score per workspace, and `--check` fails only on an increase.
The backlog measured on the day this landed never blocks a commit; the next
literal to reach a second file does. Deciding that a new instance is right takes
`--accept` in the same commit, which puts the decision in the diff where a
reviewer sees it.

A threshold would have been the wrong shape. There is no number of shared
literals that is correct, the honest one is lower than any codebase reaches, and
a gate set above where the tree sits today gates nothing until it is crossed.

## What this does not cover

The dynamic kinds a parser cannot see: timing, identity, and execution order
that crosses a module boundary. `docs/standards/temporal-coupling.md` is the
empirical complement — files that keep changing in the same commit are coupled
by something, whether or not any of these five detectors can name it.

## Enforced by

- `generator:scripts/standards/connascence.ts` writes
  `docs/standards/connascence.md` and, with `--check`, fails when any counter in
  `connascence-baseline.json` goes up. Runs in `.husky/pre-commit` whenever a
  lintable file is staged, and unconditionally in `.github/workflows/ci.yml`.
- `reviewer` judges whether a new entry in `connascence-vocabulary.json` names a
  word an external library dictates, rather than one this repository chose and
  would rather not have counted.

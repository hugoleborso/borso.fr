---
date: 2026-08-21
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#83'
fix-commits: [a89d6aadaa]
eradication-level: 4
eradication-paths: [scripts/architecture/architecture-graph.ts, scripts/architecture/journey-status.core.ts]
time-to-detect: days
tags: [meta, tooling, architecture, gates, generator]
zone: scripts/architecture/architecture-journeys.ts
---

# A level of the map that had never drawn a diff

## User impact

The operator asked what the branch should look like on the architecture map, and could not find the change at level 3.5, the level that walks one thing a person does from the address they opened to the tables at the end.

| | Seen | Expected |
| --- | --- | --- |
| Levels 1 to 3 of the diff page | The new files coloured | The same |
| Level 3.5 of the diff page | The same files in the same journeys, in grey, as though the branch had touched nothing | The changed files coloured |

Level 3.5 had never coloured a node on any branch since it shipped, three PRs before (measured on PR #83).

## Causal chain

- Level 3.5 drew every changed file grey.
  - Every status lookup for a file box missed. The boxes a reader scans are group nodes, one per file. The symbol nodes inside them resolved, but carry no box colour.
    - The lookup keyed on a path that was not a path. A group node's location is the bare path, so `lastIndexOf(':')` returned `-1`, and `slice(0, -1)` cut the last character: `.ts` became `.t`.

      ```ts
      return code.get(location.slice(0, location.lastIndexOf(':'))) ?? '';   // ← assumes every location ends in :line
      ```

      - An agent wrote this line in 7a4fe16fe, "fix(meta): the architecture diff stops lying about what a branch did". At its parent, `architecture-journeys.ts` already read the same field with `node.location.split(':')[0]`, which keeps a bare path whole (measured with `git grep` at `7a4fe16fe^`).
        - A location is one string that joins a path and an optional line, so each reader must parse it back apart. `architecture-journeys.ts` builds it as `file.path` at line 148 and as `` `${path}:${symbol.line}` `` at lines 202, 241 and 274, and types it `readonly location: string` at line 329 (Machine).

## Root cause of occurrence

*Thought every journey node's location ends in `:line`. Actually a group node's location is the bare file path, with no colon at all.* (Machine)

The type gives the reader no way to see the two shapes. Both are `string`, and the field's name says nothing about an optional line. So "the path part of a location" was written three times from scratch, and the one written without looking at the others was wrong.

## Detection failure causes

- **Typing:** both spellings return `string`, and the wrong one returns a plausible wrong string.
- **Local validation:** the generator's `--check` validates what a person can get wrong, such as an annotation naming no blueprint. It never opens the diff page, because the pages are not committed (ADR 2026-08-20T1031).
- **CI:** the architecture workflow regenerates and diffs the counts. The counts were right, and only the colour was missing.
- **Reading the page:** a diff page that colours nothing looks exactly like one for a branch that moved nothing. A reader cannot tell them apart without knowing what the branch touched.

## Countermeasure

Commit [`b920f55`](https://github.com/hugoleborso/borso.fr/commit/b920f55) moved the derivation into `scripts/architecture/journey-status.core.ts` as `filePathOfLocation`, a strip of a trailing `:digits` that leaves a bare path alone, under the 100% coverage and mutation gates. The correct third spelling, `location.split(':')[0]` in `architecture-journeys.ts`, now calls it too.

## Eradication

**Type:** detection (level 4)

**Reference:** commit [`a89d6aa`](https://github.com/hugoleborso/borso.fr/commit/a89d6aa) (PR #86).

`assertJourneysCarryTheDiff`, called before the diff page is rendered in `scripts/architecture/architecture-graph.ts`, requires every moved file that level 3.5 draws to carry a status on at least one of its nodes. A diff page that draws a changed file grey is a build failure:

```ts
const drawn = nodes.filter((node) => isNodeOfFile(node, path));
return drawn.length > 0 && !drawn.some((node) => statusOfNode(node.location, code) !== '');
```

`isNodeOfFile` matches a real path from the diff by containment, `node.location === path || node.location.startsWith(path + ':')`, and never calls the parser under test. So it cannot agree with a wrong parser.

**Proof it can fail:** on the `pragma` map, with the historical `slice(0, lastIndexOf(':'))` put back, the generator exited non-zero and named the files, `SetlistEntryRow.tsx` and `SetlistEntriesList.tsx` among them (measured on PR #86).

The level is detection. The string shape remains, `filePathOfLocation` has 7 call sites outside its tests (measured with `grep -rn filePathOfLocation scripts/architecture`), and a new reader can still parse the string its own way.

**Proposed:** make `location` a `{ path, line? }` record at `scripts/architecture/architecture-journeys.ts:329` and at the `GraphNode` type in `architecture-graph.ts`, built from the four sites above, and format it as `path:line` only where it is displayed. No code would then parse a path out of a string, `filePathOfLocation` and its 7 call sites could be deleted, and a bare path and a symbol location could not be confused. The entry first said level 1 was not available. It is, because the defect is the string shape, not the parser.

**Similar instances:** `grep -rn "split(':')\|lastIndexOf(':')" scripts/architecture --include=*.ts` finds one today, `stamp.split(':')[0]` at `architecture-graph.ts:1050`. It parses a component stamp, not a location, and is the same joined-string shape. `a-lint-rule-that-knew-only-one-of-three-spellings` has the same shape, one idea with several spellings.

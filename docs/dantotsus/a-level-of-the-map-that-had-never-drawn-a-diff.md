---
date: 2026-08-21
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#83'
fix-pr: '#86'
fix-commits: [a89d6aa]
eradication-level: 4
time-to-detect: days
tags: [meta, tooling, architecture, gates, generator]
---

# A level of the map that had never drawn a diff

## Symptom

The operator asked what the branch should look like on the architecture map,
and could not find the change at level 3.5 — the level that walks one thing a
person does from the address they opened to the tables at the end. Levels 1
through 3 coloured the new files. Level 3.5 drew the same files in the same
journeys, in grey, as though the branch had touched nothing.

Not a regression on this branch. Level 3.5 had never coloured a node on any
branch since it shipped.

## Root-cause chain

1. **Why?** Every status lookup at level 3.5 missed.
2. **Why?** The lookup keyed on the file path taken from the node's `location`,
   and the path it computed was not a path.
3. **Why?** The derivation was `location.slice(0, location.lastIndexOf(':'))`.
   A symbol node's location is `path/to/file.ts:118` and that works. A group
   node's location is the bare path, `lastIndexOf` returns `-1`, and
   `slice(0, -1)` returns the path with its last character removed — `.ts`
   becomes `.t`.
4. **Why did that miss everything rather than most things?** Because the nodes
   with a bare-path location are the ones a reader looks at: the group boxes
   that stand for a file. The symbol nodes inside them did resolve, but the
   colour a reader scans for is the box's.
5. **Why was this the third spelling of the same derivation?** Because "the
   path part of a location" was needed in three places and written from
   scratch in each. Two were correct. The one that was wrong was the one whose
   output nothing else read, so nothing contradicted it.
6. **Why did nobody notice a whole level rendering flat?** Because absence of
   colour is the same shape as absence of change. A diff page that colours
   nothing looks exactly like a diff page for a branch that moved nothing, and
   a reader has no way to tell the two apart without knowing what the branch
   touched.

**Root cause:** thought a lookup that returns nothing is a lookup that found
nothing, actually a lookup that returns nothing for every input is a broken
lookup — and a rendering whose failure mode is *silence* cannot be checked by
looking at it.

## Detection failure causes

- **Typing:** both spellings return `string`. The wrong one returns a wrong
  string.
- **Linter / static analysis:** nothing looks at what a `slice` means.
- **Functional validation locally:** the generator's own `--check` mode compares
  nothing — the pages are not committed (ADR-0014), so `--check` validates
  what a person can get wrong (an annotation naming no blueprint, a dependency
  no manifest declares) and never opens the diff page.
- **CI (tests / build):** the architecture workflow regenerates and diffs the
  counts. The counts were right; only the colour was missing.
- **Code review:** the reviewer of the level's original PR would have had to
  hold two node kinds in mind and notice that one of them carries no colon.
- **PO / QA validation:** the operator did catch it — three PRs later, by
  asking where the change was.

## Countermeasure

- **Code:** commit [`b920f55`](https://github.com/hugoleborso/borso.fr/commit/b920f55) —
  the derivation moves into `scripts/architecture/journey-status.core.ts` as
  `filePathOfLocation`, a regex strip of a trailing `:digits` that leaves a
  bare path alone, with its own tests and the repository's 100 % coverage and
  mutation gates on it. Commit [`3b73293`](https://github.com/hugoleborso/borso.fr/commit/3b73293)
  fixed the two neighbouring gaps the same reading exposed: files carrying a
  feature's tag were not seeded into that feature's composition, so they were
  drawn in no graph at all, and the journey payload shipped its own copy of the
  source map, so enriching the page's copy with base text changed nothing the
  code dialog read.

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — the generator refuses to write a diff page whose
level 3.5 contradicts the diff)

Level 1 is not available: the thing that can go wrong is a derivation returning
a plausible wrong string, and no type distinguishes a path from a path minus its
last character. Level 2 is not available either — a lint rule can ban
`lastIndexOf(':')` by name, and the next spelling will be a `split` or a
`substring`. What can be made impossible is the *silence*: a diff page that
draws a changed file grey is now a build failure rather than a page.

**Reference:** PR #86 · commit [`a89d6aa`](https://github.com/hugoleborso/borso.fr/commit/a89d6aa)

**The actual fix:** `assertJourneysCarryTheDiff`, called from `writeDiffPage`
before the page is rendered. For every path the diff reports as moved, it
collects the level 3.5 nodes that draw that file and requires at least one of
them to carry a status:

```ts
const uncoloured = [...code]
  .filter(([, status]) => status !== 'removed')
  .map(([path]) => path)
  .filter((path) => {
    const drawn = nodes.filter((node) => isNodeOfFile(node, path));
    return drawn.length > 0 && !drawn.some((node) => statusOfNode(node.location, code) !== '');
  });
if (uncoloured.length === 0) return;
throw new Error(`${UNCOLOURED_JOURNEYS_MESSAGE}\n  ${uncoloured.join('\n  ')}`);
```

The load-bearing detail is `isNodeOfFile`, which tests a real path from the diff
against a node's location by string containment — `node.location === path ||
node.location.startsWith(path + ':')`. It does **not** call the path parser. A
check written through the parser under test would agree with it however wrong it
became; this one cannot, because its left-hand side never parses anything.

Verified in both directions on the `pragma` map, base at the commit before this
branch's feature: clean on the tree as it stands, and with the historical
`slice(0, lastIndexOf(':'))` put back, the generator exits non-zero and names
the files, `SetlistEntryRow.tsx` and `SetlistEntriesList.tsx` among them.

**Sibling defects swept:** `architecture-journeys.ts` held the third spelling,
`location.split(':')[0]`. It was correct, but it was a second place for this
bug to be reintroduced, and it now calls `filePathOfLocation`. The gate stays
meaningful after that merge precisely because it does not use the shared
function.

## See also

- [`docs/adr/0014-generated-files-are-not-committed.md`](../adr/0014-generated-files-are-not-committed.md) —
  why there is no committed page to diff against, and therefore why a check
  mode has to *validate* rather than *compare*. This entry is the cost of that
  decision landing in a place where nothing validated.
- [`docs/dantotsus/a-lint-rule-that-knew-only-one-of-three-spellings.md`](./a-lint-rule-that-knew-only-one-of-three-spellings.md) —
  the same shape from the other side: one idea, several spellings, and the
  check that only knew one of them.

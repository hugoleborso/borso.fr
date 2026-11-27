---
date: 2026-08-15
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#49'
fix-commits: [01e8a281d5, e065cd169c, b5c02e572e, 8230bcebe]
eradication-level: 2
eradication-paths: [scripts/check-coupled-lists.sh, .husky/pre-commit, .github/workflows/ci.yml]
time-to-detect: days
tags: [ci, gates, pre-commit, github-actions, vitest, eslint, drift]
zone: eslint-rules/impurity.js
recurs: none (first entry on a rule held in two hand-written copies; later pairs joined the same check)
---

# Two copies that had to agree, and nothing made them agree

## User impact

Four times in PR #49, a rule was written in two places and the copies drifted.
Each copy read correctly on its own (found by the PR #49 audit).

| The rule | Copy A | Copy B | What the maintainer saw | Expected |
| --- | --- | --- | --- | --- |
| Paths that make the architecture map stale | `.husky/pre-commit`, a `grep -E` | `.github/workflows/architecture.yml`, a YAML list | a commit touching only `blueprint-utils.ts` reached CI with a stale map | the map regenerated |
| Suffixes that must ship a tested sibling | `eslint-rules/impurity.js`, a regex | every app's `vitest.config.ts`, `coverage.include` | a `.schema.ts` with no test caught by a coverage number and no rule naming it | one rule naming it |
| Text of the "browse the map" link | the workflow's comment body | the guard deciding whether to rewrite it | the comment renotified everyone on every push | one notification |
| Fields of a journey feature | the model in `architecture-journeys.ts` | the projection in `architecture-page.ts` | the overview entry vanished from every feature | the overview entry shown |

## Causal chain

- Four symptoms surfaced far from their cause, one per pair.
  - The map went stale on an innocent commit.
    - The workflow's YAML listed `blueprint-utils.ts` and the hook's `grep -E` did not.
      - A path was added to one list and not to the other. Each list was written in its consumer's dialect and neither file could import the other.
  - A `.schema.ts` had a coverage gate and no rule naming it.
    - `TESTED_FILE_PATTERN` and the configs' `coverage.include` disagreed by one suffix on the day both were written. Today the rule reads (`eslint-rules/impurity.js:2`):

      ```js
      const TESTED_FILE_PATTERN = /\.(core|utils|adapter|schema)\.tsx?$/;   // copy A
      ```

      and each config repeats it as globs (`apps/pragma/vitest.config.ts`):

      ```ts
      'api/src/**/*.schema.ts',   // copy B, typed by hand in each of the 7 app configs
      ```

      - Each `vitest.config.ts` is a hand copy of another. No module exports the suffix list and no shared preset exists, so a suffix has one place to land in the rule and seven in the configs (Machine, counted with `ls apps/*/vitest.config.ts`).
  - The comment renotified on every push.
    - The guard matched `[Browse the full map]` and the body said `[Browse the full maps]`. The same text was typed twice.
  - The overview entry vanished.
    - `overview` was added to the model and not to the projection, which listed fields by hand. `undefined` read as `false`, a legal value.

## Root cause of occurrence

*Thought a second copy written in the same session, in the consumer's own
dialect, would stay in agreement with the first, actually nothing tied the two
together, so the next edit to one left the other wrong and no gate read both.*
**Machine:** the codebase gave each consumer no shared source to read. The
suffix list lived only inside a regex literal, so a config could not import
it, and the configs had no preset to inherit from.

`scripts/check-coupled-lists.sh:13-14`, read this session: "both halves read
correctly on their own, and only the pair is wrong."

## Detection failure causes

- **Review:** each diff was correct alone. A reviewer would have to know the second file existed and hold its contents in mind.
- **Local validation and CI:** no gate read both copies, and three of the four had been wrong since both existed. Only the PR #49 audit found them.
- **Monitoring:** each consequence named a different place than its cause. "The map is stale" names an app nobody touched.
- **Typing:** the projection degraded to a plausible value, so nothing threw (same shape as [the-map-recognised-modules-by-their-names.md](./the-map-recognised-modules-by-their-names.md)).

## Countermeasure

Two pairs were subtracted in PR #49. The link text became one constant read
by the producer and the guard. The page stopped being committed, so the
guard's subject changed shape. `scripts/check-coupled-lists.sh` read both
copies of the remaining pairs in pre-commit and CI, comparing meaning rather
than text, and failing loudly when an extraction read nothing.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commits `01e8a28` and `e065cd1` shipped the check.

What holds today, read this session:

- **Map trigger paths:** gone. The generator now runs only on demand from the
  `architecture` workflow, so there is no hook list to compare
  (`check-coupled-lists.sh:27-31`).
- **Knowledge index:** subtracted by commit `8230bcebe` (2026-11-15).
  `docs/knowledge/README.md` now holds one `.md)` link for 160 files (counted
  with `grep -c` and `ls`), so no per-entry index can drift.
- **Suffixes:** still a pair, checked. `check-coupled-lists.sh:38-60` reads
  the set out of `TESTED_FILE_PATTERN` and requires each suffix in every
  app's `coverage.include`, except `.schema.ts` in an app with no `api/`. It
  runs in `.husky/pre-commit` (line 365) and `ci.yml` (line 151).

**Proof it can fail:** on a scratch copy, the check passed, then `policy` was
added to `TESTED_FILE_PATTERN` alone. It exited 1, once per app:

```
[check-coupled-lists] apps/banana-rush/vitest.config.ts covers no '*.policy.ts' while borso/test-file-has-sibling-source demands a test for one. Add it to coverage.include, or drop it from TESTED_FILE_PATTERN.
```

**Proposed:** subtract the suffix pair as the other two were. Export the
suffix list from one module that `eslint-rules/impurity.js` builds its regex
from, and add a shared coverage preset that every `vitest.config.ts` imports
and that builds `coverage.include` from the same list. A suffix then has one
place to land, section 2 of `check-coupled-lists.sh` can be deleted, and a
disagreement becomes impossible (level 1). The same preset would carry the
per-run `reportsDirectory` of
[two-coverage-runs-shared-one-scratch-folder.md](./two-coverage-runs-shared-one-scratch-folder.md).

**Similar instances:** `grep -n "^# [0-9]\." scripts/check-coupled-lists.sh`
lists the pairs the check reads today: the suffixes, a migration's tables
against the back-e2e harness's two lists, pragma's preview clone against its
ADR, and the blueprint tooling's layer suffixes against the naming standard. Each is a second hand-written copy, and each could be read from its
source instead.

---
date: 2026-08-15
introduced-at: conception
detected-at: review
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/49
fix-pr: https://github.com/hugoleborso/borso.fr/pull/49
fix-commits: [01e8a28]
eradication-level: 2
time-to-detect: days
tags: [ci, gates, pre-commit, github-actions, vitest, eslint, drift]
---

# Two copies that had to agree, and nothing made them agree

## Symptom

Four times in one pull request, a rule was written down in two places and the
two drifted. Every one of them read correctly on its own.

| The rule | Copy A | Copy B | What the disagreement did |
| --- | --- | --- | --- |
| Which paths make the architecture map stale | `.husky/pre-commit`, as a `grep -E` | `.github/workflows/architecture.yml`, as a YAML list | A commit touching only `blueprint-utils.ts` reached CI with a map nothing had regenerated |
| Which suffixes are gated | `eslint-rules/impurity.js`, as a regex | every `vitest.config.ts`, as `coverage.include` | A `.schema.ts` with no test would fail a coverage number and no rule that names it |
| The text of the "browse the map" link | the architecture workflow's comment body | the guard that decides whether to rewrite it | `[Browse the full map]` never matched `[Browse the full maps]`, so the comment renotified everyone on every push |
| The fields of a journey feature | the model in `architecture-journeys.ts` | the payload projection in `architecture-page.ts` | Adding `overview` to the model and not to the projection silently removed the overview entry from every feature |

None of these is a bug a reviewer can see, because there is nothing wrong with
either half. Only the pair is wrong, and the pair is never on screen at once.

## Root-cause chain

1. A rule has to be expressed in a language each consumer speaks. A hook wants
   a `grep -E` pattern; a workflow wants a YAML list; a lint rule wants a
   regex; a coverage gate wants a glob.
2. So the rule is written twice, in two dialects, and neither file can import
   the other's version.
3. The second copy is written at the same moment as the first, by the same
   person, so it is right on the day it lands. Nothing about it announces that
   it is a copy.
4. Later, one consumer gains a case. The person adding it edits the file they
   are in.
5. The other copy is now wrong, and nothing reads both. **A gate can only fail
   on what it looks at, and no gate looked at the relationship.**
6. The failure surfaces somewhere unrelated — a stale map on an innocent
   commit, a coverage number with no rule behind it, a notification storm —
   and reads as a bug in the consumer rather than as drift between two lists.

## Detection failure causes

- **Each half passes its own review.** The diff that adds a path to a workflow
  is correct. The reviewer would have to know a second file exists and hold its
  contents in memory.
- **Three of the four were found by an audit, not by use.** They had been wrong
  for as long as both copies existed and nothing had gone visibly wrong, which
  is the definition of a defect with no detector.
- **The consequence is displaced from the cause.** "The architecture page is
  stale" names an application whose code nobody touched. Nothing in that message
  points at a hook.
- **The fourth one degraded to a plausible answer.** `overview` arriving
  `undefined` read as `false`, which is a legal value, so the picker rendered a
  smaller menu rather than an error. Same shape as
  [the map that recognised modules by their names](./the-map-recognised-modules-by-their-names.md).

## Countermeasure

`scripts/check-coupled-lists.sh`, run in pre-commit and in CI, reads both copies
of the two rules that still exist as pairs and fails when they disagree.

It compares meaning rather than text, because the dialects differ:

- For the trigger paths it takes the YAML list as the source, strips the glob
  tail, and requires each path to appear in the hook — with the hook's
  backslashes removed first, so `blueprint-utils\.ts` and `blueprint-utils.ts`
  are one path rather than two.
- For the suffixes it reads the set out of `TESTED_FILE_PATTERN` and requires
  each to appear in every application's `coverage.include`, allowing the one
  case where absence is structural rather than an omission: a front end has no
  `api/`, so it has no `.schema.ts` to cover.
- A third pair joined it while this entry was being written: every file under
  `docs/knowledge/` against the index in its `README.md`. Three had drifted out,
  which makes them unfindable by everyone except the person who wrote them —
  the whole audience. `docs/dantotsus/README.md` is deliberately *not* a
  per-entry index, says so, and points at `ls` instead, so it is not checked.

Both extractions fail loudly when they read nothing, because a check that has
silently stopped finding its subject is the same defect one level up.

## Eradication

**DevX check, level 2.** Verified against both original defects by
reintroducing each:

| Reintroduced | Result |
| --- | --- |
| `blueprint-utils.ts` removed from the hook's trigger | fails, naming the path and the file |
| a suffix added to `TESTED_FILE_PATTERN` and not to the configs | fails once per application, naming the config |

Shipped in `01e8a28`, wired into `.husky/pre-commit` and `.github/workflows/ci.yml`.

The other two pairs were eradicated structurally in PR #49 rather than checked,
which is the better rung and the reason they are not in the script:

- The link text became one constant read by both the producer and the guard.
- The page is no longer committed at all, so the comment guard's subject
  changed shape.

**Why not level 1 for the two that remain.** A single source of truth would mean
generating the hook's `grep -E` from the workflow's YAML, or generating both
from a third file. That is a build step producing a git-tracked hook, which
brings back the problem this repository just removed from the architecture maps:
a generated file under a byte gate. The pair is cheap to check and expensive to
unify, so it is checked.

## The general shape

When a rule has to be expressed twice because two consumers speak different
languages, the second copy is not documentation — it is an untested branch of
the same logic. Write the check that reads both **at the moment you write the
second copy**, not after the drift produces a symptom somewhere else. The
question that finds these: *if I change this list, what else is now wrong, and
what would tell me?*

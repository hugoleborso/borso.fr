---
date: 2026-08-20
introduced-at: apps/borsouvertures
detected-at: dataset-build
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/76
fix-commit: n/a (upstream data shape; the fix is how we key and match it)
time-to-detect: hours (a silently smaller dataset says nothing)
tags: [borsouvertures, lichess, dataset, identity, vendor-quirk]
---

# The Lichess openings dataset: a name is not an identifier, and a build that drops a family says nothing

`borsouvertures` builds its openings dataset from the Lichess opening
tables. Two properties of that source have each cost a debugging session.

## 1. One name covers several different lines

The dataset reuses a single name across several rows. *Ruy Lopez: Closed*
names five different move sequences, two of them under the same ECO code.
A slug derived from the name alone is therefore not an identifier: it
collides, and the collisions are silent.

**What identifies a line is its move sequence.** It is unique across the
whole dataset, which makes a fingerprint taken from the moves unique by
construction rather than by luck of the current data. `openingIds.utils.ts`
derives the identifier from the name *and* the moves for this reason —
dropping the move component reintroduces the collision.

## 2. A family that matches nothing is silent

`build-openings.ts` walks a `FAMILIES` list and pulls the matching rows out
of the source. A family that matches nothing does not fail the build: the
run succeeds, the dataset is simply smaller, and nothing names the family
that was dropped. So the build asserts that **every** family produces at
least one opening.

Two ways a family stops matching, both of which have happened:

- **Prefix shadowing.** A family whose name is a prefix of an earlier one
  never wins a `find`. Listing both `Queen's Gambit` and `Queen's Gambit
  Declined` yields only the first.
- **Apostrophe form.** A name spelled with a typographic apostrophe (`'`)
  cannot match source rows that use the ASCII one (`'`). The two names look
  identical in a diff and in a terminal.

## Rule of thumb

When adding a family, run the build and read the count it reports. A
number that did not move is the failure this entry describes.

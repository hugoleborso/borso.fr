---
date: 2026-08-21
introduced-at: implementation
detected-at: review
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/81
fix-pr: https://github.com/hugoleborso/borso.fr/pull/82
fix-commits: [pending]
eradication-level: 2
time-to-detect: months
tags: [documentation, last-loop-lepin, meta, gates, domain-model, code-quality]
---

# A comment decayed and took the vocabulary with it

## Symptom

`apps/last-loop-lepin/api/src/punch/self-punch.controller.ts` opened with a
header stating that the geofence was the only barrier on self-punching.

The geofence had been removed in commit `4bb4b78`, months earlier. The test
file said so out loud — `self-punch.controller.test.ts:74` is literally named
*"accepts a POST without geo coordinates (geofence removed)"*.

Worse, `apps/last-loop-lepin/VOCABULARY.md` had copied the claim: its
*Self-punch* section said *"the file header names the geofence as the
barrier"*. A reader arriving at the vocabulary — the document this repository
tells you to read **before naming anything** — was told the code enforced
something it had stopped enforcing.

Found by an agent stripping comments, only because it read the code beneath
each comment before deleting it.

## Root-cause chain

1. **Why did the header still claim a geofence?**
   The commit that removed the geofence changed the handler and its test. It
   had no reason to open the header, which sat above the imports.
2. **Why did nothing flag the contradiction?**
   The test asserted the new behaviour and passed. Nothing compares a
   sentence to the code under it.
3. **Why did the vocabulary repeat it?**
   Whoever wrote the *Self-punch* section sourced it from the header, which
   was the most authoritative-looking description available.
4. **Why was that sourcing accepted?**
   `check-vocabulary-paths.sh` checks the one mechanical fact in the document
   — that each `Lives in:` names a real folder — and deliberately leaves the
   definitions to a reviewer. A definition citing a comment looked like any
   other definition.
5. **Why did it survive review?**
   The claim was true when written. Nothing in either document carries the
   date of the code it describes.

**Root cause:** we thought a stale comment was a local cost, paid by whoever
read that file; actually a comment is the most-copied artefact in a repository
— it is *right there* when someone writes documentation — so a decayed comment
propagates into the documents that are supposed to outrank it.

This is the concrete case behind [`00-principles.md`](../standards/00-principles.md):
a comment is *"the explanation the code failed to give, parked beside it where
nothing checks it and nothing keeps it true."*

## Detection failure causes

- **Typing:** prose.
- **Linter / static analysis:** no rule compared the header to the handler.
  `borso/no-comments` did not exist yet; it now removes the class outright.
- **Functional validation locally:** the code was correct. Only its
  description was wrong, which is invisible at runtime.
- **CI:** the suite asserted the *new* behaviour and was green. A green suite
  beside a contradicting sentence is the exact blind spot.
- **Code review:** the reviewer of `4bb4b78` was reading a geofence removal.
  The header is 40 lines above the change.

## Countermeasure

Both statements corrected in PR #81: the header is gone with every other
comment, and the vocabulary's *Self-punch* section now states the rule rather
than citing a header. The same agent corrected a second stale claim in the
*Punch* section, which pointed at DSQL constraints *"beside the table"* rather
than at `docs/knowledge/dsql-postgres-compat-gaps.md`.

## Eradication (mandatory — code-level)

**Level 1, for the comment.** `borso/no-comments` makes the header
inexpressible. A sentence that no longer has a place to sit cannot rot in it.

**Level 2, for the propagation.** Removing comments does not stop a vocabulary
from citing one — the citation outlives the artefact, and reads plausibly.
`scripts/check-vocabulary-paths.sh` now refuses a vocabulary sentence that
sources a claim from a comment:

```sh
grep -nEi '(file )?header (names|says|records|states)|the comment (above|beside|on)' "$vocabulary"
```

Verified in both directions: re-adding *"The file header names the geofence as
the barrier"* to `apps/last-loop-lepin/VOCABULARY.md` fails the gate with that
line quoted; removing it passes. The gate runs in pre-commit alongside the
`Lives in:` path check.

The failure message names the two ways out, which are the two the vocabulary
should have used from the start: **state the rule**, or **point at the test
that holds it**.

## Related

- [`docs/standards/01-naming.md`](../standards/01-naming.md) — the vocabulary's
  contract, and why it is read before naming anything.
- [`docs/standards/00-principles.md`](../standards/00-principles.md) — *"a
  comment recording how a piece of code changed over time is never the right
  artefact"*.

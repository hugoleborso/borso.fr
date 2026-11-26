---
summary: 'Each `## ` heading of an `INVARIANTS.md` must be a term of the app''s `VOCABULARY.md` whose `Lives in:` names that folder, and a term has one invariants file; add the term to the vocabulary before writing its rules.'
triggers:
  paths:
    - 'apps/*/**/INVARIANTS.md'
---

# An invariants heading is a vocabulary term

Two agents of PR #410 learned this from `scripts/check-vocabulary-paths.sh`
after writing their sections. `site-agent` wrote three, and `fix-agent`
wrote one for the rate limit of public writes.

- A `## ` heading in `INVARIANTS.md` names a term of `apps/<app>/VOCABULARY.md`.
- That term's `Lives in:` line names the folder that holds this
  `INVARIANTS.md`. So one term has one invariants file.
- A feature that spans `api/` and `site/` needs a site-side term for its
  site rules, such as "Query read roots" in
  `apps/pragma/site/src/lib/queries/INVARIANTS.md`.

Before writing a rule that has no term yet, add the term to `VOCABULARY.md`
with its `Lives in:` folder. Then write its invariants there. The split is
[ADR-2026-11-15T0628](../adr/2026-11-15T0628-glossary-and-invariants-are-two-files.md).

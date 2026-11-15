# Invariants — borso-fr, `site/src/styles`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/borso-fr/`.

## Token namespace

- Three in one `@theme` block: `apex-` for the landing page, `atelier-`
  for the Mondrian studio, `labours-` for the twelve labours.
- A token is a Tailwind utility wherever it is known at build time. The
  colours the twelve labours page picks at runtime are exported from
  `site/src/theme/twelve-labours.theme.ts` as `var(...)` references.

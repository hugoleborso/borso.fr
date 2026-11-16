---
summary: 'Vitest 4 hides every 100% row of the text coverage table when it detects an agent, so each app config sets skipFull: false to show which gated files a --changed run measured.'
triggers:
  paths:
    - 'apps/*/vitest.config.ts'
    - 'infra/*/vitest.config.ts'
---

# Vitest hides full coverage rows from agents

Vitest 4.1 reads `isAgent` from `std-env`. When it is true and the coverage
reporters include `text`, it sets `skipFull: true` on that reporter unless the
config says otherwise, and adds `text-summary` (measured in
`node_modules/vitest/dist/chunks/coverage.*.js`, vitest 4.1.12).

A `--changed <base> --coverage` run where every gated file is at 100% then
prints an empty per-file table and 100% totals. The technical validator of
PR #363 could not tell which changed gated files the gate had measured. The
totals did count them: 364 statements on the merge's diff (measured).

Each app's `vitest.config.ts` sets `reporter: [['text', { skipFull: false }]]`,
which lists every measured file. A `--changed` run measures only the changed
gated files, so the table stays a few rows long. Do not remove that line to
cut output: an agent then loses the list of what the gate measured.

`infra/cdk` and `infra/shared` keep `['text', 'lcov', 'html']`, so an agent
still sees only failing rows there. Their coverage gate runs in CI.

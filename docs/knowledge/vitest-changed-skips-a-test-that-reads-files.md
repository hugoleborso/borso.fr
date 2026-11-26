---
summary: '`vitest --changed` and `vitest related` select a test only through its imports, so a test that finds its subjects with `readdirSync` or a `?raw` glob is skipped when they change; a lazy module-level `import.meta.glob` puts them in its graph.'
triggers:
  commands:
    - 'vitest\s+(run\s+)?.*--changed\b'
    - 'vitest\s+related\b'
---

# `vitest --changed` skips a test that reads files

`--changed <base>` and `vitest related <file>` walk each test's module graph.
A test that reads its subjects from the disk has none of them in that graph.

On PR #406 the design token test of pragma scanned every site source with
`readdirSync`. The pre-push run, which uses `--changed`, skipped it, and an
undefined `bg-surface` failed first in CI's full run (measured, CI run
45788107468, job `app-tests (pragma)`).

What selects the test, measured with `vitest related --run --project core
site/src/routes/sessions/SessionGearPage.tsx` on 2026-11-26:

| How the test lists its files | Selected |
| --- | --- |
| `readdirSync` walk | no |
| `import.meta.glob(..., { query: '?raw', eager: true })` | no |
| `import.meta.glob([...])`, lazy, inside a `describe` callback | no |
| `import.meta.glob([...])`, lazy, in a module-level `const` | yes |

The lazy glob loads nothing, so the test still reads the content with
`readFileSync` on the glob's keys. See
`apps/pragma/site/src/lib/design-tokens.utils.test.ts`.

Tests that read migrations with `readdirSync`, such as each app's
`migrations.audit.test.ts`, still run only in CI's full suite when a `.sql`
file changes. A `.sql` file is not a module, so a glob does not help there.

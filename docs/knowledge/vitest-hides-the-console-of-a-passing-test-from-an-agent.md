---
summary: 'Vitest 4.1.11 run by an agent prints no `console.log` from a passing test; add `--reporter=default` to see it, instead of writing the value to a scratch file.'
triggers:
  paths:
    - 'apps/*/cdk/test/**/*.test.ts'
    - 'infra/cdk/test/**/*.test.ts'
  commands:
    - '\bvitest\b[^|;&]*\bcdk/test\b'
---

# Vitest hides the console of a passing test from an agent

On PR #234 an implementer added a `console.log` to a CDK test in pragma to read
a synthesized resource. The test passed and printed nothing, so the value went
to a scratch file instead.

Measured on 2026-10-29, Vitest 4.1.11, `apps/pragma`, a core-project test that
logs `PROBE-LOG-LINE` and passes:

| Command | Lines with `PROBE` |
| --- | --- |
| `vitest run --project core <file>` | 0 |
| `vitest run --project core --silent=false <file>` | 0 |
| `vitest run --project core --reporter=default <file>` | 1 |

The config sets neither `silent` nor a reporter, and the result is the same
with `rtk` out of the way. So the reporter Vitest picks when an agent runs it
drops the console of a passing test (inferred from the table). `--silent=false`
does not bring it back. `--reporter=default` does.

A failing test still prints its console, so the trap is only when you log in
order to read a value.

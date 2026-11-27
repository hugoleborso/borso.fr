---
summary: 'Run knip from the repository root, scoped with `--workspace apps/<app>`; run from inside an app it finds no `knip.json` and calls every devDependency unused.'
triggers:
  commands:
    - 'knip\s+(\S+\s+)*--workspace\s+\.(\s|$)'
  output:
    - 'Unused devDependencies'
---

# knip runs from the repository root

The only knip configuration is `knip.json` at the repository root. It names
each app as a workspace with its own entries.

On PR #413 the technical validator ran `pnpm exec knip --workspace .` from
`apps/pragma`. It exited 1 and listed every devDependency of pragma as unused.
The same check from the root, `pnpm exec knip --workspace apps/pragma`, exited 0
(measured, concert sign-up friction log, 2026-11-26). The likely reason is
that knip finds no configuration inside the app, so it falls back to its
defaults and misses the config files that use those packages (inferred).

A knip finding counts only from the root. The pre-push hook already runs it
there.

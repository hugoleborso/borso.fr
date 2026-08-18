# Stryker's sandbox breaks a Vitest `globalSetup` that lives outside the workspace

Observed 2026-08-15 pointing Stryker at `infra/cdk` for the first time.

Every run died in the dry run:

```
Error: ERR_LOAD_URL Failed to load url
/home/user/borso.fr/infra/cdk/scripts/vitest-cdk-outdir-teardown.js
(resolved id: …). Does the file exist?
```

The file exists — at `<repo>/scripts/`, not at `<repo>/infra/cdk/scripts/`.
`infra/cdk/vitest.config.ts` names it as `'../../scripts/vitest-cdk-outdir-teardown.js'`.

**Why it breaks:** Stryker copies the workspace into `.stryker-tmp/sandbox-N/`
and runs from there. A `globalSetup` path that walks *up* out of the workspace
resolves against the sandbox, which contains only the workspace, so the file is
genuinely absent. The error names an absolute path that never existed, which
sends you looking for a missing file rather than a moved root.

**Fix:** give Stryker its own Vitest config with no out-of-workspace
`globalSetup`, via `vitest: { configFile: 'vitest.mutation.config.ts' }` — the
shape `apps/pragma` already uses for a different reason. The mutation run needs
only the pure suites, and those need no global setup.

Two other things in the same area, both real:

- `pnpm --filter <pkg> run test:mutation -- --mutate '<glob>'` fails with
  `error: too many arguments for 'run'`. pnpm forwards the `--` itself into
  Stryker's argv. Run the binary directly from the workspace instead:
  `cd apps/x && ../../node_modules/.bin/stryker run --mutate '<glob>'`.
- A killed Stryker run leaves `.stryker-tmp/sandbox-*` behind — a whole copy of
  the application. Any tool that walks `apps/` then reads every file twice and
  reports it confidently; the architecture generator read 501 files instead of
  249 that way, with every context appearing twice.

## See also

- [`docs/dantotsus/a-mutation-config-a-workspace-file-overruled.md`](../dantotsus/a-mutation-config-a-workspace-file-overruled.md)
- [`docs/dantotsus/a-sed-delimiter-disarmed-the-mutation-gate.md`](../dantotsus/a-sed-delimiter-disarmed-the-mutation-gate.md)

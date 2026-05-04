# Biome 2.x stack-overflows when scanning binary files in `dist/` — turn on `vcs.useIgnoreFile`

## Symptom

```
thread 'biome::workspace_worker_2' (18302) has overflowed its stack
fatal runtime error: stack overflow, aborting
```

…fired by `pnpm exec biome lint apps/borso-fr` (or any path that included a workspace whose `dist/` was populated by a Vite build). Adjusting `RUST_MIN_STACK` did not help. Removing `dist/` from the working tree made the crash go away.

## Why

Biome 2.x walks the workspace tree to find files to lint. It does not honour `.gitignore` by default; instead it has its own `files.includes` / `files.excludes` config. When the build had populated `apps/borso-fr/dist/assets/` with woff / woff2 font binaries (≈40 files, plus PNGs from the family pages), Biome attempted to read each file to determine its type. The Rust parser's stack frame for one of those binaries blew the per-thread stack limit — exact file unclear because the crash happens before Biome reports which file it was on.

The workspace's per-app Biome config (`apps/borso-fr/biome.jsonc`) had `"includes": ["bin/**", "site/**"]`, which *does* exclude `dist/`. But the *root* `biome.jsonc` had no `files.includes`, and the root config was the one being applied at the moment the crash hit.

## The fix

Turn on `vcs.useIgnoreFile` at the repo's root `biome.jsonc`:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.14/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  …
}
```

With `useIgnoreFile: true`, Biome reads `.gitignore` (which has `dist/`) and skips the binary directory. The crash stops; lint completes in under a second.

## Why `vcs.useIgnoreFile` should always be on for this repo

- Every workspace builds into a `dist/` (already gitignored).
- The screenshot folder under `docs/features/<app>/<slug>/validation/` is *not* gitignored (we want screenshots committed) but contains PNGs Biome doesn't need to read — the gitignore rule lets us add per-folder ignores there if it ever becomes a problem.
- `cdk.out/`, `coverage/`, and the workspace `node_modules/` are all listed in `.gitignore` and shouldn't be linted.

The setting is the safest way to keep Biome's working set aligned with the repo's source tree.

## Don't

- Don't try to bump `RUST_MIN_STACK` or `ulimit -s` to "fix" this — the binary parse path's recursion is unbounded, so any limit can be exceeded by a sufficiently large input. The fix is to stop scanning the binary in the first place.
- Don't rely on per-app `files.includes` to exclude `dist/` — the root config still scans, and the root scan is what crashes.

## See also

- `biome.jsonc` at the repo root — the canonical setting.
- [`docs/dantotsus/vite-non-module-script-tags-arent-bundled.md`](../dantotsus/vite-non-module-script-tags-arent-bundled.md) — another Vite-build / repo-tooling interaction surfaced during the same PR.

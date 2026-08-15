# Every repo tool has a directory it expects, and says so badly

Four tools in this monorepo fail in four different unhelpful ways when run from
the wrong directory. All four cost time in PR 50. The failures do not name the
real problem, so they read as broken tooling.

| Tool | Run it from | What the wrong directory looks like |
| --- | --- | --- |
| Blueprint generators | repo root | `ERR_MODULE_NOT_FOUND: Cannot find module '/home/user/borso.fr/apps/pragma/.claude/skills/blueprint/blueprint-indexing.ts'` — the path is resolved relative to `cwd`, so the error names a file that was never supposed to exist |
| `vitest` | the app workspace (`apps/<slug>`) | `No test files found, exiting with code 1`, then a list of `include` globs that clearly cover the file you just named. The root has its own vitest config for `eslint-rules/**`, and the app's projects (`core`, `back-e2e`) only exist under the app |
| `pnpm exec <anything>` | any workspace, or the root | `ERR_PNPM_RECURSIVE_EXEC_NO_PACKAGE  No package found in this workspace` when `cwd` is outside the monorepo entirely — a scratch directory, for instance |
| `scripts/*.sh` | anywhere | these are the exception: each one `cd`s to the repo root itself, computed from `BASH_SOURCE`. Copy that pattern in new scripts |

Concretely:

```bash
# from the repo root
pnpm exec tsx .claude/skills/blueprint/blueprint-indexing.ts
pnpm exec tsx .claude/skills/blueprint/blueprint-heatmap.ts

# from apps/pragma, not from the root
npx vitest run --project core site/src/lib/queries/song-write-failure.core.test.ts
```

The blueprint one bites hardest because it fires inside a failed pre-commit,
when the obvious move is to re-run the command the hook just printed — from
wherever you happen to be, which is usually the app you were editing.

## Why not fix the tools

The scripts under `scripts/` already resolve their own root, and that is the
right pattern for anything this repository owns. The two that do not are
`tsx <path>` and `vitest`, where the directory dependence belongs to the tool
rather than to us: `tsx` resolves the path argument against `cwd` by definition,
and vitest's project config is per-workspace on purpose. Wrapping them would add
a layer to maintain in exchange for a lookup that this table now answers.

---
summary: 'pnpm 10.0 keeps a transitive or auto-installed peer at its locked version even when a fix sits inside the range; a temporary override, or declaring the peer, moves it.'
triggers:
  commands:
    - '\bpnpm\s+audit\b'
    - '\bpnpm\s+(up|update)\b.*--depth'
---

# pnpm keeps a locked version its range has outgrown

Measured on PR #274, with pnpm 10.0.0 (the `packageManager` this repository
pins).

- `pnpm update -r --depth Infinity <names>` rewrote the lockfile and moved
  almost nothing: 112 findings became 107. `fast-uri` stayed at 3.1.0 under
  `ajv`'s `^3.0.1`, with 3.1.9 published.
- `vite-plugin-pwa@1.3.0` declares `workbox-build: ^7.4.1`, and the lockfile
  kept the auto-installed peer at 7.4.0. Neither `pnpm install` nor
  `pnpm install --fix-lockfile` changed it.
- Taking `main`'s `pnpm-lock.yaml` during a merge put every refreshed version
  back, because the lockfile is the only place they lived.

## What moves them

1. A temporary `pnpm.overrides` entry per package, scoped to its major
   (`"fast-uri@^3": "3.1.9"`), then `pnpm install`.
2. Restore `package.json`, then `pnpm install` again. pnpm keeps a resolved
   version that still satisfies every range, so the refresh stays and no
   override ships. `git diff --quiet package.json` and
   `grep -c overrides pnpm-lock.yaml` (0) confirm it.

An auto-installed peer ignored the override. Declaring it beside its sibling
(`workbox-build` next to the `workbox-window` already in `devDependencies`)
is what moved it.

Re-run `pnpm audit --audit-level=high` after any lockfile merge, since a
conflict resolved by taking one side drops the other side's refresh.

# `pnpm install` warns on incompatible peer deps but installs anyway

A dependency whose `peerDependencies` field doesn't match the resolved
React (or any other peer) version logs a warning during `pnpm install`,
but the install **completes successfully**. The package ends up in
`node_modules/.pnpm/…/`, resolves at build time, and silently crashes at
runtime when it hits a peer-side API that doesn't exist.

## How it bit us

Hit during the PR #8 react-chessboard v5 upgrade:

```
WARN  Issues with peer dependencies found
apps/borsouvertures
└─┬ react-chessboard 5.10.0
  ├── ✕ unmet peer react@^19.0.0: found 18.3.1
  └── ✕ unmet peer react-dom@^19.0.0: found 18.3.1

Done in 8.3s
```

The install completed. `pnpm typecheck` passed (the types compiled
against React 18). `pnpm build` succeeded. The browser opened — and
every `<Chessboard>` crashed inside its React error boundary because
the v5 implementation calls `React.use(ChessboardContext)`, and the
`use()` hook only exists in React 19.

The `Done in 8.3s` was misleading; the install was *not* done in a
useful sense.

## Detection

Two signals to take seriously:

- **Read every `WARN  Issues with peer dependencies found`.** Don't
  treat it as noise. If the unmet peer is a runtime-loaded dependency
  (React, Vue, …), treat the warning as a runtime-failure prediction.
- **A new dep that immediately produces React error-boundary stack
  traces** with the dep at the top of the stack is almost always a
  peer-version mismatch.

## Mitigations

- **Pin to the latest minor that supports the peer you have.** If the
  upgrade isn't worth a peer-major bump, find the last library version
  whose peerDependencies still accept your peer. `npm view <pkg>@<v>
  peerDependencies` shows the requirement per version.
- **Make the peer bump explicit.** If the upgrade is wanted, bump both
  the dep and its peer in the same commit (React + react-chessboard +
  `@types/react` + `@types/react-dom`). Don't ship just the dep bump.
- **Optional hardening (not adopted yet, deliberate trade-off):**
  `.npmrc` with `strict-peer-dependencies=true` would convert the
  warning into an install failure. Adopted in PR #9 for this monorepo —
  see the npmrc diff in that PR.

## Related

- [`docs/dantotsus/built-my-own-before-checking-the-library.md`](../dantotsus/built-my-own-before-checking-the-library.md) —
  the upstream-research discipline that would have surfaced the
  React-19 requirement before the install.

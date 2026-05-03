# borso.fr

Personal monorepo for `borso.fr` apps and shared AWS infra.

Architecture and operational runbooks live under `docs/` (added in
later commits).

## Apps

- `apps/borso-fr/` — apex landing site at `https://borso.fr`

## Setup

Requires Node 22 and pnpm 10. With [corepack](https://nodejs.org/api/corepack.html)
enabled, the right pnpm version is picked up automatically from the
`packageManager` field.

```sh
pnpm install
```

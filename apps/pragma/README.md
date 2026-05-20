# pragma

Private PWA at `pragma.borso.fr` for the band's catalog / setlists / sessions / CRM.

Single-stakeholder app — five band members behind a shared password (ADR-0004). Full-stack triplet (`site` / `api` / `cdk`) modelled on `last-loop-lepin`.

## Scripts

- `pnpm dev` — boots the Docker-less local Postgres + Hono API + Vite site.
- `pnpm test:core` — runs the pure-helper + CDK construct gate at 100% coverage on every `*.core.ts` / `*.utils.ts`.
- `pnpm test` — runs the back-e2e suite against the local Postgres.
- `pnpm typecheck` / `pnpm lint` — gates.
- `pnpm build` / `pnpm synth` — production build + CDK template.

See `docs/features/pragma/first-features/spec/spec.md` for the functional contract.

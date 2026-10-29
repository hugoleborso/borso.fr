# pragma

Private PWA at `pragma.borso.fr` for the band's catalog / setlists / sessions / CRM.

Single-stakeholder app — five band members behind a shared password (ADR-0004). Full-stack triplet (`site` / `api` / `cdk`) modelled on `last-loop-lepin`.

## Scripts

- `pnpm dev` — boots the Docker-less local Postgres + Hono API + Vite site.
- `pnpm test:core` — runs the pure-helper + CDK construct gate at 100% coverage on every `*.core.ts` / `*.utils.ts`. CI runs it; locally run `pnpm exec vitest run --project core --changed <base>`.
- `pnpm test:e2e` — runs the back-e2e suite against the local Postgres. CI runs the whole suite; locally run `pnpm test:e2e --changed <base>` or `pnpm test:e2e <path>`.
- `pnpm typecheck` / `pnpm lint` — gates.
- `pnpm build` / `pnpm synth` — production build + CDK template.

See `docs/features/pragma/first-features/spec/spec.md` for the functional contract.

## Screens carry no explanatory text

Operator reviews 3, 5 and 6 of the UX redesign (PR #216) each removed explanatory text that the agents had added: rows T2, T5, T6, T7, U6 and W5 of `docs/features/pragma/ux-redesign/spec/spec.md`. A screen names things with an icon and one or two words. It does not explain itself in a sentence, a hint, a sample text or a header paragraph. When a control cannot work on this device, hide it rather than explain why.

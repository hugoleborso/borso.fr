# pragma

Private PWA at `pragma.borso.fr` for the band's catalog / setlists / sessions / CRM.

Single-stakeholder app — five band members behind a shared password (ADR-2026-05-19T1955). Full-stack triplet (`site` / `api` / `cdk`) modelled on `last-loop-lepin`.

## Scripts

`pnpm run` in this folder lists the scripts. `pnpm dev` boots the local Postgres, the API and the site together. CI runs `test:core` and `test:e2e` in full. Locally, run `pnpm exec vitest run --project core --changed <base>` and `pnpm test:e2e --changed <base>`.

See `docs/features/pragma/first-features/spec/spec.md` for the functional contract.

## Screens carry no explanatory text

Operator reviews 3, 5 and 6 of the UX redesign (PR #216) each removed explanatory text that the agents had added: rows T2, T5, T6, T7, U6 and W5 of `docs/features/pragma/ux-redesign/spec/spec.md`. A screen names things with an icon and one or two words. It does not explain itself in a sentence, a hint, a sample text or a header paragraph. When a control cannot work on this device, hide it rather than explain why.

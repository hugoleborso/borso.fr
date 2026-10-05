# talos

PWA at `talos.borso.fr` for one person: focus, todos, proposals, the daily brief, a searchable notes graph, messages and push notifications. Its content is a private GitHub repository that the API reads and writes at runtime (`GITHUB_REPO`); nothing from it lives here. Full-stack triplet (`site` / `api` / `cdk`, plus `domain/`) modelled on `pragma`.

- Contract and file formats: [`CONTRAT.md`](./CONTRAT.md). Words to use in code: [`VOCABULARY.md`](./VOCABULARY.md).
- Deploys to prod only, never to a preview ([ADR-0027](../../docs/adr/0027-talos-deploys-to-prod-only.md)). Stacks `talos-cluster` and `talos-prod`; the site bucket is `talos-prod-<account id>` because `talos-prod` is unavailable in S3.
- Secrets are SSM SecureStrings under `/talos/`, created by hand: `github-token`, `vapid-public`, `vapid-private`, `session-hmac`, `bootstrap-code`, `notify-secret`, and optionally `fire-url`, `fire-token`, `secret-phrase`.

## Deliberate differences from the other apps

- **One language.** The interface is French only, from one catalogue `site/src/i18n/fr.json`, which types the keys (`react-i18next.d.ts`). There is no `en.json` and no parity test; the rest of [standard 09](../../docs/standards/09-i18n.md) applies.
- **Stricter French-word check.** `eslint.config.js` adds the private repository's French keys (`statut`, `echeance`, `priorite`…) to `borso/no-french-identifiers` for this app, because they are the words most likely to leak from a file format into an identifier.

## Scripts

- `pnpm dev` — local Postgres, Hono API on port 3001, Vite on port 5180 with `/api` proxied.
- `pnpm test:core` — pure suites and the CDK stack test, 100% per-file coverage on `*.core.ts`, `*.utils.ts`, `*.adapter.ts`, `*.schema.ts`.
- `pnpm test` — back-e2e suite against the local Postgres.
- `pnpm test:mutation` — Stryker, 100% of mutants killed.
- `pnpm typecheck` / `pnpm lint` — gates.
- `pnpm build` / `pnpm run synth` — production build and CDK templates.

# talos

PWA at `talos.borso.fr` for one person: focus, todos, proposals, the daily brief, a searchable notes graph, a « Parler à Talos » button on every screen that opens Claude Code, and push notifications. Its content is the memory database (`memory_*` tables, [`MEMORY-CONTRACT.md`](./MEMORY-CONTRACT.md)); nothing from it lives here. Full-stack triplet (`site` / `api` / `cdk`, plus `domain/`) modelled on `pragma`.

The contract and file formats are in [`CONTRAT.md`](./CONTRAT.md). The words to use in code are in [`VOCABULARY.md`](./VOCABULARY.md).

Talos deploys to prod only, never to a preview ([ADR-2026-10-06T2302](../../docs/adr/2026-10-06T2302-talos-deploys-to-prod-only.md)). Its stacks are `talos-cluster` and `talos-prod`. The site bucket is `talos-prod-<account id>` because `talos-prod` is unavailable in S3.

Secrets are SSM SecureStrings under `/talos/`, created by hand. The `SecretName` type in `api/src/helpers/secrets/secrets.setup.ts` names every one the API reads.

## Icon and opening

- The icon is a didrachm of Phaistos showing Talos winged. It shows on the home screen, in the browser tab and before the title of each tab screen. The image files are in `site/public/icons/`.
- The home-screen icons are the `apple-touch-icon.png` (180 px) and `icon-*.png` files in `site/public/icons/`, whose names give their sizes. They are opaque full-colour PNGs: the coin on the vase black `#070605`, at 85 % of the side, 66 % for the maskable one so it stays inside the safe circle. They are drawn from a 360 px cut-out of the photo, so the 512 px sizes are upscaled. Changing an icon file means bumping `CACHE_VERSION` in `site/public/sw.js`, because the service worker serves `/icons/` from its cache first.
- Credit: Didrachme de Phaistos, Cabinet des médailles (BnF), photo Jastrow (2006), Wikimedia Commons ([`File:Didrachm_Phaistos_obverse_CdM.jpg`](https://commons.wikimedia.org/wiki/File:Didrachm_Phaistos_obverse_CdM.jpg)). Commons lists the photo as public domain, so the credit is a courtesy rather than a licence condition.
- On a cold start, once per browser session, a 4.2 second opening plays. The coin spins in, the app opens in a circle around it, and the coin lands in the page title. A tap skips it. It is skipped under reduced motion, because `tokens.css` sets every animation to zero there. The code is `OpeningOverlay`, `SpinningCoin` and `lib/opening.*`.

## Deliberate differences from the other apps

- **One language.** The interface is French only, from one catalogue `site/src/i18n/fr.json`, which types the keys (`react-i18next.d.ts`). There is no `en.json` and no parity test; the rest of [standard 09](../../docs/standards/09-i18n.md) applies.
- **Stricter French-word check.** `eslint.config.js` adds the private repository's French keys (`statut`, `echeance`, `priorite`…) to `borso/no-french-identifiers` for this app, because they are the words most likely to leak from a file format into an identifier.

## Scripts

`pnpm run` in this folder lists the scripts. `pnpm dev` runs the local Postgres, the Hono API on port 3001 and Vite on port 5180 with `/api` proxied. `dev:db` seeds the local database with the fictional memory of `test/memory-seed.json`. CI runs `test:core`, `test:e2e` and `test:mutation` in full. Locally, run `pnpm exec vitest run --project core --changed <base>` and `pnpm test:e2e --changed <base>`.

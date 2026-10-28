---
summary: 'talos opens nothing without a passkey: drive pnpm dev with a CDP virtual authenticator, the fictional memory `dev:db` seeds, and wipe the local database before each new browser context.'
triggers:
  commands:
    - 'talos.*db:local:wipe'
    - 'WebAuthn\.addVirtualAuthenticator'
---

# Screenshotting talos behind its passkey

talos has no preview stage ([ADR-0027](../adr/0027-talos-deploys-to-prod-only.md)), so a screenshot of a screen comes from `pnpm dev` on the machine, and every screen but `/login` sits behind a passkey.

## The recipe that worked on PR #171

1. Start the app with `pnpm dev` from `apps/talos/`: `dev:db` seeds the local database with the fictional memory of `apps/talos/test/memory-seed.json`. Edit that file, or post more operations to `/api/agent/changes`, for other content.
2. In Playwright, open a CDP session on the page and add a virtual authenticator before the first navigation: `WebAuthn.enable`, then `WebAuthn.addVirtualAuthenticator` with `protocol: 'ctap2'`, `transport: 'internal'`, `hasResidentKey`, `hasUserVerification`, `isUserVerified` and `automaticPresenceSimulation` all true.
3. On `/login`, the first run shows the bootstrap step: fill `#bootstrap-code` with `talos-dev` and press « Créer la passkey ».
4. Switch light and dark with `page.emulateMedia({ colorScheme })` on the same page. A new browser context means a new authenticator with no credential.

## The trap

The local database keeps the passkey from the first run, so registration is closed afterwards and the screen shows « Se connecter avec une passkey ». A fresh context's authenticator holds no credential, the sign-in fails silently, and every screenshot of the run is the login screen. Stop the servers and run `pnpm run db:local:wipe` before a run that starts a new context. Stop the servers by the port they hold, `lsof -ti tcp:5180` and `tcp:3001`, not with `pkill`.

Content in these screenshots must stay fictional: they are committed under `docs/features/talos/`, and talos exists to hold private content.

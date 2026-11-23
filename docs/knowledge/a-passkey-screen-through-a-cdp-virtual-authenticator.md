---
summary: 'agent-browser has no WebAuthn command, but a CDP virtual authenticator attached to its page signs a passkey ceremony: attach to the visible page, not `pages()[0]`, and keep the CDP session open in a background process for the whole run.'
triggers:
  commands:
    - 'WebAuthn\.'
    - '[Vv]irtual ?[Aa]uthenticator'
    - 'connectOverCDP'
  output:
    - 'NotAllowedError'
---

# A passkey screen through a CDP virtual authenticator

On PR #389 four agents (`visual-validator` three times, `fix-visual` once)
logged that `agent-browser` 0.41.2 has no WebAuthn command. Each then wrote
the same workaround by hand. It worked: the skull-king sign-up and sign-in
rows passed with it, as `validation/visual-validation-2026-11-22-2014.md`
under `docs/features/skull-king/score-keeper/` records. So "passkeys cannot
be exercised in a browser here" is wrong for a browser screen. A claim about
the stored rows still belongs in back-e2e.

## The recipe

1. Connect to the browser agent-browser drives, over its CDP port.
2. Pick the page target whose URL holds the app, as `findPageTarget` in
   `scripts/browser/cdp-session.ts` does for taps. With Playwright's
   `connectOverCDP`, `context.pages()[0]` was a hidden `chrome://new-tab-page`
   target, and the first ceremony failed with nothing on screen (measured by
   `visual-validator`).
3. Open a CDP session on that page, send `WebAuthn.enable`, then
   `WebAuthn.addVirtualAuthenticator` with `protocol: 'ctap2'`,
   `transport: 'internal'`, `hasResidentKey: true`,
   `hasUserVerification: true`, `isUserVerified: true`.
4. Keep that Node process alive in the background while agent-browser taps
   through the screens. The authenticator dies with its CDP session.

## Cheaper when the app offers it

talos prints a seeded sign-in cookie, so its screens open with no passkey at
all ([screenshotting-talos-behind-its-passkey](./screenshotting-talos-behind-its-passkey.md)).
Use the authenticator only for the sign-up and sign-in screens themselves.

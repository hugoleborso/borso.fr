---
summary: 'Pragma''s `sw.js` sits at the 300-line lint cap; grow it with `importScripts` of another `public/` file and register that file in the test harness.'
triggers:
  paths:
    - 'apps/pragma/site/public/sw*.js'
---

# The service worker grows by importScripts

`apps/pragma/site/public/sw.js` is a classic script served as-is, not bundled.
oxlint's `max-lines` caps it at 300 lines like any other file. PR #243 pushed it
to 331 by giving each notification its own title, so the push and notification
code moved to `public/sw-notifications.js`, loaded at the end of `sw.js` with
`importScripts('/sw-notifications.js')`.

Three facts make that safe.

- **Imported scripts share the worker's global scope.** A top-level `const` in
  one script is visible in the other, as it would be in one file.
- **They stay fresh.** `infra/cdk/src/constructs/static-site.ts` uploads every
  non-fingerprinted file with `no-cache, must-revalidate`, and the browser
  byte-compares imported scripts when it checks the worker for an update. A
  change to `sw-notifications.js` alone installs a new worker.
- **The test harness loads them by name.**
  `apps/pragma/site/src/sw/service-worker.test-utils.ts` keeps a map from URL
  to raw source and runs each `importScripts` call in the same `vm` context. A
  URL missing from that map throws `sw.js imports <url>, which is not in
  public/`, so a new imported file fails the tests until it is registered.

Call `importScripts` at the top level only. The spec forbids it after the
worker's first evaluation, so a call inside an event listener throws.

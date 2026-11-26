---
date: 2026-11-26
introduced-at: conception
detected-at: production
severity: high
related-pr: '#410'
fix-commits: [768998804, self]
eradication-level: 2
eradication-paths: [apps/pragma/site/src/routes/concerts/ConcertsLandingPage.tsx, apps/pragma/site/src/sw/manifest.test.ts]
time-to-detect: 4 hours
tags: [pragma, pwa, conception]
zone: apps/pragma/site/public/manifest.webmanifest
recurs: none (the first defect from moving a route an installed app opens on)
---

# The band reopened its app on the fan page

## User impact

PR #410 moved the ERP from `/` to `/app` and gave `/` to the public concert
sign-up page. Every band member had installed the app before that day (the
operator, 21:41 UTC). From the merge at 17:41 to PR #415's merge at 22:28,
their installed app opened on the fan page.

| | Seen | Expected |
| --- | --- | --- |
| A member opens the installed app | The concert sign-up page, "Je serai là !", no link to the ERP (the link was removed on request) | The ERP home |
| The operator, at 21:40 | "Does the PWA need re-downloading? Do we lose everything?" | Nothing to ask |

## Causal chain

- The installed app opened on the fan page.
  - It launched on `/`, the `start_url` it was installed with.
    - PR #410 changed `start_url` to `/app` in `manifest.webmanifest`, which
      only new installs read. The installed apps kept `/` (the operator's
      report at 21:41).
      - The spec named new installs only, and no plan was written. Nobody
        asked what an app installed before the move does.

## Root cause of occurrence

*Thought changing `start_url` moves every installed app, actually an installed
app keeps the start URL it was installed with.*

PR #410's test pinned the new value and said why: "opens the installed app on
the members area, since the public sign-up page took /"
(`apps/pragma/site/src/sw/manifest.test.ts` at `cf9fb626a`). It checked the
file a new install reads, never the launch of an app already installed.

## Detection failure causes

- **Test:** `manifest.test.ts` asserted the manifest's text, so it passed
  while every existing install opened `/`.
- **Visual validation:** it drove a browser tab, never an installed app, and
  Chromium cannot emulate one (`docs/knowledge/agent-browser-coarse-pointer-emulation.md`).
- **Specification:** the operator's opening request said "the PWA stays
  focused on the ERP". The spec read that as new installs.

## Countermeasure

PR #415 redirects `/` to `/app` when the page runs in standalone display, on
`matchMedia('(display-mode: standalone)')` or `navigator.standalone`. A
browser tab still shows the fan page. Nobody has to reinstall.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`7689988`](https://github.com/hugoleborso/borso.fr/commit/768998804499a5865865eb57ee2a1967bbc2084b)
holds the redirect and the test that sends the installed app from `/` to the
members area. The commit adding this file ties the manifest test to the same
constant, and pins the install identity `/` that keeps old installs one app.

```diff
-    expect(manifest.start_url).toBe('/app');
+    expect(manifest.start_url).toBe(DEFAULT_POST_LOGIN_PATH);
+  it('keeps the install identity /, so an app installed before the ERP moved stays one app and opens on /', () => {
+    expect(manifest.id).toBe('/');
```

Moving the ERP home again changes `DEFAULT_POST_LOGIN_PATH`. The redirect then
follows it, and the manifest test fails until the manifest follows too.

**Proof it can fail:** with `"start_url": "/"` planted in the manifest, the
test fails with `expected '/' to be '/app'`.

**Similar instances:** `grep -l start_url apps/*/site/public/*.webmanifest`
lists the installable apps. Only pragma has moved its start URL.

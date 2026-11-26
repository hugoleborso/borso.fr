# Visual validation — Concert sign-up page (use case 14, ERP home at /app)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Dev URL: http://localhost:5174/
- Run at: 2026-11-26T21:46:48Z
- Tooling: agent-browser 0.41.2 (Chromium 158.0.8127.88)

Scope: use case 14 only, plus the Rules that apply to it ("Every page works at 375 px", "Every visible string goes through `en.json` and `fr.json`"). The other use cases are out of this run's scope.

## Assertions

| # | From | Assertion | Action | Evidence | Verdict |
|---|---|---|---|---|---|
| 01 | UC 14 | "A browser tab on `/` keeps the concert page." (signed out) | Fresh session, open `/` at 1280 px | `./.pending-upload/2026-11-26-2143/01-browser-tab-root-concert-page.png`, URL stays `http://localhost:5174/`, h1 "pragma's next gig" | PASS |
| 02 | UC 14 | "A browser tab on `/` keeps the concert page." (signed in as a member) | Sign in as marc, open `/` at 375 px | `./.pending-upload/2026-11-26-2143/07-signed-in-tab-root-375.png`, URL stays `/`, h1 "pragma's next gig", scrollWidth 375 | PASS |
| 03 | UC 14 | "The ERP home moves from `/` to `/app`." | Signed in as hugo, open `/app` | `./.pending-upload/2026-11-26-2143/02-login-lands-on-app-home.png`, URL `/app`, h1 "Next up" | PASS |
| 04 | UC 14 | "Every link and redirect to it follows" (sign-in redirect) | Signed out, open `/app` (lands on `/login`), sign in as hugo | URL after sign-in = `http://localhost:5174/app` | PASS |
| 05 | UC 14 | "Every link and redirect to it follows" (navigation link) | At 375 px, read every visible `nav a` href | `Home → /app` with `aria-current="page"` on `/app`; screenshot `./.pending-upload/2026-11-26-2143/03-app-home-375.png` | PASS |
| 06 | UC 14 | "the installed app opens on `/app`" | `curl /manifest.webmanifest`, check `<link rel="manifest">` in `/` | `"start_url": "/app"`, `"id": "/"` (install identity kept), `"display": "standalone"`, the "Accueil" shortcut `"url": "/app"` | PASS |
| 07 | UC 14 | "Every other ERP route keeps its path." | Signed in, open `/sessions`, `/setlists`, `/catalog`, `/band`, `/account` | Each URL unchanged after load, h1 "Sessions", "Setlists", "Songs", "Band", "Account" | PASS |
| 08 | UC 14 | A sign-in redirect from another ERP route returns to that route, not to the home | Signed out, open `/setlists`, land on `/login`, sign in as marc | URL after sign-in = `/setlists` | PASS |
| 09 | UC 14 | "The installed app that opens on `/` … goes straight to `/app`." (standalone display mode, signed in) | CDP init script stubs `matchMedia('(display-mode: standalone)')` to true, `Page.navigate` to `/` | `./.pending-upload/2026-11-26-2143/04-standalone-root-signed-in.png`, navigations `/` → `/app`, h1 "Next up"; `back` afterwards lands on the page before `/`, never on `/` (replace) | PASS |
| 10 | UC 14 | Same, iOS home-screen app (`navigator.standalone`) | CDP init script defines `navigator.standalone = true`, opened from `/sessions`, navigate to `/` | `./.pending-upload/2026-11-26-2143/05-ios-standalone-root.png`, location `/app`; `back` returns to `/sessions` | PASS |
| 11 | UC 14 | Same, installed app signed out | Cookies and localStorage cleared, standalone stub, navigate to `/`, then sign in as lea | `./.pending-upload/2026-11-26-2143/06-standalone-root-signed-out.png`, navigations `/` → `/app` → `/login`; after sign-in URL `/app` | PASS |
| 12 | Rules | "Every page works at 375 px." | `/app` and `/` at 375 × 812 | `document.documentElement.scrollWidth` = 375 on both; screenshots 03 and 07 | PASS |
| 13 | Rules | "Every visible string goes through `en.json` and `fr.json`." | Read the visible strings on `/app`, `/login` and `/` in the en locale | No new visible string comes with use case 14; every string seen renders translated text, no raw key | PASS |

Every screenshot passed `scripts/browser/broken-images.sh`. `agent-browser errors` was empty after the runs on `/`.

## Notes

- Rows 09 to 11 do not come from a real installed app. Chromium 158 accepts `Emulation.setEmulatedMedia` with `display-mode: standalone`, returns ok, and still answers `matchMedia('(display-mode: standalone)').matches === false` (measured, the same call with an unknown feature also returns ok). The run therefore stubbed the two signals the page reads, through `Page.addScriptToEvaluateOnNewDocument`:

  ```js
  window.matchMedia = (q) => /display-mode:\s*standalone/.test(q)
    ? Object.defineProperties(real('all'), { matches: { value: true }, media: { value: q } })
    : real(q);
  Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
  ```

  This proves the page's behaviour once the browser reports standalone. It does not prove that a real home-screen launch of an app installed before the move reports standalone on `/`, nor that CSS `@media (display-mode: standalone)` rules apply. That part is a browser guarantee and only a device install shows it.
- Row 06 checks the manifest the dev server serves. Whether an already-installed app picks up the new `start_url` depends on the browser's manifest update, which row 09 covers from the other side (an install that still opens on `/`).

## Verdict: PASS

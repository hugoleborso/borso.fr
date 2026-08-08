# Third-party image CDNs break PWAs — and often break online too

A PWA that fetches sprites / icons / fonts from a third-party CDN
loses its offline guarantee, and frequently fails *online* too because
many CDNs block hotlinking with a 403 / refused-CORS response.

## How it bit us

`apps/borsouvertures` shipped with custom chess-piece sprites loaded
from `images.chesscomfiles.com/chess-themes/pieces/neo/150/<piece>.png`.
Two problems compounded:

1. **Offline**: the service worker had no cache rule for that origin, so
   the first cold load with no network rendered every piece as alt text
   (`<img alt="bR">` → literal `bR` shown in the square).
2. **Online**: chess.com's CDN blocks hotlinking from non-chess.com
   origins. Even with full network the sprites 404'd / 403'd. Same alt-
   text fallback.

The validator caught neither — see [`described-screenshot-without-checking-pixels.md`](../dantotsus/described-screenshot-without-checking-pixels.md).

## Three workable patterns

For a PWA that needs offline correctness:

1. **Bundle the asset.** The simplest. Put SVGs or PNGs in
   `site/public/<assets>/`; Vite copies them verbatim and the service
   worker precaches them. Works offline by construction.
2. **Use the library's bundled assets.** Many UI libraries (e.g.
   `react-chessboard@^5`) ship default piece sets as inline SVG inside
   the JS bundle. No separate asset, no network fetch. This is what
   PR #8 ended up adopting after dropping the CDN sprites.
3. **Same-origin proxy.** If the asset genuinely has to come from a
   third party (e.g. user-generated content), proxy it through your
   own origin so the service worker can cache it, and so the proxy can
   set the CORS headers the third party doesn't.

## Anti-pattern signals

- A `<img src="https://..."/>` to a domain other than your own in code
  that ships in a PWA.
- A workbox config that doesn't include a `runtimeCaching` rule for
  every third-party origin the app talks to.
- Visual regression on first cold load that disappears on second load
  (the cache warmed up; the offline path is still broken).

## Adjacent gotchas

- **Fonts**: Google Fonts via `<link rel="stylesheet">` has the same
  offline problem. Use `@fontsource/<font>` packages instead — they
  bundle the woff2 files.
- **Service worker scope**: workbox's `runtimeCaching` only applies to
  same-origin by default; cross-origin entries need explicit
  `cacheableResponse: { statuses: [0, 200] }` and an `urlPattern`
  matching the third-party hostname.

## Related

- [`docs/dantotsus/described-screenshot-without-checking-pixels.md`](../dantotsus/described-screenshot-without-checking-pixels.md) —
  the validator-blindness defect that let this ship.

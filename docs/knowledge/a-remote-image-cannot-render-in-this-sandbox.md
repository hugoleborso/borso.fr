# A remote image cannot render in this sandbox

Chromium in the hosted session rejects the agent proxy's certificate for every
external HTTPS request:

```
ERR_CERT_AUTHORITY_INVALID
```

The page loads, because the page comes from `localhost` or a preview host the
proxy is configured for. The *images* it references do not. Anything the
browser fetches from a third-party origin — an album cover, a CDN font, a
remote avatar — fails silently and the element falls back.

Last verified: 2026-09-16 — `scripts/browser.sh` navigated to a page carrying a
Deezer album image and rendered the initials fallback, while
`curl -sI https://api.deezer.com/album/302127/image?size=big` from the same
container answered `200` with `image/jpeg`.

## Why this is worse than it sounds

The failure is indistinguishable from the bug you were looking for.

A cover that will not load renders as the initials tile the component was
written to show when there is no cover. Screenshot it and you have evidence
that the feature is broken. It is not; the URL serves a real JPEG. On 2026-09-15
the Deezer album image endpoint returned a 14.6 kB JPEG under `curl` from the
same container whose Chromium showed a tile.

This is a close cousin of
[`described-screenshot-without-checking-pixels`](../dantotsus/described-screenshot-without-checking-pixels.md):
there the picture was not examined, here the picture is examined and lies.

## What to do

- **Confirm the asset out of band.** `curl -sI <url>` from the same container.
  A `200` with an `image/*` content type means the product is fine and the
  browser is not.
- **Say which it was.** A validation note that claims a cover renders, having
  only seen a tile, is a fabricated claim. Write that the URL serves an image
  and the render was not observed here, and flag it for the preview.
- **Do not disable TLS verification and do not unset `HTTPS_PROXY`.** See
  `/root/.ccr/README.md`; `curl -sS "$HTTPS_PROXY/__agentproxy/status"` reports
  per-tool state.
- **A preview deploy is where a remote image is actually seen.** It is one of
  the few things a hosted session cannot validate for itself.

## See also

- [`driving-previews-with-agent-browser-and-argent`](./driving-previews-with-agent-browser-and-argent.md)
  — the rest of the traps in this loop, including the TLS flag
  `scripts/browser.sh` passes so navigation works at all.
- [`what-a-hosted-session-cannot-do-on-github`](./what-a-hosted-session-cannot-do-on-github.md)
  — the same question asked about the other half of the harness.
- [`visual-validator-image-size-limit`](./visual-validator-image-size-limit.md)
  — a different reason a screenshot does not show what you expect.

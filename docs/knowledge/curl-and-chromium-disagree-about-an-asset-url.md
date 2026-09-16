# curl and Chromium disagree about an asset URL

Two probes of the same Deezer cover from the same container, 2026-09-16:

```
$ curl -sI "https://api.deezer.com/album/302127/image?size=big"
HTTP/2 403
server: AkamaiGHost

$ scripts/browser.sh open "https://api.deezer.com/album/302127/image?size=big"
✓ 400x400-000000-80-0-0.jpg (400×400)
  https://cdn-images.dzcdn.net/images/cover/5718f7…/400x400-000000-80-0-0.jpg
```

The browser followed the redirect to the CDN and rendered a real 400×400 JPEG.
`curl` was refused by Akamai before ever reaching it. **On this endpoint the
command line is the unreliable witness and the browser is the honest one**,
which is the reverse of the usual assumption.

The API itself behaves normally for both: `https://api.deezer.com/search?q=…`
answers `200` under `curl` and loads in Chromium. Only the image endpoint,
which fronts a CDN behind bot protection, splits them.

## The claim this entry replaces

An earlier note in this repository said this sandbox's Chromium rejects the
agent proxy's certificate for *every* external HTTPS with
`ERR_CERT_AUTHORITY_INVALID`, so a remote image always falls back to its
placeholder. **That could not be reproduced on 2026-09-16** — both URLs above
loaded in Chromium with no certificate error. Whatever produced that symptom,
it is not a standing property of the sandbox, and a validation report that
blames the proxy for a missing image should re-probe before saying so.

## What to do when an asset looks broken

Last verified: 2026-09-16 — `curl -sI` on the album-image endpoint answered
`403 AkamaiGHost`, `scripts/browser.sh open` on the same URL rendered a 400x400
JPEG, and both tools answered `200` on `api.deezer.com/search`.

- **Probe both ways before concluding.** A `403` or a connection error from
  `curl` is not evidence the product is broken, and a placeholder in a
  screenshot is not evidence the URL is dead.
- **Follow the redirect.** `curl -sIL` shows where an image endpoint actually
  sends you; the final host is usually the one worth probing.
- **Say which probe you ran.** "The URL serves a JPEG under `curl`" and "the
  cover rendered in a browser" are different claims with different failure
  modes. Writing one while having done the other is the fabrication the repo's
  dated-claim gate exists to catch — it is what caught this entry's first
  draft, which asserted the unreproducible version above.

## See also

- [`driving-previews-with-agent-browser-and-argent`](./driving-previews-with-agent-browser-and-argent.md)
  — the rest of the traps in this loop, including the TLS flag
  `scripts/browser.sh` passes so navigation works at all.
- [`../dantotsus/described-screenshot-without-checking-pixels.md`](../dantotsus/described-screenshot-without-checking-pixels.md)
  — the neighbouring failure, where the picture was never examined.
- [`../dantotsus/said-the-file-was-unreachable-without-looking.md`](../dantotsus/said-the-file-was-unreachable-without-looking.md)
  — "I can't reach that" as a hypothesis stated as a fact.

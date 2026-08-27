# BPMN member journeys

One BPMN 2.0 diagram per member journey worth reading end to end. The `.bpmn`
file is the source. The `.svg` beside it is the committed render, so a reader
browsing GitHub sees the diagram without any tooling.

## pragma-prepare-a-concert

[`pragma-prepare-a-concert.bpmn`](./pragma-prepare-a-concert.bpmn), rendered as
[`pragma-prepare-a-concert.svg`](./pragma-prepare-a-concert.svg).

The journey runs from a bar reaching `booked` in the CRM to the concert being
played and the bar moving to `played`. Four pools: the band member in the PWA,
the Pragma API, MusicBrainz, and the charts bucket. Every step maps to a
mechanism that exists in the tree:

- The sign-in loop with its timer catch event is the shared password flow:
  wrong attempts loop, and five failures in fifteen minutes answer 429
  (`api/src/auth/`, `rate-limit.utils.ts`).
- The looped subprocess fills the setlist one song at a time. A missing song
  is created as an `idea`, enriched through the MusicBrainz search the API
  proxies with a rate-limited, cached adapter (`songs/musicbrainz.adapter.ts`),
  and gets its chart either as pasted ChordPro with a derived tonality
  (`domain/tonality.core.ts`) or as a PDF or image pushed straight to S3 with
  a presigned URL (`api/src/uploads/`).
- The error boundary event on the reorder task is the 409 `reorder-stale`
  refusal: the submitted entry ids must match the stored ones exactly
  (`setlists.service.ts`), so the member reloads and reorders again.
- The parallel branches after the reorder are the transition check, whose
  verdict is `covered` or `risky` (`domain/transition.core.ts`), and the
  mastery check (`api/src/mastery/`). A weak song gets a practice aimed at
  the concert through `preparedConcertId`.
- The service task before the concert is the offline manifest the service
  worker pre-caches (`buildNextSessionOfflineManifest`), which is why the
  scene view on stage needs no message flow.

## Toolchain

Authored and checked with the bpmn.io command line tools. The diagram passes
`bpmnlint` with the `bpmnlint:recommended` ruleset and zero findings. To edit,
open the `.bpmn` file at [demo.bpmn.io](https://demo.bpmn.io), or change the
XML directly, then re-lint and re-render:

```bash
pnpm add -D bpmnlint bpmn-to-image
pnpm exec bpmnlint docs/bpmn/pragma-prepare-a-concert.bpmn
pnpm exec bpmn-to-image --title="pragma - prepare a concert" \
  docs/bpmn/pragma-prepare-a-concert.bpmn:docs/bpmn/pragma-prepare-a-concert.svg
```

`bpmn-to-image` drives Puppeteer. In this repository's sandboxes, point
`PUPPETEER_EXECUTABLE_PATH` at a one-line wrapper that execs the pre-installed
`/opt/pw-browsers/chromium` with `--no-sandbox`, for the same reason
[`scripts/browser.sh`](../../scripts/browser.sh) exists: the browser the CLI
looks for is not where it looks.

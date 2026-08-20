---
date: 2026-08-20
introduced-at: n/a-vendor-knowledge
detected-at: implementation
severity: low
related-pr: https://github.com/hugoleborso/borso.fr/pull/76
fix-commit: n/a (vendor constraint; the fix is picking the right front door)
time-to-detect: minutes (reading the API Gateway limits page)
tags: [api-gateway, lambda, hono, streaming, vendor-quirk]
---

# API Gateway HTTP API has no end-to-end response streaming

A Lambda fronted by an **API Gateway HTTP API** cannot stream its response
to the client. The response is buffered by API Gateway and delivered whole,
whatever the handler does. `awslambda.streamifyResponse` has no effect on
this path: the streaming invoke mode it needs is not something an API
Gateway integration selects.

This is what `LambdaApi` builds, so it is true of every API in this
repository. `apps/*/api/src/main.ts` therefore uses Hono's ordinary APIGW v2
handler (`handle` from `hono/aws-lambda`) rather than a streaming one.

## What to reach for instead

Streaming needs a **Lambda Function URL** with `RESPONSE_STREAM` invoke
mode, which is a different front door with different consequences: no
API Gateway stage, no usage plans, no request validation, and its own
auth model. Changing `LambdaApi` over is an infrastructure decision, not a
handler change, and needs an [architecture decision record](../adr/README.md).

## Why it has not mattered yet

Both full-stack applications poll rather than stream. `last-loop-lepin`'s
live race screen refreshes on a 2 s cadence, which the buffered handler
serves comfortably. Reach for the constraint above only when a feature
genuinely needs a long-lived response body — server-sent events, a token
stream, a large export generated on the fly.

## Related

- [`preview-api-cross-origin.md`](./preview-api-cross-origin.md) — the other
  API Gateway constraint that shapes these stacks: regional custom domains
  reject cross-region certificates.

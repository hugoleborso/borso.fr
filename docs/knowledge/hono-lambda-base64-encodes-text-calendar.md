---
summary: 'Hono''s Lambda adapter base64-encodes any content type outside text/plain, html, css, javascript, csv, json and xml, so a text/calendar body grows by a third and crosses Lambda''s 6 MB response limit early.'
triggers:
  paths:
    - 'apps/pragma/api/src/__test/calendar-feed-fixtures.core.ts'
  output:
    - 'Response payload size exceeded'
---

# Hono's Lambda adapter base64-encodes `text/calendar`

`hono/aws-lambda` decides per response whether the body is binary, and binary
bodies go back to Lambda base64-encoded. Its default rule, in
`dist/adapter/aws-lambda/handler.js` (hono 4.13.7), treats as text only:

```js
!/^text\/(?:plain|html|css|javascript|csv)|(?:\/|\+)(?:json|xml)\s*(?:;|$)/.test(contentType)
```

Every other type, `text/calendar` included, is encoded. Base64 makes the body
about four thirds of its size, and Lambda refuses a response over 6 MB
(6 291 556 bytes) after encoding.

On PR #118 the `huge.ics` preview fixture, built to be just over the 5 MiB
feed limit, answered `500` instead of its body: 5.3 MB of `text/calendar`
became about 7 MB once encoded. Served as `text/plain`, the same body went out
as text and fit. The feed reader never looks at the content type, so the
fixture still tests what it was built for.

Two ways around it, depending on what the route serves:

- **A text body:** send it as one of the types above.
- **A real type that must stay:** pass `handle(app, { isContentTypeBinary })`
  with a rule that also lists that type as text.

A body that may approach 6 MB either way belongs in S3 behind a signed URL,
not in a Lambda response.

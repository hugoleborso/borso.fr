---
summary: 'Hono''s `zValidator(''json'', schema, hook)` throws `400 Malformed JSON in request body` before the hook runs, so a route that must answer its own error code for a body that is not JSON parses the text itself.'
triggers:
  output:
    - 'Malformed JSON in request body'
---

# Hono's validator refuses malformed JSON before its hook runs

_PR #278, 2026-11-05._ pragma's `POST /api/read-batch` used
`zValidator('json', readBatchSchema, hook)`, and the hook answered
`400 {"error":"read-batch-invalid"}` and reported the failure. The validator
measured that a body of `{"reads": [` with `content-type: application/json`
answered `400 Malformed JSON in request body` and reported nothing (round 1,
row A05).

Hono 4.13.7, `dist/validator/validator.js`, read this session:

```js
try {
  value = await c.req.json();
} catch {
  const message = "Malformed JSON in request body";
  throw new HTTPException(400, { message });
}
```

The throw happens before the hook is called. The same body sent as
`text/plain` skips the parse, so it reached the hook and was answered as the
route intended.

A route whose error contract covers a body that is not JSON reads the text
and parses it itself, as `read-batch.controller.ts` now does:

```ts
const readBatch = readBatchSchema.safeParse(parseJsonOrNull(await context.req.text()));
```

A test of that case asserts the body, not only the status. Both answers are
`400`.

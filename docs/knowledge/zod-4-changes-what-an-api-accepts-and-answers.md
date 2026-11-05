---
summary: 'Moving an API from zod 3 to zod 4 typechecks and still changes behaviour: stricter uuid, defaults inside partial, error text, JSON Schema size and the serialised ZodError.'
triggers:
  paths:
    - 'apps/*/api/src/**/*.schema.ts'
  output:
    - "has no exported member named 'AnyZodObject'"
    - 'SafeParseReturnType'
    - 'Invalid input: expected'
---

# Zod 4 changes what an API accepts and answers

banana-rush, last-loop-lepin and pragma moved from zod 3.25 to 4.6 in PR #274.
Typecheck caught the renamed types. These five changes passed typecheck and
were found by tests, an e2e budget, or by reading a consumer.

| Change | What broke | What PR #274 did |
| --- | --- | --- |
| `.partial()` keeps every `.default()` | A patch naming one field rewrote the others with their defaults | Each slice declares its fields once without defaults. Create adds them, update is that shape `.partial()` |
| `z.string().uuid()` follows RFC 9562 | `11111111-2222-3333-4444-555555555555` and similar fixtures refused | `z.guid()`, the zod 3 rule and what a Postgres `uuid` column accepts |
| Messages are reworded | `Required` became `Invalid input: expected string, received undefined` | The MCP refusal expectations take the new text |
| JSON Schema adds `pattern` next to `format`, and safe-integer bounds to `.int()` | The pragma MCP tool list grew from under 19000 to 19800 characters | `compactInputSchema` drops both |
| `ZodError.issues` is not enumerable | `@hono/zod-validator`'s default 400 serialises to `{name, message}` | last-loop-lepin passes `answerInvalidInput`, which sends `{success: false, error: {issues}}` |

The deprecated zod 3 method forms (`z.string().datetime()`, `.passthrough()`,
`.merge()`) still run, and oxlint's `no-deprecated` names each with its
replacement. `z.string().trim().email()` has no direct zod 4 form that trims
first. pragma uses `.trim().regex(z.regexes.email)`.

See [`../dantotsus/a-major-upgrade-the-types-called-safe.md`](../dantotsus/a-major-upgrade-the-types-called-safe.md).

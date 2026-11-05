---
date: 2026-11-05
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#274'
fix-pr: '#274'
fix-commits: [6250f706a]
eradication-level: 4
eradication-paths: [apps/pragma/api/src/bars/bars.schema.ts, apps/pragma/api/src/bars/bars.schema.test.ts, apps/last-loop-lepin/api/src/helpers/validation/invalid-input.middleware.ts, apps/last-loop-lepin/api/src/helpers/validation/invalid-input.middleware.test.ts]
time-to-detect: minutes
tags: [zod, deps, pragma, last-loop-lepin, testing]
zone: apps/pragma/api/src/tasks/tasks.schema.ts
recurs: none (the first major upgrade of the validation library; earlier dependency entries are about installs, not runtime semantics)
---

# A major upgrade the types called safe

## User impact

Nobody saw it. PR #274 moved three APIs from zod 3 to zod 4, and typecheck
passed in all of them before two runtime changes were found. Had they shipped:

| | Seen (would have) | Expected |
| --- | --- | --- |
| pragma, editing one field of a task, bar, song, session or setlist entry | Every other defaulted field reset, notes emptied, links cleared | Only the named field changes |
| last-loop-lepin admin, a refused setup form | The generic error, no field named | `slug: …` for each refused field |

## Causal chain

- A patch would have rewritten fields it did not name
  - `taskUpdateSchema = taskCreateSchema.partial()` parsed `{status}` into `{status, notes: '', …}`
    - zod 4 applies a `.default()` even inside `.partial()`; zod 3 skipped it
- The admin form would have lost its field summary
  - `summariseZodError` found no `error.issues` in the 400 body
    - `@hono/zod-validator` answers `c.json(result, 400)`, and zod 4 defines `issues` as non-enumerable

## Root cause of occurrence

*Thought a validation library upgrade that typechecks behaves the same,
actually zod 4 changed defaults, error serialisation, uuid strictness,
messages and JSON Schema output, none of which a type expresses.* The table
in [`../knowledge/zod-4-changes-what-an-api-accepts-and-answers.md`](../knowledge/zod-4-changes-what-an-api-accepts-and-answers.md)
lists all five.

## Detection failure causes

- **Typing:** each change keeps the same static type.
- **Tests:** two of six pragma update schemas had a test that a patch leaves
  other fields out. The other four would have passed.
- **Wire contract:** no test read the body a refused request gets, so the
  ZodError change was found by reading the one site consumer.

## Countermeasure

Each pragma slice declares its fields once without defaults. The create
schema adds the defaults, and the update schema is that shape `.partial()`.
The `schema-table-and-input` blueprint says why. last-loop-lepin passes
`answerInvalidInput` to every `zValidator`, and it sends
`{success: false, error: {issues}}` explicitly.

## Eradication

**Type:** detection (level 4)

**Reference:** [PR #274](https://github.com/hugoleborso/borso.fr/pull/274) · commit `6250f706a`

```diff
+  it('leaves out every field the patch does not name, defaults included', () => {
+    expect(barUpdateSchema.parse({ name: 'Le Baron' })).toEqual({ name: 'Le Baron' });
+  });
```

```diff
+  it('answers a refused body with its issues listed, field by field', async () => {
+    expect(await response.json()).toEqual({ success: false, error: { issues: [expect.objectContaining({ path: ['name'] })] } });
```

**Proof it can fail:** with the four schema files restored to their
`.partial()`-of-create form, the new tests failed 5 of 74 (measured on the
PR #274 branch).

**Similar instances:** `rg -n '\.partial\(' apps/*/api/src` lists no
update schema derived from a create schema with defaults left in pragma,
banana-rush or last-loop-lepin. talos was already on zod 4 and has none.

---
date: 2026-11-05
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#274'
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

- A patch would have rewritten fields it did not name.
  - `taskUpdateSchema = taskCreateSchema.partial()` parsed `{status}` into `{status, notes: '', …}`.
    - zod 4 applies a `.default()` even inside `.partial()`. zod 3 skipped it.
      - The first commit of PR #274 moved pragma to `catalog:zod4` as one row of an audit sweep that bumped four catalog entries, five direct dependencies and nine transitive ones, by its message. Typecheck passed and was taken as the verdict (inferred). (Method)
- The admin form would have lost its field summary.
  - `summariseZodError` found no `error.issues` in the 400 body.
    - `@hono/zod-validator` answers `c.json(result, 400)`, and zod 4 defines `issues` as non-enumerable.
      - last-loop-lepin's `zValidator` calls passed no hook, so the body's shape was whatever the library serialised. The same sweep moved the app to zod 4.

## Root cause of occurrence

*Thought a `.partial()` of a schema leaves out the fields a patch does not
name, actually zod 4 fills in every `.default()` inside `.partial()`.*

Method. The writer knew zod 4 changes behaviour. The same commit switched
banana-rush to `z.guid()`, "the zod 4 name for the permissive check
z.string().uuid() ran under zod 3". What kept them from checking the rest was
the process: an audit sweep that bumps every flagged package in one commit,
judges each row by its advisory, and accepts each on typecheck. A major
version was handled like a patch. No skill or command splits majors out of an
audit sweep (`grep -rli major .claude/skills .claude/commands` finds only
unrelated files). The same sweep caused
[`a-major-bump-to-a-path-nothing-ran.md`](./a-major-bump-to-a-path-nothing-ran.md).
The `update = create.partial()` pattern made the update schema's behaviour
depend on a semantic no type expresses (Machine). The table in
[`../knowledge/zod-4-changes-what-an-api-accepts-and-answers.md`](../knowledge/zod-4-changes-what-an-api-accepts-and-answers.md)
lists the five changes.

## Detection failure causes

- **Typing:** each change keeps the same static type.
- **Tests:** two of six pragma update schemas had a test that a patch leaves other fields out. The other four would have passed.
- **Wire contract:** no test read the body a refused request gets, so the ZodError change was found by reading the one site consumer.

## Countermeasure

Each pragma slice declares its fields once without defaults. The create
schema adds the defaults, and the update schema is that shape `.partial()`.
The `schema-table-and-input` blueprint says why. last-loop-lepin passes
`answerInvalidInput` to every `zValidator`, and it sends
`{success: false, error: {issues}}` explicitly.

## Eradication

**Type:** detection (level 4)

**Reference:** commit [`6250f706a`](https://github.com/hugoleborso/borso.fr/commit/6250f706a), PR #274.

```diff
+  it('leaves out every field the patch does not name, defaults included', () => {
+    expect(barUpdateSchema.parse({ name: 'Le Baron' })).toEqual({ name: 'Le Baron' });
+  });
```

```diff
+  it('answers a refused body with its issues listed, field by field', async () => {
+    expect(await response.json()).toEqual({ success: false, error: { issues: [expect.objectContaining({ path: ['name'] })] } });
```

The gap, measured on 2026-11-27 with `grep -rn -A1 'zValidator(' apps/*/api/src`.
banana-rush and borsouvertures still call `zValidator` with no hook, so their
refused-body shape is still the library's serialisation.

**Proposed:** two changes, one per branch.

- A rule under `eslint-rules/` that refuses a `zValidator` call with fewer than three arguments in `apps/*/api/src`. Each app then states its refused-body shape in its own hook, and a library change to how a `ZodError` serialises can no longer reach a client unseen. That is level 2 for the error-body half.
- A pre-commit check that refuses a commit whose `pnpm-lock.yaml` diff raises the major version of a direct or catalog dependency alongside any other version change. A major then travels alone, in a commit whose message can name its migration guide, and can no longer pass as one row of a sweep checked by typecheck.

**Proof it can fail:** with the four schema files restored to their
`.partial()`-of-create form, the new tests failed 5 of 74 (measured on the
PR #274 branch).

**Similar instances:** `rg -n '\.partial\(' apps/*/api/src` lists no update
schema derived from a create schema with defaults left in pragma, banana-rush
or last-loop-lepin. talos was already on zod 4 and has none.

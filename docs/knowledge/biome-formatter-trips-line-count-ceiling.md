# Biome's `biome check` can push an untouched file past `noExcessiveLinesPerFile`

Surface : a repo-wide `biome check --write` formatter pass adds
line breaks to long JSX attribute lists, ternaries, and `<>`
generic parameters. Files at the upper end of the configured
nursery rule `lint/nursery/noExcessiveLinesPerFile` (set to
`error` in `biome.jsonc`, default ceiling **300 lines**) can
cross over after the format pass even though their source-level
logic didn't change.

Caught in PR #27 on `apps/last-loop-lepin/site/src/components/admin/SetupPanel.tsx` :
the file was 380 lines pre-format, 428 lines post-format, both
side of the ceiling but only the second side fails biome lint.

## When you'll hit this

- You're enabling `biome check` (lint + format) repo-wide for
  the first time — see [`docs/dantotsus/biome-formatter-was-not-gated.md`](../dantotsus/biome-formatter-was-not-gated.md).
- A long-ish file gets its first `biome check --write` pass and
  the formatter splits ternaries, JSX attribute lists,
  multi-arg generic types onto multiple lines.
- `lint/nursery/noExcessiveLinesPerFile` is configured (the
  borso.fr `biome.jsonc` has it at `error`).

Pre-existing files just under the ceiling are the most likely
victims ; they pass the bare-lint gate, fail the
check-with-format gate.

## How to resolve

Three options, in order of cleanness :

1. **Real split.** Extract the file's natural seams into
   sibling components. PR #27 did this for `SetupPanel.tsx` :
   split into `EditionEditForm.tsx` (form fields) +
   `LiveOrFinishedEditionCard.tsx` (readonly card) +
   `SetupPanel.tsx` (state owner & dispatcher). Three files in
   the ~150-line range each. No behaviour change.
2. **Per-file override** in `biome.jsonc` under `overrides[]`
   with `"lint": { "rules": { "nursery": { "noExcessiveLinesPerFile": "off" } } }`. Acceptable for files
   that are intentionally cohesive (cf. the existing override
   for `course-map.utils.test.ts`). Comment-document the choice.
3. **Reformat-then-shrink** — don't.

Option 1 is the lean default ; option 2 is the escape hatch for
files where the seams cost more than the lint signal saves.

## Why the rule is good

`noExcessiveLinesPerFile` is a proxy for "this file has too
many responsibilities". The format pass doesn't change the
responsibilities — but it surfaces the line debt the file was
already carrying. Treat the failing check as feedback from your
future self : the formatter is the messenger.

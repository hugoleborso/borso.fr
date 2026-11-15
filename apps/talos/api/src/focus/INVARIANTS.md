# Invariants of talos, in `api/src/focus`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/talos/`.

## Focus

- `focusUpdateSchema` refuses more than three items.
- The pure parsing and writing rules are in `domain/focus.core.ts`, read by both the API and the focus editor.

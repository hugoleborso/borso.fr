# Invariants — talos, `api/src/memory`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/talos/`.

## Computed section

Held by: `api/src/agent/agent-page.controller.test.ts` › stores no computed line when a page read is written back, the headings kept in place

- `dropComputedLines` removes their lines, and those of « Faits », « Historique » and « Relations », from a body an `entity.upsert` receives; `hideHandWrittenCopy` (`api/src/pages/pages.core.ts`) removes « Projets liés » from what the PWA reads.

## Memory

- The **closeness** of an entity (`proximite` in the front matter) is an integer or nothing. It runs from 0 to 5 for every kind (`CLOSENESS_SCALE`, `domain/closeness.core.ts`), and each level has a name the owner sees (`selectClosenessNameKey`, `site/src/lib/closeness-name.core.ts`). For a person: 0 « Contacts », 1 « Bonnes relations », 2 « Copains », 3 « Amis », 4 « Proches », 5 « Intimes ». For every other kind, where the score says how much the page matters to him: 0 « Périphérie », 1 « Contexte », 2 « Secondaire », 3 « Suivi », 4 « Important », 5 « Au cœur ». A 0 is a score, and no closeness is the absence of one.
- A **slug** is the repository path without `.md`, so every `[[…]]` link stays valid.
- A **memory event** records one applied operation (actor, token, run, before and after); a **change batch** remembers the answer to one idempotency key. Nothing is deleted: an entity is archived, a todo is removed by a flag.
- `renderEntityPage` (`page-rendering.core.ts`) writes an entity back as the markdown file it came from.
- The **cutover** is the `memory_state` key that recorded the move from git to the database; it is only reported by `/status`.

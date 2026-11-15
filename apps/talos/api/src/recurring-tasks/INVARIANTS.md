# Invariants — talos, `api/src/recurring-tasks`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/talos/`.

## Recurring task

- The values of `cadence` (`hebdomadaire`, `mensuelle`, `trimestrielle`) and of `routine` (`nuit`, `dimanche`, `collecte-mac`) stay in French: they are data.
- Read only. The app never writes the state.
Held by: `api/src/recurring-tasks/recurring-tasks.controller.test.ts` › answers 404 to a POST, a PUT and a DELETE and leaves the state as written

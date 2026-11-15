# Invariants — talos, `api/src/freshness`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/talos/`.

## Freshness

- A page is **late** when it is among the `pages` of the state. The **summary day** of an entity (`summarizedOn`) is `resume_le`, else `maj`, else the day of its last update (`selectSummaryDay`, `api/src/memory/computed-sections.core.ts`).
- Read only. The app never writes the state.
Held by: `api/src/freshness/freshness.controller.test.ts` › answers 404 to a POST, a PUT and a DELETE and leaves the state as written

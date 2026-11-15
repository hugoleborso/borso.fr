# Invariants — talos, `api/src/graph`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/talos/`.

## Graph

- With a date, only the relations begun by that date are returned, those already ended marked `isClosed` (`domain/graph.core.ts`).
- `RelationTie` (`family`, `friendship`, `work`, `other`) groups the relation verbs by how close they hold two pages; it sets link length and pull (`site/src/components/organisms/graph-layout.core.ts`).

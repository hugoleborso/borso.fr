# Invariants — talos, `api/src/relations`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/talos/`.

## Relations

- `silentDays` and `daysUntil` are moved to today from the day of `genere`, so a file written the day before still reads right.

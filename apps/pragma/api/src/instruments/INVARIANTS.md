# Invariants — pragma, `api/src/instruments`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Instrument

- `name` is `NOT NULL`, trimmed, 1 to 64 characters.
- `family` is nullable in the database. Every write sets both `family` and
  the older `is_harmonic` boolean from the same value (`encodeFamily`),
  and every read resolves the two through `resolveInstrumentFamily`, which
  falls back to the boolean for rows written before the column existed.
- `icon` names one of the eighteen glyphs the application ships and is nullable
  in the database, like `family`. Reads resolve it through
  `resolveInstrumentIcon`, which falls back to `music`. It is a stored
  value such as `mic-vocal`, never the camelCase key of the icon registry.
- `position` is where the instrument sits in the fixed column order, also
  nullable, resolved through `resolveInstrumentPosition`. A new instrument
  takes the rank of its family (`defaultPositionForFamily`) rather than the
  head of the order.
- The list is sorted by `position`, then by `name` to break a tie. It is
  never sorted by name alone, because an alphabetical column hides an
  instrument changing hands, which is the whole point of the column.
- Deleting an instrument removes its row and then every `member_instrument`
  link naming it, in one retried transaction (`deleteInstrumentWithLinks`).
- A reorder names every instrument, each once, or is refused as `stale`
  (`isReorderOfTheSameIds`). It claims every named instrument row, reads
  the ids again and writes every position in one transaction, which runs
  again when Aurora DSQL aborts it at commit
  (`runInOneInstrumentTransaction`). An instrument deleted before the claim
  reaches it makes the reorder stale and moves nothing; one created at the
  same moment keeps the position it was created with.

Held by: `api/src/instruments/instruments.controller.test.ts` › orders the list by family rather than by name, which is what the column reads
Held by: `api/src/instruments/instrument-players.core.test.ts` › breaks a tie on the name, so two instruments at one position still settle
Held by: `domain/instrument.core.test.ts` › falls back to the boolean when the column was never written
Held by: `domain/instrument.core.test.ts` › falls back to the generic glyph when the column was never written
Held by: `api/src/members/members.controller.test.ts` › removes the links of a deleted instrument from every member who played it
Held by: `api/src/instruments/instruments.controller.test.ts` › refuses a reorder that does not name every instrument, with 409
Held by: `api/src/instruments/instruments.controller.test.ts` › refuses a reorder naming an instrument deleted while it was being written, and moves nothing
Held by: `api/src/instruments/instruments.controller.test.ts` › reorders once when the first commit loses a conflict on the claimed instruments

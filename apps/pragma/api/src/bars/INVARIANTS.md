# Invariants — pragma, `api/src/bars`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Bar

- `name` and `status` are `NOT NULL`; `notes` is `NOT NULL` and defaults
  to the empty string.
- `status` is one of `lead`, `contacted`, `booked`, `played`, `cold`
  (`BAR_STATUSES` in `domain/bar-profile.core.ts`), and the bars page groups the rows
  into one kanban column per status.
- `ownerMemberId` names the one band member carrying the conversation
  with that venue, and may be null: a bar nobody has taken on is a normal
  bar. Deleting a member clears it on every bar they owned
  (`unassignBarsOwnedByMember` in `api/src/members/members.repository.ts`)
  and deletes no bar.
- `concertMood` is how big a night the bar is up for: `chill`, `gig` or
  `ticketed` (`CONCERT_MOODS` in `domain/bar-profile.core.ts`). It may be null,
  which means nobody has judged the venue yet and is not a fourth mood.
- `availableSupport` is what the bar lends the band, any number of
  `pa-system`, `lights` and `sound-engineer`, held as JSON in a TEXT
  column. An empty list and a null column both mean it lends nothing.
- The `last_interaction_at` column is no longer read or written: the
  follow-up reminder it fed was removed, and the column stays only because
  Aurora DSQL refuses `DROP COLUMN`.

A bar is added either by hand or from a **place**, the OpenStreetMap
record a member picked in the search (`mapNominatimToBarSearchHits` in
`api/src/bars/bar-search.core.ts`). A place fills the name, the city and
the phone number of a new bar's form (`buildBarFormFromPlace` in
`site/src/routes/bars/bar-form.core.ts`) and is never stored as such.

Held by: `api/src/bars/bars.controller.test.ts` › persists every spec status value
Held by: `api/src/bars/bars.controller.test.ts` › carries the owner through create and clears it when that member goes
Held by: `api/src/bars/bars.controller.test.ts` › defaults a bar nobody qualified to no mood and no support

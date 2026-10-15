---
summary: 'ical.js attaches every RECURRENCE-ID exception you hand an Event to that series without checking the UID, and reads a TZID with no VTIMEZONE as floating time; filter exceptions by UID and resolve the zone yourself.'
triggers:
  paths:
    - 'apps/pragma/api/src/calendar-feeds/ics.core.ts'
---

# ical.js relates exceptions without checking the UID

[ADR-0038](../adr/0038-ical-js-parses-calendar-feeds.md) chose `ical.js` to
read the members' calendar feeds. Two of its behaviours cost PR #118 a
mutation-testing round and a validation round.

## An exception goes to whichever series it is given

`new ICAL.Event(master, { exceptions })` relates each component in
`exceptions` to `master` by its `RECURRENCE-ID` alone. It never compares the
`UID`. Hand it every exception in the feed and a moved occurrence of one
weekly event cancels or moves an occurrence of another series that shares the
same start time. `buildSeries` in `ics.core.ts` therefore passes each master
only the exceptions whose `UID` equals its own. Mutation testing found this:
with the UID filter removed, every test still passed until a two-series case
was added.

## A TZID with no VTIMEZONE is floating time

ical.js resolves `TZID=Europe/Paris` from a `VTIMEZONE` block in the same
feed. When the feed names an IANA zone and carries no block for it, which
providers do, the time comes back as "floating" and would be read in whatever
zone the reader assumes. `namedZoneOf` reads the `TZID` parameter itself,
accepts it when `Intl` knows the zone, and falls back to Paris otherwise.
Visual validation found this: an event at noon in New York was placed at noon
in Paris.

## Also worth knowing

- Expanding a daily series costs one iteration per occurrence from its start,
  not from the range asked for. A cap of 10 000 occurrences cut off a daily
  event that began years ago, and the evening read as free. The cap is now
  100 000.

# Invariants — pragma, `api/src/free-slots`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Free slot

- Searched over 28 days, from 18:00 to midnight on weekdays and from
  10:00 to midnight at weekends, Europe/Paris (`buildSearchWindows`).
- Starts on the next quarter hour, and is shown whole, not cut to two
  hours (`selectFreeSlots`).
- Every readable feed of every member is subtracted. A member without a
  feed is listed as left out. Each feed the provider no longer serves, or
  that could not be read, is listed with its member, its name and the
  reason, and that member's other feeds still count.
- Booking one creates a practice whose `origin` is `free_slot`.
- Listed on the **Find a slot** page (`/sessions/slots`, `site/src/routes/sessions/FindSlotPage.tsx`), reached from the Sessions header; the Sessions list itself shows none.

Held by: `api/src/free-slots/free-slots.core.test.ts` › opens at 18:00 on weekdays and 10:00 at weekends, until midnight, Paris time
Held by: `api/src/free-slots/free-slots.core.test.ts` › keeps free time of at least two hours, starting on a quarter hour
Held by: `api/src/free-slots/free-slots.controller.test.ts` › names the calendar whose address is gone, and the one whose provider is down
Held by: `api/src/free-slots/free-slots.controller.test.ts` › subtracts every calendar of a member, and never puts an address in the slots response
Held by: `api/src/sessions/sessions.core.test.ts` › keeps only the prepared concert and the origin for a practice

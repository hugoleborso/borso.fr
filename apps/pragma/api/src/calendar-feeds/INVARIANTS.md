# Invariants — pragma, `api/src/calendar-feeds`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Calendar feed

- Up to ten per member (`CALENDAR_FEEDS_PER_MEMBER_MAX`), each with its
  own `id`, in their own table, `calendar_feed`, so no read of `member`
  carries them (ADR-2026-10-02T1352). One member never holds the same address twice.
  `member_calendar_feed`, the one-per-member table before it, is left
  empty and unread, because DSQL cannot change a primary key.
- Carries the `name` its feed declares in `X-WR-CALNAME` (Google Calendar
  sets it to the calendar's title), read when the address is saved and
  capped at 120 characters. A feed that could not be read then, or that
  declares no name, is saved with none, and the page shows its position.
- Accepted only as `https`, or `webcal` rewritten to `https`, on port
  443, with a public host name and no user info (`judgeFeedAddress`).
  The same check runs again on every redirect when the feed is read.
- Added through `POST /api/me/calendar-feeds` and removed one by one
  through `DELETE /api/me/calendar-feeds/:id`. No route ever returns the
  address: the API answers each feed's `id` and `name`, and a feed that
  failed is logged with the member id and the status, never the address.
- Left out of every preview clone through `tableBlocklist`, and deleted
  with its member.

Held by: `api/src/calendar-feeds/feed-address.core.test.ts` › turns a webcal address into https
Held by: `api/src/calendar-feeds/calendar-feed.adapter.test.ts` › refuses a redirect to the Lambda runtime API
Held by: `api/src/free-slots/free-slots.controller.test.ts` › saves an address under the name its feed declares, and never sends the address back
Held by: `api/src/free-slots/free-slots.controller.test.ts` › keeps several calendars of one member, and saving one twice keeps one copy
Held by: `api/src/free-slots/free-slots.controller.test.ts` › refuses one calendar more than the cap, and says why
Held by: `api/src/free-slots/free-slots.controller.test.ts` › deletes every address with its member

## Busy interval

- Read from a calendar feed by `readBusyIntervals` in `ics.core.ts`,
  recurring events expanded, for the request that asked and never stored.
- An event marked free (`TRANSP:TRANSPARENT`) or cancelled is not busy.
  An all-day event is busy for the whole Paris day.
- A named IANA zone is read in that zone even without a `VTIMEZONE`
  block. A floating time, or a zone name that is not IANA, is read as
  Europe/Paris time.

Held by: `api/src/calendar-feeds/ics.core.test.ts` › leaves out an event marked free, and a cancelled one
Held by: `api/src/calendar-feeds/ics.core.test.ts` › makes an all-day event busy for the whole Paris day
Held by: `api/src/calendar-feeds/ics.core.test.ts` › reads a floating time, or a zone name that is not IANA, as Paris time

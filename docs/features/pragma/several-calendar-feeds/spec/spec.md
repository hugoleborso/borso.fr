# Several calendars per member

## Goal

A member whose busy time is spread over several calendars connects each of
them, and Pragma subtracts all of them from the free slots. Each connected
calendar is listed under its own name, so the member can tell them apart and
remove the right one.

The smallest change that meets it: a member holds a list of calendar feeds
instead of one, each named from its feed.

## Data shape

- Table `calendar_feed`: `id uuid` primary key, `member_id uuid`,
  `address text`, `name text` nullable, `updated_at timestamptz`. Unique on
  `(member_id, address)`, indexed on `member_id`.
- `member_calendar_feed` keeps its rows' data in `calendar_feed` (the old
  `member_id` becomes the new `id`) and is emptied. DSQL cannot replace a
  primary key, so the table is left unread rather than altered.
- `CalendarFeedSummary = { id: string; name: string | null }`.
- `GET /api/me` returns `calendarFeeds: CalendarFeedSummary[]`, ordered by
  name, unnamed last, then by id.
- `POST /api/me/calendar-feeds { address }` answers `{ calendarFeeds }`,
  `400 invalid-feed-address`, or `409 too-many-calendar-feeds`.
- `DELETE /api/me/calendar-feeds/:id` removes one of the caller's own
  calendars and answers `{ calendarFeeds }`.
- `ExcludedMember = { memberId, reason, calendarName: string | null }`,
  one entry per calendar the slots were computed without.

## Rules

- The name is the feed's `X-WR-CALNAME`, trimmed, at most 120 characters,
  read once when the address is saved. A feed that cannot be read then is
  saved with no name. Saving the same address again refreshes its name.
- A member holds at most 10 calendars. The member row is claimed in the
  write's transaction so two adds at once cannot pass the cap.
- The address is never returned by any route, as before.
- Free slots subtract every readable feed. A member with no feed is listed
  as left out. Each failing feed is listed with its member, its name and
  its reason, and the member's other feeds still count.

## Screens

- Account › Calendar lists each connected calendar by name, or
  "Calendar N" by position when its feed declared none, each with Remove.
  The removal question names the calendar.
- Below the list, "Add a calendar" opens the same address field as
  before. With no calendar, the field shows directly. At 10 calendars the
  button is replaced by a sentence saying the cap is reached.
- Find a slot names the failing calendar: "Hugo's calendar Work needs
  reconnecting". A failing calendar with no name is numbered as Account
  numbers it: "Hugo's calendar 2 needs reconnecting".
- A refused address keeps the field open with what was typed.
- A long name wraps at 375 px rather than being cut.

## Out of scope

- Renaming a calendar by hand. The feed's own name is used.
- Refreshing a name the provider changed later, until the address is
  saved again.

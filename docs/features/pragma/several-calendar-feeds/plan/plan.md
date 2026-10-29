# Plan: several calendars per member

Spec: [`../spec/spec.md`](../spec/spec.md).

## Where each decision lands

| Spec decision | Code |
|---|---|
| `calendar_feed` table, copy and empty the old one | `apps/pragma/api/src/database/migrations/0022_several_calendar_feeds.sql`, `calendar-feeds.schema.ts` |
| Old and new tables blocked from previews and the reader | `apps/pragma/cdk/lib/stack.ts`, `cdk/test/stack.test.ts`, `test/database-utils.ts`, `test/setup-postgres.ts` |
| Name from `X-WR-CALNAME`, capped at 120 | `readCalendarName` in `calendar-feeds/ics.core.ts`, `CALENDAR_FEED_NAME_MAX_LENGTH` in `domain/input-limits.core.ts` |
| Cap of 10, claimed on the member row | `upsertCalendarFeed` in `calendar-feeds.repository.ts`, `CALENDAR_FEEDS_PER_MEMBER_MAX` |
| Routes `POST /api/me/calendar-feeds`, `DELETE /api/me/calendar-feeds/:id`, `GET /api/me` list | `me/me.controller.ts`, `me/me.service.ts`, `calendar-feeds.service.ts` |
| One exclusion per failing feed, with its name | `free-slots/member-busy-time.core.ts`, `free-slots.types.ts` |
| Account list, Add, cap sentence, named removal question | `site/src/components/organisms/CalendarFeedForm.tsx`, `CalendarFeedCard.tsx`, `calendar-feed-form.utils.ts`, `lib/queries/me.queries.ts` |
| Named exclusion messages | `site/src/lib/free-slots.utils.ts`, `FreeSlotsPanel.tsx`, `i18n/en.json`, `i18n/fr.json` |
| Preview seed gives Hugo two named calendars | `api/src/__test/calendar-feed-fixtures.core.ts`, `test-seed.service.ts` |

## Risks

- DSQL cannot alter a primary key. Detection: the migration fails on deploy. Mitigation: a new table, a copy keyed on the old primary key with `ON CONFLICT ("id") DO NOTHING`, no drop.
- Two adds at once by one member pass the cap. Mitigation: `SELECT ... FOR UPDATE` on the member row inside the write's transaction, retried on a DSQL commit conflict.
- Saving now fetches the feed once to read its name. A slow provider delays the save by up to the feed timeout (4 s). The save still succeeds with no name.

## Gates

`pnpm --filter @borso-app/pragma run lint`, `typecheck`, `test:core`, and the back-e2e files under `api/src/free-slots`, `api/src/me`, `api/src/__test`, `api/src/mcp`, `api/src/members`.

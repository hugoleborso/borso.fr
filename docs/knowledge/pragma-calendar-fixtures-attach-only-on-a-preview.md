---
summary: 'On pragma''s `pnpm dev` the seed attaches no calendar feed, because the feed rule refuses its `http://localhost` fixture addresses on save and on read; check calendar screens on the PR preview.'
triggers:
  paths:
    - 'apps/pragma/api/src/__test/calendar-feed-fixtures.core.ts'
  output:
    - '"calendarFeeds":\s*0\b'
---

# Pragma's calendar fixtures attach only on a preview

PR #238's visual validator ran on `pnpm dev`, found the seed summary saying
`calendarFeeds: 0`, and had to find public ICS feeds and write rows into the
dev database to see any named or failing calendar (its two log lines in
`docs/features/pragma/several-calendar-feeds/kaizen.md`).

## Why the dev seed attaches nothing

`seedPreviewFixture` builds each fixture address from the origin of the
request that called `POST /api/__test/seed`
(`apps/pragma/api/src/__test/test-seed.controller.ts`). On `pnpm dev` that
origin is `http://localhost:<port>`. `saveCalendarFeed` judges every address
with `judgeFeedAddress` (`apps/pragma/api/src/calendar-feeds/feed-address.core.ts`),
which accepts only `https` on the default port and a public host name. So
every fixture is refused, and `countSavedFeeds` counts none. Nothing fails
loudly: the summary just says 0.

Writing the rows straight into `calendar_feed` lists them on Account, but
the reader applies the same rule before it fetches. Each one then shows as
"needs reconnecting", and no busy time is ever read.

The rule is the protection against the API fetching an internal address on a
member's behalf. Do not loosen it for a test.

## What to do

- Check busy time, names and failing calendars on the PR preview. Its origin
  is `https`, so the fixtures attach there. PR #238's body says the preview
  seed gives Hugo two calendars, Personal and Band (measured by that session).
  The fixtures are in `FEEDS_BY_USERNAME` in
  `apps/pragma/api/src/__test/calendar-feed-fixtures.core.ts`.
- On `pnpm dev`, a public `https` ICS feed attaches and is read. Rows that
  need a feed you cannot find in public, such as a padded or over-long
  `X-WR-CALNAME`, stay with the unit tests in `ics.core.test.ts`.

See also [`driving-pragma-auth-from-a-validator.md`](./driving-pragma-auth-from-a-validator.md)
for signing in on the same dev server.

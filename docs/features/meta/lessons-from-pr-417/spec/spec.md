# Spec: the pragma seed's concert carries a public message

Sweep of PR #417. Three visual-validator runs wrote a public message into
the local database by hand, because the seeded concert had none. Production
has one concert with a message (measured with `scripts/db-read.sh`).

## What changes

1. `POST /api/__test/seed`, and `pnpm dev`, which calls the same seeder,
   give the seeded upcoming concert the public message
   "Portes à 20 h, premier morceau à 20 h 30.".
2. The message is written through `patchAnnouncement`, the path the ERP's
   public-page panel uses, so the seed holds no state the app cannot reach.
3. Nothing else in the fixture changes: same sessions, same members, same
   setlist, same flames.
4. The seed service reuses `oauth.core`'s time constants instead of
   redefining them. The values do not change.
5. `test-seed.controller.ts` imports `seedTodayPractice` from the file that
   defines it. `?practice=today` behaves as before.

## Out of scope

- A past concert, a practice by default, or a concert without a venue. The
  inventory gives each one's reason.
- Any production route. The seed router mounts only with `ALLOW_TEST_SEED`.

## Use cases

- After a seed, `listUpcomingConcerts` returns the concert with that message.
- After a seed without `?practice=today`, the only session is the concert.

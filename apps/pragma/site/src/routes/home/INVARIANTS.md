# Invariants of pragma, in `site/src/routes/home`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Home

- Home lives at `/app`. The address `/` is the public concert sign-up
  page for everyone, signed in or not, outside the session gate and the
  shell.
- Signing in with no page to return to, the Home tab, a notification
  without its own address and the installed app all open `/app`.
- The next session is the earliest one whose calendar day in Paris is
  today or later (`selectNextSession` in `domain/session-schedule.core.ts`),
  practice or concert alike.
- Its one primary action is **Start the practice** on a practice's own
  day when practice mode is offered; otherwise it opens that session's
  first setlist, or the session when it has none; with no session ahead
  it offers **New session**.
- The member's open tasks list the ones naming the next session first.
- The header always offers the visitor QR code, which leads to the concert
  sign-up page at `/`, whether or not a session is ahead and whether or not
  the flames could be read.
Held by: `site/src/routes/home/home.core.test.ts` › lists the songs where the member plays, an override included, with the instruments
Held by: `site/src/routes/home/HomePage.test.tsx` › shows an empty state with New session when no session is ahead
Held by: `site/src/components/organisms/navigation-active.core.test.ts` › lights Home up on the start screen only
Held by: `site/src/routes/login.core.test.ts` › opens Home when the state carries no origin
Held by: `site/src/sw/service-worker.test.ts` › opens a new window when none is open, at home when the URL is missing
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › shows only the next concert, its venue as a map search, its message and its prize, and no way to the members area
Held by: `site/src/routes/home/HomePage.test.tsx` › offers the visitor QR code in the header even with no session ahead

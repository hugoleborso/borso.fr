# Invariants of pragma, in `site/src/routes/concerts`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Concert sign-up page

- The page shows the next concert only, the first one the API lists, as a
  ticket. With a poster, the whole poster shows uncropped above the date
  band. On a phone the poster shrinks, never cropped, so the ticket down to
  its prize coupon, or its venue without a prize, ends above "Je serai là !".
  Without one, the date band is the top of the ticket. The venue
  links to a Google Maps search for it. The message sits right under the
  venue, except on a phone when the concert has a poster, where it moves
  after the prize coupon. The prize coupon shows only when the concert has
  a prize. No link leads to the members' area.
- "Je serai là !" opens a sheet with a first name and an email. The email
  is sent trimmed and lower case.
- While the sign-up is on its way the opening screen shows, and the sheet
  steps aside. A request that never got through, or a server failure,
  offers a retry that resends the same answers. Any other answer plays the
  exit first.
- An email already signed up for that concert, an alias of it included,
  and a throwaway address are refused under the email field of the sheet,
  which comes back with what was typed. Every other refusal reads under
  its button.
- The browser remembers the first registration per concert
  (`pragma.registration.<sessionId>`), so a reload shows the concert as
  signed up. "Un·e ami·e" signs someone else up from the same browser,
  and that sign-up never replaces the remembered one.
- Each visit checks the remembered registration once, with its edit token
  (`useRememberedRegistrationCheck`). The answer stays in memory and is
  never saved with the cached reads (`isQueryKeyPersisted`), so the next
  visit asks again. When the server no longer has it
  (`isRegistrationGone`), the browser forgets it and offers "Je serai là !"
  again. Any other answer keeps it.
- After each sign-up, an optional sheet greets the person by first name
  and asks who they come for and which song they would love to hear. Its
  answer travels with the edit token that sign-up returned, in the
  registration token header.
- In the ERP, a concert's public page carries its poster, its prize, its
  public message and its registrations. A poster is a PDF, JPEG, PNG or
  WebP of at most 10 MB, checked before any upload. A PDF's first page is
  drawn to a PNG and its near-white margins are trimmed before the upload,
  then up to two lines a side of the grey fringe the page leaves around
  the poster. A fringe line is one mostly lighter than the line just
  inside it, so a poster whose own edge is light keeps it. The upload then
  holds the same 10 MB limit. A blank message or prize label
  clears it. The draw picks up to three distinct registrations at random,
  in the browser, and keeps nothing. "Retirer" removes a registration once
  confirmed. It leaves the list, the draw and the winners already drawn at
  once, and comes back if the server refuses.

Held by: `site/src/routes/concerts/concert-sign-up.core.test.ts` › sends a trimmed first name and a trimmed lower-case email
Held by: `site/src/routes/concerts/concert-sign-up.core.test.ts` › offers a retry only when the server could not be reached or failed
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › shows the tuning screen while the sign-up is on its way
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › says the email is already signed up when the server refuses a second one
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › asks for a real email under the field when the address is a throwaway one
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › shows only the next concert, its venue as a map search, its message and its prize, and no way to the members area
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › moves the message after the prize coupon on a phone only when the concert has a poster
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › caps the poster on a phone to the screen the ticket and the button leave, tighter with a prize
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › shows no prize coupon when the concert has none
Held by: `site/src/routes/concerts/concert-ticket.core.test.ts` › opens a map search for the venue as typed
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › shows a concert already signed up for in this browser as done
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › offers the sign-up for a next concert the browser never signed up for, once the remembered list refreshes
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › signs up a friend from the same browser, asks them the questions, and keeps the first sign-up remembered
Held by: `site/src/lib/registration-token.adapter.test.ts` › keeps the first registration of a concert when a friend signs up from the same browser
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › signs up, remembers it in the browser, then asks who they come for
Held by: `site/src/routes/concerts/concert-public-page.core.test.ts` › accepts a JPEG, PNG or WebP poster up to the size limit
Held by: `site/src/routes/concerts/concert-public-page.core.test.ts` › takes a PDF poster to draw in the browser, and an image as it is, both up to the size limit
Held by: `site/src/routes/concerts/poster-pdf.core.test.ts` › keeps the smallest box around every inked pixel
Held by: `site/src/routes/concerts/poster-pdf.core.test.ts` › drops a one or two pixel grey fringe left of the poster
Held by: `site/src/routes/concerts/poster-pdf.core.test.ts` › keeps a poster whose own edge is light, as long as the inside is as light
Held by: `site/src/lib/pdf-poster.adapter.test.ts` › draws the first page within the pixel budget, trims its white margins and answers a PNG
Held by: `site/src/components/organisms/ConcertPublicPagePanel.test.tsx` › draws a PDF poster to a PNG, then uploads that PNG and saves its key
Held by: `site/src/routes/concerts/concert-public-page.core.test.ts` › draws three distinct winners from the registrations
Held by: `site/src/components/organisms/ConcertPublicPagePanel.test.tsx` › removes a registration once confirmed, so it leaves the list and the draw
Held by: `site/src/components/organisms/ConcertPublicPagePanel.test.tsx` › puts a registration back and says so when the removal fails
Held by: `site/src/components/organisms/ConcertPublicPagePanel.test.tsx` › keeps a registration out of the list when its removal succeeds after an earlier one failed
Held by: `site/src/components/organisms/ConcertPublicPagePanel.test.tsx` › takes a removed registration off the winners already drawn, and hides them once none is left
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › offers the sign-up again when the band removed the registration this browser remembers
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › checks the remembered registration again on the next visit, after an earlier visit found it standing
Held by: `site/src/lib/queries/persisted-query.core.test.ts` › keeps the check of a remembered registration off the phone, so each visit asks again
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › keeps a remembered registration signed up when its check is refused for another reason
Held by: `site/src/routes/concerts/concert-sign-up.core.test.ts` › forgets a remembered registration only when the server no longer has it
Held by: `site/src/lib/registration-token.adapter.test.ts` › forgets the registration of one concert only, so the next sign-up is remembered again
Held by: `site/src/routes/concerts/concert-public-page.core.test.ts` › clears a blank message and trims a written one

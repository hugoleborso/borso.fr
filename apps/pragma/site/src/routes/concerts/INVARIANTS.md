# Invariants of pragma, in `site/src/routes/concerts`

The rules the terms of [the vocabulary](../../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Concert sign-up page

- A visitor signs up for one upcoming concert with a first name and an
  email. The email is sent trimmed and lower case.
- While the sign-up is on its way the opening screen shows. A request
  that never got through, or a server failure, offers a retry that
  resends the same answers. Any other answer plays the exit first.
- An email already signed up for that concert, an alias of it included,
  and a throwaway address are refused under the email field. Every other
  refusal reads under the button.
- The browser remembers the registration per concert
  (`pragma.registration.<sessionId>`), so a reload shows the concert as
  signed up and offers no second form.
- After signing up, an optional sheet asks who the visitor comes for and
  which song they would love to hear. Its answer travels with the edit
  token the sign-up returned, in the registration token header.
- In the ERP, a concert's details carry its public page: the poster, the
  public message and the registrations. A poster is a JPEG, PNG or WebP
  image of at most 10 MB, checked before any upload. A blank message
  clears it. The draw picks up to three distinct registrations at random,
  in the browser, and keeps nothing.

Held by: `site/src/routes/concerts/concert-sign-up.core.test.ts` › sends a trimmed first name and a trimmed lower-case email
Held by: `site/src/routes/concerts/concert-sign-up.core.test.ts` › offers a retry only when the server could not be reached or failed
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › shows the tuning screen while the sign-up is on its way
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › says the email is already signed up when the server refuses a second one
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › asks for a real email under the field when the address is a throwaway one
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › shows a concert already signed up for in this browser as done
Held by: `site/src/routes/concerts/ConcertsLandingPage.test.tsx` › signs up, remembers it in the browser, then asks who they come for
Held by: `site/src/routes/concerts/concert-public-page.core.test.ts` › accepts a JPEG, PNG or WebP poster up to the size limit
Held by: `site/src/routes/concerts/concert-public-page.core.test.ts` › draws three distinct winners from the registrations
Held by: `site/src/routes/concerts/concert-public-page.core.test.ts` › clears a blank message and trims a written one

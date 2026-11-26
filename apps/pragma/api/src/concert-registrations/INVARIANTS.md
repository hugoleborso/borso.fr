# Invariants of pragma, in `api/src/concert-registrations`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Concert registration

- `concert_registration` holds `session_id`, `first_name`, `email`,
  `canonical_email`, `edit_token_hash`, `coming_for_member_id`, `wished_song_id` and
  `registered_at`. No foreign key is declared.
- One mailbox signs up once per concert, so nobody enters a giveaway
  twice with an alias. The rule is the
  `concert_registration_session_canonical_email_unique` constraint on
  `(session_id, canonical_email)`, declared on `CREATE TABLE`, so it holds
  from the first row on DSQL. A second sign-up answers 409
  `already-registered`.
- `email` is the address as typed, trimmed and lower-cased by
  `registrationCreateSchema`. It is the one used to write to the person.
- `canonical_email` is `canonicalizeEmail(email)` in
  `domain/registration-email.core.ts`, a thin wrapper over the
  `validator` library's `normalizeEmail` with its defaults. That call
  removes the dots and the `+tag` on Gmail, folds `googlemail.com` onto
  `gmail.com`, and strips the subaddress on Outlook, Yahoo and iCloud.
  The wrapper then drops a `+tag` on every other domain too. Elsewhere the
  dots stay, because `a.b@free.fr` and `ab@free.fr` are two mailboxes.
- A throwaway mailbox (yopmail, 10minutemail and the rest of the
  `mailchecker` library's list) answers 422 `disposable-email`
  (`isDisposableEmail`). The list ships inside the package, so the check
  makes no network call.
- Only a concert whose date is on or after midnight of today in Paris
  takes a sign-up (`isUpcomingConcert`), so tonight's concert stays open
  all evening. Anything else answers 422 `not-an-upcoming-concert`.
- The public sees each member's id and first name only, never an email,
  a phone or an avatar key.
- `concert_registration` is kept off every preview clone and off the
  schema reader, because it holds emails (`cdk/lib/stack.ts`).

Held by: `api/src/concert-registrations/concert-registrations.schema.test.ts` › holds one mailbox once per concert, however its address is spelled
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › stores the email lower case and refuses the same email twice on one concert
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › refuses a second alias of one mailbox on one concert, so a giveaway is entered once
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › keeps the dots of an address outside Gmail, where they name another mailbox
Held by: `domain/registration-email.core.test.ts` › removes the dots on Gmail and folds googlemail.com onto gmail.com
Held by: `domain/registration-email.core.test.ts` › drops the +tag of the local part on every domain
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › refuses a throwaway mailbox and writes nothing for it
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › refuses a sign-up on a practice, a past concert and a session that does not exist
Held by: `api/src/concert-registrations/concert-registrations.core.test.ts` › keeps a concert that started earlier today in Paris, so tonight stays open all evening
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › shows the public only the id and first name of each member
Held by: `cdk/test/stack.test.ts` › keeps the reader off every table holding a credential, a key, a secret address, a ballot token or a fan email

- Deleting a concert deletes its registrations in the same transaction
  (`deleteSessionWithCascade`), so no email outlives the concert it was given for.

Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › erases the sign-ups of a concert when the concert is deleted, so no email outlives it

## Registration edit token

- A sign-up answers a random token (`mintBallotToken`). Only its sha256
  is stored (`hashToken`), so a read of the table cannot amend anyone.
- Amending a registration needs that token in `x-registration-token`. A
  wrong or missing token answers 403 `invalid-registration-token` and
  changes nothing.
- The header is listed in `domain/request-headers.core.ts`, which is what
  lets CORS and CloudFront pass it through.

Held by: `api/src/concert-registrations/concert-registrations.schema.test.ts` › stores a hash of the edit token, never the token itself
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › refuses an answer carrying a wrong edit token or none, and changes nothing

## Fan wish

- A wish is a picked Deezer track, never free text. It resolves through
  `resolveCatalogueSongForTrack`: a catalogue song already linked to that
  track, else a new song with status `idea`.
- The fan wishes are the distinct `wished_song_id` values, so a song
  wished by many appears once.

Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › records who a registration comes for and the song it wishes, imported as an idea
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › lists each wished song once, however many registrations wish it

## Concert announcement

- `session.public_message` and `session.poster_s3_key` stay nullable at
  the database level forever, because DSQL takes no constraint on
  `ADD COLUMN`.
- A poster key is accepted only under `poster/<sessionId>/`
  (`isPosterKeyAcceptable`), because the public page signs a GET URL for
  it. Any other key answers 422 `foreign-poster-key`.
- A preview clone nullifies `poster_s3_key`, since the preview cannot read
  the production bucket.

Held by: `api/src/concert-registrations/concert-registrations.core.test.ts` › refuses any other object, so the public page never signs a take or a chart
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › refuses a poster key that belongs to another object, so the public page signs only posters
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › signs a poster upload under its concert and shows the poster once it is set

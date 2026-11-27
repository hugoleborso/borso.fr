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
  `already-registered`, also when it loses a commit race on DSQL and
  every retry of its transaction aborts (`register` reads the winner
  before answering, and rethrows when there is none).
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
- The public sees each member's id, first name and colour only, never an
  email, a phone or an avatar key.
- `concert_registration` is kept off every preview clone and off the
  schema reader, because it holds emails (`cdk/lib/stack.ts`).

Held by: `api/src/concert-registrations/concert-registrations.schema.test.ts` › holds one mailbox once per concert, however its address is spelled
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › stores the email lower case and refuses the same email twice on one concert
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › answers one 201 and one 409 when one mailbox signs up twice at the same moment, and keeps one row
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › answers 409 to a mailbox already signed up when every retry of its commit conflicts, and fails loudly for a new one
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › refuses a second alias of one mailbox on one concert, so a giveaway is entered once
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › keeps the dots of an address outside Gmail, where they name another mailbox
Held by: `domain/registration-email.core.test.ts` › removes the dots on Gmail and folds googlemail.com onto gmail.com
Held by: `domain/registration-email.core.test.ts` › drops the +tag of the local part on every domain
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › refuses a throwaway mailbox and writes nothing for it
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › refuses a sign-up on a practice, a past concert and a session that does not exist
Held by: `api/src/concert-registrations/concert-registrations.core.test.ts` › keeps a concert that started earlier today in Paris, so tonight stays open all evening
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › shows the public only the id, first name and colour of each member
Held by: `cdk/test/stack.test.ts` › keeps the reader off every table holding a credential, a key, a secret address, a ballot token or a fan email

- A member removes one registration of one concert
  (`didDeleteRegistrationOfConcert`). It answers 204, or 404
  `unknown-registration` when that concert holds no such registration, so
  an id from another concert removes nothing. The wished song stays in the
  catalogue, and leaves the fan wishes unless another registration still
  wishes it. The mailbox can sign up again.

Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › removes a registration of its concert only, keeps its wished song out of the fan wishes but in the catalogue, and lets the mailbox sign up again
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › answers every public route without a session cookie and gates every member route

- Deleting a concert deletes its registrations in the same transaction
  (`deleteSessionWithCascade`), so no email outlives the concert it was given for.
- A sign-up claims the concert's `session` row (`didClaimConcertWithin`)
  in the transaction that checks the concert is upcoming and inserts the
  registration. A deletion writes that row too, so the two never both
  commit: on DSQL one aborts, locally one waits. A sign-up that runs
  after the deletion answers 422 `not-an-upcoming-concert`. The price is
  that two sign-ups on one concert also conflict on DSQL, where the
  database client retries the losing transaction whole.

Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › erases the sign-ups of a concert when the concert is deleted, so no email outlives it
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › keeps no sign-up for a concert deleted while the sign-up was being written

- The sign-up and the answers of a registration share one budget per
  client address, `CONCERT_REGISTRATION_WRITE_BUDGET`. A request past it
  answers 429. The bucket lives in each Lambda instance.

Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › bars an address that hammers the sign-up
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › bars an address that hammers the answers of a registration

## Concert calendar file

- `GET /concerts/:sessionId/calendar` is public and shares the read budget,
  `CONCERT_REGISTRATION_READ_BUDGET`. It answers one event as
  `text/calendar`: the concert's start, an end two hours later
  (`CONCERT_CALENDAR_EVENT_HOURS`, since a session stores no end), the
  summary `pragma · <venue>`, the venue and the public message. A concert
  with no venue is named `pragma` and has no location; one with no message
  has no description.
- A practice, a past concert or a session that does not exist answers 422
  `not-an-upcoming-concert`.

Held by: `api/src/concert-registrations/concert-calendar.core.test.ts` › writes one event that starts at the concert, lasts two hours, and is named after the band and the venue
Held by: `api/src/concert-registrations/concert-calendar.core.test.ts` › names the event after the band alone and leaves out the place and the note a concert lacks
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › hands anyone the next concert as a calendar file, and refuses a practice, a past concert and an unknown one
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › bars an address that hammers the calendar file of a concert

## Registration edit token

- A sign-up answers a random token (`mintBallotToken`). Only its sha256
  is stored (`hashToken`), so a read of the table cannot amend anyone.
- Amending a registration needs that token in `x-registration-token`. A
  wrong or missing token answers 403 `invalid-registration-token` and
  changes nothing.
- An amendment names at least one answer. An empty body answers 400 and
  changes nothing (`registrationPatchSchema`). An amendment whose
  registration a member removed after the token was checked answers 404
  `unknown-registration`, because its update touched no row.
- The token works only while the concert is upcoming
  (`isUpcomingConcert`). Afterwards an amendment answers 422
  `not-an-upcoming-concert`, so an old token cannot import songs into the
  catalogue.
- The browser holding a token asks whether its registration still stands
  (`checkRegistration`). The token is checked as the amendment checks it.
  A match answers 200, a wrong or missing token 403
  `invalid-registration-token`, and a removed registration 404
  `unknown-registration`. The check spends the read budget,
  `CONCERT_REGISTRATION_READ_BUDGET`, past which it answers 429.
- The header is listed in `domain/request-headers.core.ts`, which is what
  lets CORS and CloudFront pass it through.

Held by: `api/src/concert-registrations/concert-registrations.schema.test.ts` › stores a hash of the edit token, never the token itself
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › refuses an answer carrying a wrong edit token or none, and changes nothing
Held by: `api/src/concert-registrations/concert-registrations.schema.test.ts` › refuses an answer that names nothing to change
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › refuses an answer that names nothing to change with 400, and changes nothing
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › answers 404 to an answer whose registration a member removed while it was being saved
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › refuses the answers once the concert is past, so an old token imports no more songs
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › tells a browser whether its remembered registration still stands, and only with its token
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › bars an address that hammers the check of a registration

## Fan wish

- A wish is a picked Deezer track, never free text. `readWishedTrack`
  reads it from Deezer, then `resolveOrImportWishedSongWithin` takes the
  catalogue song already linked to that track, else imports a new song
  with status `idea` (`findOrImportSuggestedSongWithin`).
- The import and the update of the registration run in one transaction
  the service owns, so a failed update leaves no song behind. When two
  wishes import one track at the same moment, the loser's transaction
  hits `song_deezer_track_id_unique`, rolls back whole, and runs once
  more against the winner's song.
- The fan wishes are the distinct `wished_song_id` values, so a song
  wished by many appears once.

Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › records who a registration comes for and the song it wishes, imported as an idea
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › lists each wished song once, however many registrations wish it
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › imports one song when two registrations wish the same unknown track at the same moment

## Concert announcement

- `session.public_message`, `session.poster_s3_key`, `session.prize_label`
  and `session.prize_icon` stay nullable at the database level forever,
  because DSQL takes no constraint on `ADD COLUMN`.
- A prize shows on the public list only when it has a label
  (`projectConcertPrize`). Its icon is one of `CONCERT_PRIZE_ICONS` in
  `domain/concert-prize.core.ts`. The announcement PATCH refuses any other
  icon and a label longer than `CONCERT_PRIZE_LABEL_MAX_LENGTH`, and a
  stored icon nobody knows reads as `beer`.
- The poster upload takes images only. A PDF poster is drawn to a PNG in
  the browser before it is uploaded.
- Members edit the announcement in the "Public page" tab of a concert's
  session page, a view `listSessionViews` offers to a concert only. A
  practice never shows it, and `?view=public` on a practice falls back to
  its first view.
- A poster key is accepted only under `poster/<sessionId>/`
  (`isPosterKeyAcceptable`), because the public page signs a GET URL for
  it. Any other key answers 422 `foreign-poster-key`.
- A preview clone nullifies `poster_s3_key`, since the preview cannot read
  the production bucket.
- The poster types, the poster size, the message length, the prize label length and the sign-up's
  first name and email lengths are declared once in
  `domain/input-limits.core.ts`. The API's schemas and the site's forms
  both import them, so the two sides cannot disagree.

Held by: `site/src/routes/sessions/session-page.core.test.ts` › adds the public page view to a concert only, after its details
Held by: `site/src/routes/sessions/SessionDetailPage.test.tsx` › opens the public page of a concert in its own tab, from a link to it, and not under the details
Held by: `api/src/concert-registrations/concert-registrations.core.test.ts` › refuses any other object, so the public page never signs a take or a chart
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › refuses a poster key that belongs to another object, so the public page signs only posters
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › signs a poster upload under its concert and shows the poster once it is set
Held by: `api/src/concert-registrations/concert-registrations.controller.test.ts` › sets a prize with its icon, shows it on the public list, clears it, and refuses an unknown icon
Held by: `domain/concert-prize.core.test.ts` › shows a prize only when a member wrote its label
Held by: `domain/concert-prize.core.test.ts` › reads a stored icon, and falls back to the beer for none or an unknown one
Held by: `api/src/concert-registrations/concert-registrations.schema.test.ts` › takes a photo up to ten mebibytes and refuses a document or a heavier file
Held by: `site/src/routes/concerts/concert-public-page.core.test.ts` › accepts a JPEG, PNG or WebP poster up to the size limit

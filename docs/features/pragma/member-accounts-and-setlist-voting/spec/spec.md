# Each member signs in as themselves and the band picks its next setlist by vote

## Perspectives confronted

- [x] **Client / business** — the band confirmed the pain is choosing songs out loud in
      practice, and always landing on the same ones.
- [x] **Product** — vote mechanism, budget, visibility, closing, reopening, and the
      catalogue moving mid-vote were each chosen against named alternatives.
- [x] **Tech-lead** — the auth model is replaced rather than doubled, the vote lives on the
      existing setlist rather than in a second entity, and both decisions were taken against
      what Aurora DSQL actually accepts as DDL.
- [x] **Developer** — the closing rule, the tie rule and the swipe zones were pushed into
      pure functions so the whole feature is provable without a browser except for the swipe
      itself.
- [x] **Designer** — the voting screen is a swipe deck with three scoring zones on the right,
      an opacity gradient while dragging, and a badge on the card once scored.

## Why

The five members choose the songs of a concert by arguing about it during a practice. The
argument costs rehearsal time, and it always ends on the songs somebody says out loud, which
are the songs already played. Giving every member an account and a private budget of points
moves that choice out of the room: everyone scores the catalogue from their phone between two
practices, and the setlist falls out of the totals. Accounts are the part that makes the vote
possible at all, because today the band shares one password and the app cannot tell who is
asking.

- **Output metric (primary):** no practice time is spent choosing songs. Measured out of band,
  by the operator, over the next three concerts.
- **Output metric (secondary):** the share of the catalogue played at least once over the last
  three concerts goes up. The two pull against each other, and the primary wins when they do:
  a vote that is fast but conservative is still a success.
- **Input metrics:** the delay between opening a vote and closing it; the share of members who
  have posted at least one point when the vote is closed; the number of distinct songs
  receiving at least one point per vote.
- **Gemba:** the operator reports the same conversation at every concert preparation, and the
  `song.status` column already shows a catalogue where `concert_ready` songs go unplayed.

## Result

Five screens, four of them new.

1. **Sign in** — one field for the member name, one for the password, and a passkey button
   for browsers that have one enrolled. Replaces today's single password field.
2. **Enrolment** (new, temporary) — reachable with the old shared password only. The member
   picks their name from the band's members, chooses a password, and lands signed in. The
   route refuses once every member holds a credential, so it closes itself.
3. **Account** (new) — change password, add a passkey, name it, remove it.
4. **Vote** (new) — the setlist page of a setlist whose status is `voting`. A deck of cards,
   one song per card, drawn from the catalogue. Dragging left discards the song for zero
   points. The right half is split into three zones, one point at the bottom, two in the
   middle, three at the top; the zone under the thumb fills in as the drag approaches it, the
   way a like target does on a dating app. On release the card flies away and the song's row
   in the list below carries a badge with the points given. A bar pinned to the top shows
   points left of the budget and the running totals. When the budget runs out, the bar says
   so and the right zones stop accepting: *"Plus de points ! Enlève des points aux autres
   chansons pour continuer de liker."*
5. **Closing** (new) — the proposed running order, the top N by points with every song tied
   at the boundary shown as well, each row removable, addable and draggable, and one button
   that writes the entries and puts the setlist in `locked`.

API surface that did not exist: `POST /api/auth/enrol`, `POST /api/auth/login` carrying a
member, `POST /api/auth/passkey/registration/{options,verify}`,
`POST /api/auth/passkey/authentication/{options,verify}`, `PUT /api/me/password`,
`GET|DELETE /api/me/passkeys`, `GET /api/me`, `PUT /api/setlists/:id/vote-status`,
`PUT /api/setlists/:id/votes/:songId`, `GET /api/setlists/:id/votes`,
`POST /api/setlists/:id/close`.

## Use cases / edge cases

```
member                       app                                   database
  |  old shared password  -->  POST /api/auth/enrol                  |
  |                            claim member, hash password       --> member_credential
  |  <-- pragma_session (memberId, epoch)                            |
  |                                                                  |
  |  open setlist, set target N --> PUT /vote-status {voting, N}  --> setlist_sheet.status
  |  swipe a card               --> PUT /votes/:songId {points}   --> setlist_vote
  |  <-- totals per song, per member                                 |
  |                                                                  |
  |  close                      --> POST /close                      |
  |                                 tally, top N + ties          --> setlist_entry
  |  <-- setlist in locked, ordered as proposed                  --> setlist_sheet.status
```

**Happy path**

1. A member opens the app, enters the old shared password once, picks their name, sets a
   password, and is signed in as themselves.
2. Any member creates a setlist, names it, sets a target of 15 songs and opens the vote. The
   budget becomes 45 points, capped at 3 per song.
3. Each member swipes through the catalogue, dropping cards into the 1, 2 or 3 zone or
   discarding them left. Totals move live and everyone can see who gave what.
4. A member closes the vote. The app proposes the 15 top-scoring songs, plus every song tied
   with the fifteenth, ordered by points.
5. That member removes two, adds one, drags the order into a shape that works on stage, and
   validates. The setlist is `locked` and is now an ordinary setlist, attachable to a concert
   and editable as before.

**Edge cases**

- A song added to the catalogue during the vote is votable immediately, and the vote screen
  marks it as new for a member who has already been through the deck.
- A member who spends only part of their budget still counts, for what they posted.
- A member who scores nothing is simply absent from the totals; the vote closes without them.
- A locked setlist can be reopened. Points survive, and the next closing overwrites the
  entries written by the previous one.
- Songs tied at the boundary are all proposed, so the proposal can exceed N.
- Deleting a member deletes their votes in the same transaction that scrubs them from the
  lineups.
- Deleting a song deletes its votes along with its setlist entries and mastery overrides.
- A member with no passkey never sees a passkey prompt; a member with one can still sign in
  by password.
- Changing a password signs that member out of their other browsers and leaves the other
  members alone.

**Error cases**

- Scoring beyond the budget is refused with `budget-exhausted` and the remaining points.
- Scoring more than 3 on one song is refused by the schema.
- Scoring on a setlist that is not `voting` is refused with `not-voting`.
- Closing a setlist that is not `voting` is refused with `not-voting`.
- Closing a vote where no song scored is refused with `no-votes`.
- Enrolling a member who already holds a credential is refused with `already-enrolled`.
- Reaching the enrolment route once every member is enrolled is refused with
  `enrolment-closed`.
- A cookie issued before this change carries no member and is rejected as `session-invalid`,
  so everyone signs in once after the deploy.
- Login attempts stay rate limited per hashed client IP, as today.

## Questions, Options and Decisions

| Question | Options | Decision (2026-09-14) |
| --- | --- | --- |
| What happens to the shared password? | keep it beside accounts / keep it for read-only / replace it | **Replace it.** One auth path to test. It survives on the enrolment route only, and that route closes itself. |
| Who is admin? | `isAdmin` column / every member / one hard-coded | **Every member is admin.** Five people who trust each other; no role column, no promotion screen. |
| Passkeys now or later? | iteration 2 / now as a second factor / now as the only method | **Now, as an alternative single factor.** Password stays as the fallback when a device is lost. |
| Which vote mechanism? | approval / point budget / ranking / thumbs up | **Point budget.** It expresses intensity, which is what settles a boundary between two songs everyone half-likes. |
| How large is the budget? | 3 × target, max 3 per song / 100 flat / 100 capped at 20 | **3 × target, capped at 3 per song.** One number to set, and no member can carry a song alone. |
| Must the budget be spent? | no / yes to close / normalised | **No.** A member who is away must not block the band. |
| Who sees what during the vote? | totals only / everything / nothing | **Everything, live, including who gave what.** Five people who talk to each other anyway; hiding it buys nothing. |
| How does a vote become a setlist? | propose top N and adjust / automatic / never | **Propose and adjust.** Points order is almost never a stage order. |
| How is the first account created? | migration seeds everyone / one seeded account / the shared password opens an enrolment page | **The shared password opens an enrolment page.** Self-service, no temporary passwords to hand out, and no member is locked out at deploy. |
| Is a voting setlist a different thing? | status on the setlist / a separate ballot entity | **A status on the existing setlist.** One object in the vocabulary, one page. DSQL forbids a `NOT NULL` column after creation, so the two new columns are nullable and a null status reads as `locked`, the way `family` already falls back to `is_harmonic`. |
| How are ties at the boundary broken? | by voter count then title / propose the ties as well / by song status | **Propose the ties as well** and let the band cut. Deterministic, and it puts the arbitrary choice in front of a human. |
| A song added mid-vote? | votable immediately / ballot frozen at opening | **Votable immediately.** The vote is about the living catalogue, and a frozen ballot needs a table of its own. |
| Reopening a locked setlist? | yes, keeping votes / no / yes, resetting | **Yes, keeping votes.** Changing your mind must not destroy everyone's work. |
| A deleted member's votes? | deleted with them / kept | **Deleted in the same transaction**, as `deleteMemberWithLinks` already does for lineups. |
| What does a right swipe score? | zones for 1, 2, 3 points / a flat value adjusted later / triage only | **Three zones on the right**, bottom 1, middle 2, top 3, with the zone filling in during the drag and a badge on the row afterwards. |

**Out of scope**

- Album artwork on the cards, the catalogue and the setlists. It needs a `release_mbid`
  column, the Cover Art Archive as a new external system, an ADR and a manifest entry. Its
  own spec, straight after this one.
- Roles and permissions beyond "every member can do everything".
- Password reset by email. There is no mail path in this app; a member who forgets their
  password asks another member, who is also an admin.
- Account recovery when both the password and every passkey are lost.
- Deadlines or automatic closing of a vote.

**ADRs to write before implementation** (both are triggers under CLAUDE.md, and both are
`/adr` candidates, not decisions this spec settles):

- WebAuthn brings `@simplewebauthn/server` and `@simplewebauthn/browser` as new dependencies.
- The shared password is replaced by per-member credentials, which changes every gate in the
  API and invalidates every live cookie.

## Changes

### Types / domain model

```ts
export type SetlistVoteStatus = 'voting' | 'locked';

export interface MemberCredential {
  readonly memberId: string;
  readonly username: string;
  readonly passwordHash: string;
  readonly sessionEpoch: number;
}

export interface SongTally {
  readonly songId: string;
  readonly points: number;
  readonly voterCount: number;
  readonly pointsByMember: Readonly<Record<string, number>>;
}

export interface VoteBudget {
  readonly total: number;
  readonly spent: number;
  readonly remaining: number;
}
```

Vocabulary this adds to `apps/pragma/VOCABULARY.md`, whose *Words we do not use* section
currently forbids **account** and says nobody has one: **Member credential**, **Passkey**,
**Vote**, **Vote budget**, **Setlist status**. The *Sign-in session* entry is rewritten, and
**account** moves from forbidden to allowed as a synonym of member credential.

### Database changes

DSQL accepts `ADD COLUMN name type` and nothing else, so the two columns on the existing
table are nullable with no default, and every new constraint lands on a table created whole.

```sql
ALTER TABLE "setlist_sheet" ADD COLUMN "status" text;
ALTER TABLE "setlist_sheet" ADD COLUMN "target_song_count" integer;

CREATE TABLE "member_credential" (
  "member_id" uuid PRIMARY KEY NOT NULL,
  "username" text NOT NULL,
  "password_hash" text NOT NULL,
  "session_epoch" integer NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "member_credential_username_idx" ON "member_credential" ("username");

CREATE TABLE "member_passkey" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "member_id" uuid NOT NULL,
  "credential_id" text NOT NULL,
  "public_key" bytea NOT NULL,
  "sign_counter" integer NOT NULL,
  "transports" text NOT NULL,
  "label" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "member_passkey_credential_id_idx" ON "member_passkey" ("credential_id");

CREATE TABLE "webauthn_challenge" (
  "challenge" text PRIMARY KEY NOT NULL,
  "member_id" uuid,
  "expires_at" timestamptz NOT NULL
);

CREATE TABLE "setlist_vote" (
  "setlist_id" uuid NOT NULL,
  "member_id" uuid NOT NULL,
  "song_id" uuid NOT NULL,
  "points" integer NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "setlist_vote_pk" PRIMARY KEY ("setlist_id", "member_id", "song_id")
);
CREATE INDEX "setlist_vote_setlist_song_idx" ON "setlist_vote" ("setlist_id", "song_id");
```

`bytea` is already in use for the HMAC key, and `jsonb` is not used anywhere, per the
dantotsu on that column type.

### Files to change

```
api/src/auth/credentials.schema.ts                       // NEW  credential, passkey, challenge tables + zod
api/src/auth/credentials.repository.ts                   // NEW
api/src/auth/enrolment.service.ts                        // NEW  claim a member, close when all enrolled
api/src/auth/passkey.service.ts                          // NEW  simplewebauthn orchestration
api/src/auth/passkey.adapter.ts                          // NEW  @DependsOnExternal webauthn
api/src/auth/member-session.core.ts                      // NEW  cookie payload with memberId + epoch, 100% covered
api/src/auth/session-cookie.utils.ts                     // UPDATE: payload carries memberId and epoch
api/src/auth/shared-password.middleware.ts               // UPDATE → requireMemberSession, resolves the member
api/src/auth/auth.controller.ts                          // UPDATE: login by member, enrol, passkey routes
api/src/auth/auth.service.ts                             // UPDATE
api/src/me/me.controller.ts                              // NEW  password change, passkey list and removal
api/src/me/me.service.ts                                 // NEW
api/src/setlists/voting.core.ts                          // NEW  budget, tally, top-N with ties, 100% covered
api/src/setlists/voting.service.ts                       // NEW  score, open, reopen, close in one transaction
api/src/setlists/voting.repository.ts                    // NEW
api/src/setlists/setlists.schema.ts                      // UPDATE: status + targetSongCount columns and schemas
api/src/setlists/setlists.core.ts                        // UPDATE: resolveSetlistStatus, null reads as locked
api/src/setlists/setlists.controller.ts                  // UPDATE: vote-status, votes, close
api/src/members/members.service.ts                       // UPDATE: delete votes and credential with the member
api/src/songs/songs.service.ts                           // UPDATE: delete votes with the song
api/src/database/migrations/0004_member_accounts_and_votes.sql  // NEW
api/src/app.ts                                           // UPDATE: mount /api/me, gate every router on the member session
site/src/routes/LoginPage.tsx                            // UPDATE: member + password + passkey
site/src/routes/EnrolPage.tsx                            // NEW
site/src/routes/account/AccountPage.tsx                  // NEW
site/src/routes/setlists/SetlistVotePage.tsx             // NEW
site/src/routes/setlists/vote-deck.core.ts               // NEW  pointer position → zone → points, 100% covered
site/src/routes/setlists/SetlistEditorPage.tsx           // UPDATE: open a vote, show the status
site/src/components/organisms/VoteDeck.tsx               // NEW  swipe deck
site/src/components/organisms/VoteTally.tsx              // NEW  totals per song, per member
site/src/components/organisms/VoteClosePanel.tsx         // NEW  proposal, edit, validate
site/src/components/molecules/VoteBudgetBar.tsx          // NEW
site/src/components/atoms/PointsBadge.tsx                // NEW
site/src/routes/setlists/queries.ts                      // UPDATE: vote queries and optimistic scoring
site/src/i18n/{en,fr}.json                               // UPDATE: every new string, both files
apps/pragma/VOCABULARY.md                                // UPDATE: five new terms, account un-forbidden
```

No change under `infra/cdk/**` or `infra/shared/**`, so their 100% coverage gates are
untouched.

### Test strategy

- **Pure functions at 100% coverage.** `voting.core.ts` (budget arithmetic, tally, top-N with
  boundary ties, refusal reasons), `member-session.core.ts` (payload encode and decode, epoch
  mismatch, missing member), `vote-deck.core.ts` (pointer offset to zone, zone to points, the
  gradient value a zone shows at a given offset, budget-exhausted state), plus
  `resolveSetlistStatus` in `setlists.core.ts`. Stryker covers the same files.
- **Back-end end-to-end** against the local Postgres, one per error case above: enrolment
  closing itself, budget exhaustion, scoring a locked setlist, closing with no votes, a
  password change invalidating one member's cookies and not another's, a member deleted with
  their votes, a song deleted with its votes, and a cookie from before the change rejected.
- **Visual validation** drives the five happy-path steps and the edge cases that are visible:
  the budget bar reaching zero and refusing the right zones, a new song appearing mid-vote,
  the tie at the boundary showing more than N rows, reopening a closed vote. These are input
  metrics; neither output metric is in scope for this gate.
- **Pointer.** The deck is driven at 375 px by `scripts/argent.sh gesture-drag`, one run per
  zone, and those runs are part of the visual-validation evidence. A synthetic click alone
  does not count for the deck. What this cannot prove is the difference between a mouse drag
  and a thumb: `gesture-swipe` is not implemented on Chromium and reports success while moving
  nothing, per
  [`argent-gesture-swipe-does-nothing-on-chromium`](../../../../knowledge/argent-gesture-swipe-does-nothing-on-chromium.md).
  The deck listens to Pointer Events, which a mouse drag raises too, so the zone mapping and
  the budget refusal are reachable here; a touch-specific failure, such as the page scrolling
  away with the gesture, is reachable only on a real device and ships as a named gap on the
  pull request.
- **Technical validation** runs lint, knip, typecheck, build and the unit runner, plus a pass
  on the diff against every row of the decision table.
- No manual sweep anywhere in this list.

## Production strategy

### Analytics

**Input metrics**, from named events written to the API log with the member id:

- `vote_opened`, carrying the target song count.
- `vote_scored`, carrying points and whether the budget is now exhausted.
- `vote_closed`, carrying the proposal size, how many rows the band changed, and the share of
  members who had scored.
- `passkey_registered` and `login_succeeded`, carrying the method.
- Thresholds: a vote closes with at least four of five members having scored; the p50 delay
  between `vote_opened` and `vote_closed` stays under seven days; `login_succeeded` by passkey
  overtakes password within a month of the deploy.

**Output metrics**, reviewed by the operator, not gated:

- No practice time spent choosing songs, self-reported after each of the next three concerts.
- The share of the catalogue played at least once over the last three concerts, read from the
  setlists.

### Zero-defect strategy

| Error class | Fires when | Surfaces as |
| --- | --- | --- |
| `enrolment-closed` | the enrolment route is reached after everyone holds a credential | expected, logged at info; an alert only if it fires more than 20 times in 10 minutes, which means someone is probing |
| `session-invalid` | a cookie is missing, expired, signed with the old key, carries no member, or carries a stale epoch | expected for one wave after the deploy; an alert if the rate stays above 20 per hour a day later |
| `budget-exhausted` | a score would exceed the member's remaining budget | expected, shown in the bar, logged at info |
| `not-voting` | a score or a close reaches a setlist that is not in `voting` | a bug in the front end; alert on the first occurrence in production |
| `passkey-verification-failed` | WebAuthn assertion or attestation does not verify | alert at 3 occurrences in 10 minutes |
| `vote-close-conflict` | two members close the same vote at once and the second transaction loses | alert on the first occurrence; the closing transaction must be the only writer of the entries |

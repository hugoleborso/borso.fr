# Bar owner

## Problem

The bars page is the band's small CRM. Every bar is a conversation with a
venue, and today nothing on the record says which band member is carrying
that conversation. Two members write to the same bar, or nobody does.

## Decision

A bar carries an **owner**: the single band member responsible for the
relationship with that venue. The word is `owner`, the column is
`owner_member_id`, and it points at a `member` row.

## Rules

- A bar has at most one owner. The owner is optional, so a bar with no
  owner yet is a normal bar, not an error.
- The owner is picked from the band's members, on the bar form, beside the
  status.
- The list view shows the owner's first name in its own column, and the
  kanban card shows it under the contact line.
- When a member is deleted, the bars they owned lose their owner and stay
  otherwise untouched. Deleting a member must never delete a bar.

## Out of scope

- No per-owner filter or "my bars" view.
- No notification, no reassignment history.

# Outreach message

## Problem

Every booking approach is the same pitch retyped by hand, and the member
who sends it has to remember to sign it with their own phone and email.

## Decision

The band keeps one **outreach template**, editable from the bars page. It
carries three placeholders: `{{bar}}`, `{{phone}}` and `{{email}}`. Each
bar's form has a **copy the personalised message** button, which renders
the template for that bar and the signed-in member's contact details and
puts the result on the clipboard.

## Rules

- The template is a single application-wide value. Editing it and saving
  replaces it for everyone.
- Until someone saves one, the template is the translated default, which
  carries the band's current pitch in the reader's language.
- `{{phone}}` and `{{email}}` come from the signed-in member, filled in on
  the account page. A detail the member has not filled in renders as a
  visible mark rather than an empty gap.
- A refused clipboard is reported in the page, not thrown.

## Out of scope

- No per-bar or per-member variant of the template, and no history.
- No sending: the message is copied, never mailed from the application.

# Adding a bar from the map

## Problem

Adding a bar means retyping what the member is already reading on a map:
the name, the city, the phone number.

## Decision

The bars page carries a **search** box backed by OpenStreetMap's Nominatim
service. Picking a result fills the new-bar form with the name, the city
and the phone number, leaving the member to set the status and the notes.

## Rules

- The search runs through this application's API, behind the same session
  as every other bars route, which is where the one-per-second spacing and
  the cache the service's usage policy requires are enforced.
- The search card carries the OpenStreetMap attribution, which the usage
  policy requires and no test can check.
- Picking a result always prepares a **new** bar, even while another bar
  is open in the form. Nothing is written until the member saves.
- A field the place does not carry is left empty, never guessed.
- A search the service does not answer says so in one sentence, and every
  other part of the page keeps working.

## Out of scope

- No map, no pin, no coordinates stored.
- No duplicate detection against the bars already recorded.
- No enrichment of an existing bar from a place.

# Qualifying a bar

## Problem

Two things decide whether a venue is worth a date, and neither is
recorded: how big a night the place is up for, and what it lends the band
when they play.

## Decision

A bar carries a **concert mood**, one of three, and an **available
support**, any number of three.

- Mood: small and chill, mid-size and a proper gig, or a big ticketed
  concert. A bar nobody has judged yet has no mood, which is not a fourth
  mood.
- Support: PA system, lights, sound engineer. A bar that lends nothing has
  an empty list, which is the default.

## Rules

- The mood is a single choice, the support is a multiple choice, and both
  are set on the bar form beside the status.
- The list view shows the mood in its own column, sortable. The kanban card
  shows it beside the owner.
- A bar recorded before this feature existed reads as no mood and no
  support, not as an error.

## Out of scope

- No filter by mood or by support.
- The support list is fixed at those three; adding a fourth is a code
  change, not a screen.

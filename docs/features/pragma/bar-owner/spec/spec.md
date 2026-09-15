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

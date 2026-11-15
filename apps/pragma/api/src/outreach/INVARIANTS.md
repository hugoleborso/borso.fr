# Invariants — pragma, `api/src/outreach`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Outreach template

- One row, keyed on `OUTREACH_TEMPLATE_ROW_ID`, the way `app_config` is.
  No row means nobody has edited the pitch and the front end renders the
  translated default.
- The body carries three placeholders, `{{bar}}`, `{{phone}}` and
  `{{email}}`, replaced by `renderOutreachMessage` in
  `site/src/routes/bars/outreach-message.core.ts` when a member copies the
  message for one bar. The phone number and the address come from the
  **member** copying it.

Held by: `api/src/outreach/outreach.controller.test.ts` › overwrites the single template row rather than adding a second one
Held by: `site/src/routes/bars/outreach-message.core.test.ts` › falls back when nothing was ever saved
Held by: `site/src/routes/bars/outreach-message.core.test.ts` › names the bar and signs with the member contact details

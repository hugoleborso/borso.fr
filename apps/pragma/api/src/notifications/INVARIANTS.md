# Invariants — pragma, `api/src/notifications`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Notification preference

- Keyed on `(member_id, category)`. A missing row reads as enabled, so a
  member who turns push on gets every category without a write per
  category.
- Deleted with the member.

Held by: `api/src/notifications/notifications.controller.test.ts` › reads every category as on before the member touches one
Held by: `api/src/notifications/notifications.controller.test.ts` › takes their devices and toggles with them

## Push subscription

- One row per push `endpoint`, unique, so a device that subscribes again
  replaces its row rather than adding one. A member with two devices has
  two rows and is notified on both.
- Kept out of every preview's copy of the production schema, so a preview
  never pushes to the band's phones (ADR-2026-10-23T0932).
- Deleted with the member, and when the push service answers that the
  endpoint is gone.

Held by: `api/src/notifications/notifications.controller.test.ts` › keeps one subscription per device, owned by the member who last subscribed it
Held by: `api/src/notifications/notifications.controller.test.ts` › keeps one subscription when a device subscribes twice at the same moment
Held by: `api/src/notifications/notifications.controller.test.ts` › deletes a subscription its push service says is gone, and the write still succeeds
Held by: `api/src/notifications/notifications.controller.test.ts` › takes their devices and toggles with them

## VAPID key pair

- One row, always under id 1. The API generates the pair with `web-push`
  the first time push needs it, inserts it with `ON CONFLICT DO NOTHING`
  and reads back what was stored, so two first uses at the same moment
  keep one pair (ADR-2026-10-23T0932, revision 2026-10-24).
- Kept out of every preview's copy of the production schema, so a preview
  generates its own pair and never signs as production.
- Replacing the pair would orphan every subscription made with the old
  public key, so nothing in the application rewrites the row.

Held by: `api/src/notifications/notifications.controller.test.ts` › is generated on first use, stored, and given unchanged afterwards
Held by: `api/src/notifications/notifications.controller.test.ts` › keeps one pair when two members ask for the first key at the same moment
Held by: `api/src/notifications/notifications.controller.test.ts` › stores the pair once when its first insert loses a conflict

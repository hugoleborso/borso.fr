# Invariants of pragma, in `api/src/gear-items`

The rules the terms of [the vocabulary](../../../VOCABULARY.md) hold in this folder,
and the tests that hold them. A `Held by` path is relative to `apps/pragma/`.

## Gear item

- A gear item belongs to exactly one concert. Every route answers
  `404 not-a-concert` when its session is a practice or does not exist, and a
  write claims the concert in the same transaction as the item
  (`didClaimConcertWithin`).
- `status` is one of `to_find`, `asked_of_venue`, `have`
  (`GEAR_STATUSES` in `domain/gear-status.core.ts`).
- An item is held by exactly one of a member, the venue or nobody:
  `memberId` is set if and only if `status` is `have`. Every write checks the
  pair with `isGearHoldingValid`, and an update sends `status` and `memberId`
  together or neither, else it is refused with `holding-invalid`.
- `memberId` carries no foreign key, because DSQL has none. A write claims
  the member in the same transaction as the item, and deleting a member puts
  every item it held back to `to_find` in the member's deletion transaction.
- An update or a deletion names the concert and the item; an item of another
  concert answers `404 not-found`.
- Deleting a concert deletes its items in the same transaction.
- The device chooses the id of an item it creates, so a retried create lands
  on the same row.
- "Reprendre" copies the label, the status and the holder of every item of
  another concert, and is refused with `gear-not-empty` when the concert
  already holds items. A holder whose member is gone is copied as `to_find`.
  The offered source is the latest concert dated strictly before this one
  that holds items (`selectGearCopySource`).
- The list comes back by `position`, then label, then id. A new item takes
  the next position of its concert.

Held by: `api/src/gear-items/gear-items.controller.test.ts` › answers not-a-concert for a practice and for an unknown session
Held by: `api/src/gear-items/gear-items.controller.test.ts` › refuses have without a member, a member on to_find, and a status without its member
Held by: `api/src/gear-items/gear-items.controller.test.ts` › puts an item back to find when its member is deleted
Held by: `api/src/gear-items/gear-items.controller.test.ts` › never leaves an item held by a member deleted while it was written
Held by: `api/src/gear-items/gear-items.controller.test.ts` › answers not-found for an item of another concert or an unknown id
Held by: `api/src/gear-items/gear-items.controller.test.ts` › deletes the gear of a concert with the concert
Held by: `api/src/gear-items/gear-items.controller.test.ts` › lands a retried create on the same row
Held by: `api/src/gear-items/gear-items.controller.test.ts` › copies labels, statuses and holders from the latest earlier concert holding items
Held by: `api/src/gear-items/gear-items.controller.test.ts` › refuses a copy into a concert that holds items
Held by: `domain/gear-status.core.test.ts` › puts an item back to find when the member holding it is gone
Held by: `api/src/gear-items/gear-items.controller.test.ts` › creates, lists in the order added, updates and deletes an item

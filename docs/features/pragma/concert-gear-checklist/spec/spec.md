# Members tick off a concert's gear, item by item, with who brings it and where it stands

> ⚠️ Missing designer discussion
> ⚠️ Missing tech discussion
> ⚠️ Missing developer discussion

## Perspectives confronted

- [x] **Client / business**: the operator asked for a gear check-list per concert on 2026-11-25, and the free-text gear field shows the need (below).
- [x] **Product**: statuses, owner, replacement of the free-text field and reuse of the last concert answered on 2026-11-25.
- [ ] **Tech-lead**: open.
- [ ] **Developer**: open.
- [ ] **Designer**: four variants on the canvas, pick pending.

## Why

A concert needs the band's own gear, spread over several members' homes. Today a concert holds one free-text `gear` field. In production (measured, 2026-11-25) one concert of eleven uses it: Akanaboum, eleven lines such as "Ampli basse borso" and "Sono nounou". The owner is typed inside the label and nothing says what is already in the car.

- **Output metric:** no concert where a member reports gear forgotten. Not measurable in the app; the operator observes it.
- **Input metric:** every upcoming concert has at least one gear item, and every item has left "À prendre" before the concert starts.

## Result

Design canvas, 375 px wide, with the real capture of today's Details tab and the Akanaboum items: https://claude.ai/artifact/1wcFHZsugRPk2TBHmwD3SQ

- Entry: the Details tab's gear card becomes a summary ("6/11 prêts", a two-tone bar) that opens the dedicated page.
- A · sections by status, a tap on the status icon moves the item to the next status.
- B · grouped by member, a three-way status control on each row.
- C · one list with status filters and a "Moi" toggle.
- D · empty list with "Reprendre <last concert>", and the add sheet (label, who, status).

Variant picked: pending.

Audience: band members signed in to pragma, and assistants holding an assistant grant.

## Use cases / edge cases

Happy path:
1. A member opens a concert, then the gear card.
2. On an empty list, they tap "Reprendre <previous concert>". Every item is copied with status "À prendre", same label, same member.
3. They add "Multiprise", no member, status "À prendre".
4. At home Borso sets "Ampli basse" to "Pris". Every open screen shows it.
5. "Sono" is set to "Prévu salle": the venue provides it.

Edge cases:
- No previous concert holds items: the "Reprendre" button is absent.
- An item's member is deleted: the item stays, shown as the band's.
- A practice has no gear page. Only a concert does.
- Two members change one item at once: the last write wins, and both screens converge through live invalidation.

Error cases:
- Empty or too long label: refused by the API, the sheet keeps the text.
- Item of another concert or unknown id: 404.

## Questions, Options and Decisions

| Question | Options | Decision (date) |
| --- | --- | --- |
| Statuses | À prendre/Chargé/Installé · À prendre/Pris · Manquant/À prendre/Pris | À prendre, Prévu salle, Pris (operator, 2026-11-25) |
| Who brings it | optional member · label only | Optional member; none means the band (2026-11-25) |
| Free-text `gear` field | replaced · kept beside | Replaced; existing lines migrate to items (2026-11-25) |
| Filling a new concert | copy last concert · by hand · band inventory | Optional "Reprendre" of a previous concert (2026-11-25) |
| Where the list lives | dedicated page · inside Details | Dedicated page opened from the concert (2026-11-25) |
| Who creates items | page only · page and MCP tools | Page and MCP tools (2026-11-25) |
| Page layout | A · B · C | pending |
| Migrated Akanaboum lines: status | Pris (concert passed) · À prendre | open |

Out of scope: a band-wide gear inventory, gear on practices, reminders or notifications before a concert, item quantities.

## Architectural choices

No decision needs an ADR so far: no new dependency, secret or external column.

## Changes

### Types / domain model

```ts
type GearStatus = 'to_bring' | 'venue_provides' | 'packed';
interface GearItem {
  id: string;
  sessionId: string;      // a concert
  label: string;          // 1..GEAR_LABEL_MAX_LENGTH
  memberId: string | null; // null: the band
  status: GearStatus;     // default 'to_bring'
  position: number;
}
```

### Database changes

```sql
CREATE TABLE gear_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  label text NOT NULL,
  member_id uuid,
  status text NOT NULL,
  position integer NOT NULL
);
-- data migration: one row per non-empty line of session.gear, then drop session.gear
```

### Records

| Record | Its own record, or part of what | Created from | Operator's answer |
| --- | --- | --- | --- |
| gear_item | own record, belonging to one concert | the concert's gear page, "Reprendre", the MCP tools | page and MCP, 2026-11-25; own-record question pending |

### Files to change

Filled by `/technical-conception` once the variant is picked. Precedent: `api/src/tasks/` (session-scoped rows with a status and an optional member).

### Test strategy

- Unit: status cycle and readiness count in `domain/gear-status.core.ts`, the `gear` text split in the migration helper, at 100%.
- API: controller tests for create, update status, copy from a concert, 404 on another concert's item.
- Visual validation: each happy-path step and edge case above at 375 px.

## Production strategy

- Analytics: none beyond the input metric, read with `scripts/db-read.sh`.
- Zero defect: Sentry on the API routes as for every pragma route; a failed status change rolls back the optimistic update and shows the app's error toast.

# A week before a concert, members see which gear the band has, asks the venue for, or still has to find

## Perspectives confronted

- [x] **Client / business**: the operator asked for a gear check-list per concert on 2026-11-25, and the free-text gear field shows the need (below).
- [x] **Product**: who holds an item (member, venue, nobody) answered on 2026-11-25; statuses (revised 2026-11-25: planned a week ahead, nothing tracked on the day), owner, replacement of the free-text field and reuse of the last concert answered on 2026-11-25.
- [x] **Tech-lead**: the session took this pass after the operator asked for the pipeline on 2026-11-25: one new table and module on the `api/src/tasks/` precedent, a new written root for live invalidation, no ADR trigger, `session.gear` emptied and unused (DSQL refuses `DROP COLUMN`, docs/knowledge/dsql-postgres-compat-gaps.md §10).
- [x] **Developer**: the session took this pass too: the status order and the holder rule are pure functions in `domain/`, every use case below is a controller test or a visual-validation row.
- [x] **Designer**: operator picked A + C on 2026-11-25, sections by status with C's filter chips and "Moi" toggle.

## Why

A concert needs the band's own gear, spread over several members' homes. The band plans gear about a week before the concert (operator, 2026-11-25). Today a concert holds one free-text `gear` field. In production (measured, 2026-11-25) one concert of eleven uses it: Akanaboum, eleven lines such as "Ampli basse borso" and "Sono nounou". The owner is typed inside the label and nothing says what is still missing.

- **Output metric:** no concert where a member reports gear forgotten. Not measurable in the app; the operator observes it.
- **Input metric:** every upcoming concert has at least one gear item, and no item is "À trouver" on the day of the concert.

## Result

Design canvas, 375 px wide, with the real capture of today's Details tab and the Akanaboum items: https://claude.ai/artifact/1wcFHZsugRPk2TBHmwD3SQ

- Entry: the Details tab's gear card becomes a summary ("2 à trouver", a two-tone bar) that opens the dedicated page.
- A · sections by status, a tap on the status icon moves the item to the next status.
- B · grouped by member, a three-way status control on each row.
- C · one list with status filters and a "Moi" toggle.
- D · empty list with "Reprendre <last concert>", and the add sheet (label, who, status).
- Statuses on the canvas: À trouver (empty circle), Demandé à la salle (building), J'ai (filled check, with the member's mark).
- The add sheet asks one question, who has it: À trouver, the venue, or one member's mark.

Variant picked: **A + C** (operator, 2026-11-25), artboard "Retenue · A + C" on the canvas. Sections À trouver, Demandé à la salle, J'ai, in that order. Above them, filter chips Tout / À trouver / Salle / J'ai with counts, and a "Moi" chip that keeps only what the signed-in member has. A tap on an item's mark moves it À trouver → salle → J'ai (held by the member who taps) → À trouver. The member's mark replaces the check icon for J'ai.

Audience: band members signed in to pragma, and assistants holding an assistant grant.

## Use cases / edge cases

Happy path:
1. A member opens a concert, then the gear card.
2. On an empty list, they tap "Reprendre <previous concert>". Every item is copied with its label, its status and its member, to be adjusted.
3. They add "Multiprise", held by nobody yet, so "À trouver".
4. Borso picks his own mark on "Ampli basse": it becomes "J'ai", held by Borso.
5. "Sono" is set to "Demandé à la salle".

Edge cases:
- No previous concert holds items: the "Reprendre" button is absent.
- An item's member is deleted: the item goes back to "À trouver".
- A practice has no gear page. Only a concert does.
- Two members change one item at once: the last write wins, and both screens converge through live invalidation.

Error cases:
- Empty or too long label: refused by the API, the sheet keeps the text.
- Item of another concert or unknown id: 404.

## Questions, Options and Decisions

| Question | Options | Decision (date) |
| --- | --- | --- |
| Statuses | À prendre/Chargé/Installé · À prendre/Pris · Manquant/À prendre/Pris · À prendre/Prévu salle/Pris | J'ai, Demandé à la salle, À trouver. Gear is planned a week ahead; nothing is tracked on the day (operator, 2026-11-25, replacing his earlier À prendre/Prévu salle/Pris) |
| Does "J'ai" carry the member who has it | J'ai sets the member, others have none · member independent of status | Yes. An item is held by exactly one of: a member, the venue, nobody yet. One choice on screen, not a status plus a member (operator, 2026-11-25) |
| What "Reprendre" copies | statuses reset to À trouver · statuses kept | Statuses and holders kept (operator, 2026-11-25) |
| Who brings it | optional member · label only | Optional member; none means the band (2026-11-25) |
| Free-text `gear` field | replaced · kept beside | Replaced in the UI (2026-11-25) |
| Filling a new concert | copy last concert · by hand · band inventory | Optional "Reprendre" of a previous concert (2026-11-25) |
| Where the list lives | dedicated page · inside Details | Dedicated page opened from the concert (2026-11-25) |
| Who creates items | page only · page and MCP tools | Page and MCP tools (2026-11-25) |
| Page layout | A · B · C | A + C: status sections plus C's filters and "Moi" (operator, 2026-11-25) |
| What happens to the existing `session.gear` text | migrate into items · leave it · remove it | Remove it all: the field and its uses; the column is emptied because DSQL refuses `DROP COLUMN`; Akanaboum's text is erased, not migrated (operator, 2026-11-25 and 2026-11-26) |

Out of scope: tracking gear on the day (loaded, installed), a band-wide gear inventory, gear on practices, reminders or notifications before a concert, item quantities.

## Architectural choices

No decision needs an ADR so far: no new dependency, secret or external column.

## Changes

### Types / domain model

```ts
type GearStatus = 'to_find' | 'asked_of_venue' | 'have';
interface GearItem {
  id: string;
  sessionId: string;      // a concert
  label: string;          // 1..GEAR_LABEL_MAX_LENGTH
  status: GearStatus;      // default 'to_find'
  memberId: string | null; // set if and only if status is 'have'
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
UPDATE session SET gear = NULL WHERE gear IS NOT NULL; -- DSQL refuses DROP COLUMN; the text is erased (operator, 2026-11-26)
```

### Records

| Record | Its own record, or part of what | Created from | Operator's answer |
| --- | --- | --- | --- |
| gear_item | own record, belonging to one concert | the concert's gear page, "Reprendre", the MCP tools | dedicated page per concert and MCP tools, 2026-11-25 |

### Files to change

Filled by `/technical-conception` once the variant is picked. Precedent: `api/src/tasks/` (session-scoped rows with a status and an optional member).

### Test strategy

- Unit: status order and the "to find" count in `domain/gear-status.core.ts`, at 100%.
- API: controller tests for create, update status, copy from a concert, 404 on another concert's item.
- Visual validation: each happy-path step and edge case above at 375 px.

## Production strategy

- Analytics: none beyond the input metric, read with `scripts/db-read.sh`.
- Zero defect: Sentry on the API routes as for every pragma route; a failed status change rolls back the optimistic update and shows the app's error toast.

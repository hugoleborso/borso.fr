# The flames show what a member gained, what a missed day costs, and the band's scores

## Perspectives confronted

The operator decided every point below in chat on 2026-11-21 and 2026-11-23, from the canvas of mockups (https://claude.ai/artifact/U78YQjhFwLarvUj4WZCPVN).

- [x] **Product**: keep the `BlazeMark` and `BonfireMark` marks. Keep the week timeline and the jokers, and show when each joker was spent. No "Relancer" (nudge) button, no "moment of the day" screen and no milestone.
- [x] **Designer**: Home variant A, one chip carrying both flames. In the sheet, the band comes first, then each member's score under it. A phone screen or sheet fits 375 x 812, and only a list may run past it.
- [x] **Developer**: the week timeline needs, for the signed-in member, the state of each day of the current Monday-to-Sunday week. The flame walk already decides which days a joker bridged and does not return them.

## Why

The flames do not tell a member anything they can act on (measured on the local app at 375 px, signed in as Hugo, 2026-11-21):

- Opening the app writes the member's presence before `GET /api/streaks` answers (`api/src/streaks/INVARIANTS.md`). So both Home chips always read "today counted" for the member looking at them, and the status line in the sheet never changes.
- The two chips have the same weight and no word. Only the shape of the fire tells "mine" from "the band".
- The big number in the sheet has no unit.
- Jokers are a sentence ("2 jokers left this week"). Nobody can see which day a joker saved.
- The member list is not sorted, and who has not come today shows only as the tone of a 20 px mark.
- The 20:00 push says "Keep your flame" without saying what a missed day costs.

## Result

Home, at 375 px: the title line keeps one chip on its right. The chip holds the Blaze mark and the member's days, a 1 px rule, then the Bonfire mark and the band's days. A tap opens the sheet. Its accessible name says both flames with their units.

The streak sheet, at 375 px, fits inside 812 px with no scroll:

```
Flames                                   [x]
[Blaze 40]  YOUR FLAME
            5 days
 M     T     W      T     F     S     S
[🔥]  [🔥]  [- -]  [🔥]  [🔥]  [🔥]  [  ]
session     joker              today
┌ Jokers · 2 of 3 ─────────────────────────┐
│ (- -)  (●)  (●)        Back on Monday    │
│  Wed                                     │
└──────────────────────────────────────────┘
──────────────────────────────────────────
[Bonfire 40]  THE BAND
              12 days
● Hugo                               🔥 5
● Sarah   not yet today              🔥 3
● Léa                                🔥 1
● Marc    not yet today              🔥 0
```

## Use cases / edge cases

- **Home chip.** One `FlameChip` replaces the two. Each mark keeps its tone rule (`selectFlameTone`). The visible numbers are the two day counts, with no unit. The accessible name is "Your flame, 5 days. Band flame, 12 days." with plural forms.
- **Personal hero.** The Blaze mark at `lg`, the overline "Your flame", and "N days" in the display face, pluralised ("1 day", "0 days"). The line "today counted" and the jokers sentence are gone.
- **Week timeline.** Seven cells, Monday to Sunday of today's `Europe/Paris` week, each under its one-letter weekday in the locale. A cell is one of:
  - `active`: the member was present or a session was dated that day. Blaze `counted`, on `accent-soft`.
  - `joker`: missed, and the flame walk bridged it with a joker. A dashed `ink-faint` border, Blaze `out`, caption "joker" in `ink` and semibold.
  - `missed`: missed and not bridged. An empty cell with a `rule` border.
  - `open`: today, not yet active. Blaze `open`. This shows only to a reader whose presence is not written, such as a test.
  - `future`: after today. An empty cell with a `rule` border and no caption.
  - Today's cell has a 2 px `accent` border and the caption "today". A day carrying a session has the caption "session", unless it is a joker day or today.
  - Each cell's accessible name says the weekday and its state.
- **Jokers.** A card titled "Jokers · L of 3", where L is `jokersLeftThisWeek`. One pip per joker of the week: first a dashed pip for each joker spent, oldest first, each labelled under it with the short weekday of the day it saved ("Wed"), then a filled `accent` pip for each joker left. The card ends with "Back on Monday". The days a joker saved are the `joker` days of this week, so the pips and the timeline always agree.
- **No milestone, no record.** Nothing replaces the milestone card of the mockups. The jokers card takes the full width.
- **Band hero.** A `rule` separator, then the Bonfire mark at `lg`, the overline "The band" and "N days", the same layout as the personal hero.
- **Member scores.** One list, every current member including the reader, sorted by flame days descending, then by first name. Each row shows the member's colour dot (`MemberMark` `dot`), the first name, "not yet today" in `ink-soft` when that member's day has not counted, and the Blaze mark in that member's tone with the day count. Rows are at least 44 px tall.
- **20:00 push.** The at-risk push (`streak-at-risk`, sent when the member's flame is at least `AT_RISK_MIN_DAYS`) names what a missed day costs:
  - with jokers left: title "Your N-day flame is waiting", body "Come by before midnight, or a joker goes. You will have J left.", where J is `jokersLeftThisWeek - 1`;
  - with no joker left, a new key `streak-at-risk-last`: title "Your N-day flame goes out at midnight", body "No joker left this week. Open Pragma before midnight."
  - The band-count pushes are unchanged.
- **Assistant read.** `get_me` keeps its current projection of the flames. It does not gain the week.

## Questions, Options and Decisions

| Question | Decision | Who |
| --- | --- | --- |
| Home layout | Variant A, one chip with both flames | operator, 2026-11-23 |
| Nudge a member ("Relancer") | Not built | operator, 2026-11-23 |
| Moment of the day, milestones | Not built | operator, 2026-11-23 |
| Sheet order | Personal flame, timeline and jokers, then the band, then every member's score | operator, 2026-11-23 |

## Changes

### Types / domain model

In `domain/practice-flame.core.ts`:

```ts
export type FlameDayState = 'active' | 'joker' | 'missed' | 'open' | 'future';

export interface FlameWeekDay {
  readonly day: CalendarDay;
  readonly state: FlameDayState;
  readonly isSessionDay: boolean;
}

export interface PersonalFlame {
  readonly days: number;
  readonly isTodayCounted: boolean;
  readonly jokersLeftThisWeek: number;
  readonly week: readonly FlameWeekDay[]; // Monday to Sunday of today's week, always 7
}
```

`computePersonalFlame` takes the session days as well, or the caller marks them, so `isSessionDay` is known. A `joker` day is a day the walk bridged. A missed day the walk did not bridge, before today, is `missed`.

`GET /api/streaks` returns `mine.week`. Each member's flame may carry it too. `projectStreaksForTool` leaves it out.

### Database changes

None.

### Test strategy

- Domain: the week states for a week with a session day, a bridged gap, an unbridged gap, an open today and future days; a week that starts the flame on Wednesday; a bridged gap that crosses the Monday, where only this week's days appear.
- Reminder core: the at-risk message with jokers left carries `days` and `jokersAfter`; with none left it is `streak-at-risk-last`.
- Site: the Home chip's accessible name; the sheet renders 7 cells with their states, the joker pip labelled with its weekday, the band before the member list, and the list sorted by days.
- The service worker test covers the new template key in both languages.

## Production strategy

### Zero-defect strategy

- The sheet fits 812 px at 375 px wide with four members: checked in a browser at the end.
- The jokers card and the timeline read the same `joker` days, so they cannot disagree.

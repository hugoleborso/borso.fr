---
status: failed
summary: >-
  Verdict FAIL on 40 assertions: 34 PASS, 6 FAIL, 0 UNVERIFIABLE. The lineup
  column, its fixed order, its tints, the +N overflow, the members-plus-two cap,
  the three card tones, the 17 px icons, the generated bass, the 54 px card, the
  24 and 36 px seams and the one-gesture energy meter with pointer capture all
  hold, at 1280 px, at 360 px and under real touch. Six failures: the column
  renders zero slots on freshly migrated data because nothing seeds is_primary;
  at 375x667 only five songs are fully visible, not six; a twenty-character
  title truncates at 360 px while the column keeps 96 px it does not need; and
  a rejected energy write leaves the optimistic value on screen with no failure
  line while the server holds the old one.
artifacts:
  - docs/features/pragma/setlist-density/validation/visual-validation-2026-09-19-0535.md
  - docs/features/pragma/setlist-density/validation/visual-validation-2026-09-19-0535/
next:
  kind: replan
  scope: >-
    lineup-slots day-one primacy seeding; setlist list density at 375x667;
    title-first width allocation in SetlistEntryRow; energy mutation onError
    rollback and failure line
---

## What was driven

The app was started with `pnpm dev` in `apps/pragma`, the dev database migrated
with `apps/pragma/test/setup-postgres.ts` and seeded through
`POST /api/__test/seed`, and every row was checked signed in as `hugo`.

Most rows were driven through `scripts/browser.sh` at 1280x900, 375x812,
375x667 and 360x780. The two rows that are about pressing something with a
thumb — opening the lineup editor from the column, and setting the energy by
press and slide — were driven again with real touch through `scripts/argent.sh`
on its own Chromium, and both hold there too.

## The four defects

1. **The column is empty on day one.** After the migration and the seed,
   `GET /api/instruments` returns every instrument with `isPrimary: false` on
   every player. Slots are drawn from primary instruments, so every lineup
   column rendered zero children and measured 4 px wide, and the member avatars
   the card used to carry are gone. The migration seeds `position` and leaves
   `is_primary` at its default, so an existing band loses the who-plays-what
   signal until someone finds the instruments page and marks a primacy by hand.

2. **Five songs at 375x667, not six.** The list sits between a sticky energy
   chart ending at y=71 and a full-width floating action bar starting at y=550,
   with the tab bar under it. That leaves 479 px for a stack of six cards and
   their seams that needs 528 px. A scan of every scroll position returned a
   maximum of five. The same scan returns six at 375x812 and six at 360x780.
   The spec names the width and not the height, and its own "2.5 before" figure
   is 667 divided by 270, so 667 is the height its arithmetic used.

3. **A twenty-character title truncates at 360 px.** `Twenty Chars Exactly`
   needs 131 px in a box that is 104 px wide. The column had already yielded to
   four slots plus a `+1` marker and stopped there, holding 96 px. The spec says
   the column yields before the title and the title never truncates to feed the
   column; the column has a fixed budget instead.

4. **A rejected energy write is silent.** With the entry PUT aborted, a drag
   from 9 to 7 left the row reading 7, showed no failure line anywhere on the
   page, and the server still held 9 until a reload put it back. The failure
   line the spec points at exists and other mutations use it.

## Evidence

Fourteen screenshots beside the report at
`docs/features/pragma/setlist-density/validation/visual-validation-2026-09-19-0535/`.
The broken-image scan ran after every one of them and came back empty each time.

# pragma draws members, instruments and side actions as marks

## Goal

A musician reads who plays what, and what a button does, from the marks the app
already has, not from words. The operator asked for it after PR #377 and chose
the scope on 2026-11-19: members and instruments everywhere, and the secondary
actions of a crowded action group. Every word that leaves the screen stays as
the element's accessible name, so a screen reader still reads it.

## Rules

1. **Member.** Where a member's avatar, chip or colour dot is shown, their name
   is not written beside it. The mark carries the name as its accessible name and
   as a tooltip (`title`).
2. **Instrument.** Where an instrument is shown and its glyph is specific (not
   the generic `music` glyph, and not shared by two parts on the same row), the
   glyph replaces the name, with the name as accessible name and tooltip.
3. **Lineup sentence.** A lineup change is drawn as the member's mark, then the
   glyphs, never as a sentence. "Tonight: Gui: Batterie" becomes Gui's mark plus
   the drum glyph. "Gui sits out" becomes Gui's mark in its `ring` shape, the
   outline `MemberMark` already draws, with no glyph. Each is read aloud as the
   sentence it replaces.
4. **Crowded action group.** A row of three or more actions side by side shows
   every secondary action as its icon only, with its word as accessible name and
   tooltip. The group's primary action keeps both its word and its icon. A row
   of one or two actions is unchanged.
5. **Words that stay.** Free text the band typed (titles, notes, comments),
   name fields and pickers, the Instruments page, the home greeting, the signed-in
   card, "former member", status words with no icon, and any instrument whose
   glyph is generic.

## What the musician sees

1. The tasks page shows each assignee as their colour mark with no name beside it, and hovering the mark names them on a desktop.
2. The setlist lineup grid's column headers show the avatar only.
3. A setlist row with a change tonight shows the member's mark and the instrument glyphs, not the sentence.
4. The mastery matrix shows instrument glyphs as row headers and avatars as column headers.
5. A song's lineup chips show avatar then glyphs, with no name.
6. A page header with three or more actions shows its primary action as word and icon, and the others as icons.
7. Every screen above works at 375 px wide, and every mark or icon-only button has an accessible name equal to the word it replaced.

## Out of scope

Buttons in a group of one or two keep their word. Status chips with no icon keep
their word. The decision to keep a word on phone through `labelDisplay` stays
where it is today.

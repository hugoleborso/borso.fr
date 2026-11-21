# pragma writes a member's name again where a mark alone hid who it was

## Goal

PR #381 drew members as marks and dropped their written name. On some screens
the mark was a colour dot with no initial, or the name was the row's subject or
a title. A musician could no longer tell who was who. The operator asked on
2026-11-21 to put the name back there, and to drop the useless text instead.

## Rules

1. **Name back.** The name is written beside the mark on the Flames sheet's
   member list, a task's assignee, a setlist row's change tonight, the concert's
   friends per member (form and read view), a member's task column header, the
   "part of" header of a setlist, and the rows of both lineup editors.
2. **Flames sheet.** A member row shows the dot, the name, the flame and its
   day count. The status sentence ("Today counted") is no longer written on
   each member row. It stays as the flame's tooltip and accessible text.
3. **Marks stay alone** in the dense places, where the avatar draws the
   initial: the setlist lineup grid, the mastery matrix, a song's lineup chips
   and the vote tally.

## What the musician sees

1. The Flames sheet lists each member by name, with the flame and the count.
2. Every screen in rule 1 writes the member's first name.
3. Every screen works at 375 px wide.

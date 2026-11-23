# A member's colour dot or ring is hidden from a screen reader

## Goal

A colour dot or ring names nobody, so it never stands for a member's name.
The name is written beside it, and the dot is hidden from a screen reader.

## What the musician sees

1. The Flames sheet lists each member as a dot, then the written first name, the flame and the count.
2. A task row with an assignee shows the dot, then the written first name.
3. A setlist row with a lineup change tonight shows the member's dot (or ring when they sit out), then the written first name.
4. On these three screens, each dot or ring has `aria-hidden="true"`, and the first name is readable text.
5. Every screen above works at 375 px wide.

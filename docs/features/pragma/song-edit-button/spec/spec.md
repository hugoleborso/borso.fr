# A song is edited in one tap from its page

## Goal

A member on a song page opens the song edit form in one tap, as easily as the lineup.

## Problem

Editing the song sat behind the "..." menu in the header. A menu takes two taps and hides the action.

## Behaviour

1. The song page header shows a button labelled "Modifier" in French and "Edit" in English, with a pencil icon, right of the title.
2. Tapping it opens `/catalog/<song id>/edit`, the song edit form.
3. The header has no "..." menu any more.
4. The lineup keeps its own "Modifier" button beside the lineup chips, which opens the lineup editor.
5. At 375 px the header button, the title, the artist and the status chip all show without overlapping or a sideways scroll.

## Acceptance

- On a song page, one tap on the header Edit button shows the song edit form.

## Out of scope

The edit form itself.

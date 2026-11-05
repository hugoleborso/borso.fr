# Pragma improvements batch, November 2026

The band filed these through Groupe > Améliorations. Each item is one user-visible fix in `apps/pragma/site`. There is no plan, because each fix is local to one component.

## Use cases

1. **Rehearsal time.** "Affiche l'heure des répets". Wherever the Sessions list, the session detail header and the Home next-session card show the session's own date, they also show its start time in the band's time zone (Europe/Paris), 24-hour clock, for example `ven. 6 nov. 2026 · 21:00`.
2. **Sheets above the keyboard.** "Permettre aux améliorations de passer au dessus du clavier". On a phone, an open sheet (the improvement form and every other sheet) stays inside the area above the on-screen keyboard, so the focused field and the submit button stay visible.
3. **Tab bar stays pinned.** On iPhone, after a sheet was opened and closed, the bottom tab bar and floating action button stay at the bottom of the screen and do not rise to mid-screen. Opening a sheet must not scroll the visual viewport to reveal its first field.
4. **Empty lineup placeholder.** "Le placeholder lineup est vide". A song with no lineup shows "No lineup yet" / "Pas encore de lineup" with a warning icon in setlist rows, practice mode and the song's Lineup tab, instead of an empty gap or a dash.
5. **Task note height.** "La section n'a pas la height du texte une fois la note sauvegardée puis fermée". A saved note reopened in its textarea fits its text exactly: no clipped lines, no blank space, including after the display web font finishes loading, and borders included.

## Out of scope

- "Le lien deezer est cassé" did not reproduce on main. Every Deezer surface was checked and works.
- "Icône de trombone" is data. The Trombone instrument has no icon and falls back to the same note glyph Chœurs chose. The operator picks the brass icon in the instrument form.
- "Faire le chef d'orchestre" is not an app feature.

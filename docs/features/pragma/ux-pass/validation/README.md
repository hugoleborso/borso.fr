# UX pass — visual evidence

Screenshots and screen recordings at the two widths the repository holds every
page to: a 1280 px desktop and a 375 px phone. Screenshots are named
`<width>-<surface>.png`; each recording ships twice, as the `.webm` the browser
captured and as the `.gif` a pull request can render inline.

They were taken against a local run of this branch, seeded with the preview
fixture (`POST /api/__test/seed`), because the pull request's preview
environment clones production, and its login therefore asks for the production
shared password, which this session does not hold. The preview itself is up and
serving this branch's build: `https://pragma-pr-50.preview.borso.fr` answers
200 and `https://pragma-pr-50-api.preview.borso.fr/api/health` answers
`{"ok":true}`. Re-shooting them on the preview needs nothing but the password.

## Recordings

| File | What it shows |
| --- | --- |
| `add-song` | Adding a song on a phone: the sheet opens on a search field, the title typed matches nothing, and creating it from that same field puts it at the end of the set — where the strip above it reads risky, since a brand-new song has nobody on it yet. |
| `lineup-editor` | Giving Léa a second instrument on one song. The row picks up the override badge and the strip below it recomputes, now naming her guitar among the carriers. |
| `transition-note` | Writing the note on a gap and seeing it land inline on the strip, where the band reads it. |
| `member-filter` | Filtering the set to one member on a desktop: each visible row hoists what that person plays there, `GUITARE + CHANT` included. |
| `mobile-nav` | The bottom tab bar carrying the four stage pages, and the More tab opening the drawer that holds the admin ones. |

## Screenshots

| Surface | What it shows |
| --- | --- |
| `setlist` | The strip on every gap: who can carry the transition, the risky flag when nobody keeps a harmonic instrument, and the note stored on the pair. |
| `setlist-member-filter` | The same set filtered to one member, each row naming every instrument they hold on that song. |
| `transition-note` | The note editor, naming the ordered pair it belongs to. |
| `song-picker` | The add-a-song sheet, including the offer to create the title being typed. |
| `lineup-editor` | One member holding two instruments at once. |
| `song` | The song page: notes, the default lineup with two instruments on one member, mastery per instrument. |
| `song-edit-notes` | The three note fields on the song form. |
| `catalog` | The catalog, with the create path visible on a phone. |
| `catalog-search-create` | A search that matches nothing, offering to create exactly what was typed. |
| `instruments` | The instrument families the transition rule reads. |
| `members` | The band directory and the mastery matrix. |
| `scene` | The stage view, structure and gimmick notes above the chart. |
| `nav-drawer` | The More tab's drawer, where the admin pages live on a phone. |
| `fr-setlist` | The same editor in French, which is the language the band reads it in. |

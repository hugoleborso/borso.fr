# UX pass — visual evidence

Screenshots at the two widths the repository holds every page to: a 1280 px
desktop and a 375 px phone. Files are named `<width>-<surface>.png`.

They were taken against a local run of this branch, seeded with the preview
fixture (`POST /api/__test/seed`), because the pull request's preview
environment clones production, and its login therefore asks for the production
shared password, which this session does not hold. The preview itself is up and
serving this branch's build: `https://pragma-pr-50.preview.borso.fr` answers
200 and `https://pragma-pr-50-api.preview.borso.fr/api/health` answers
`{"ok":true}`. Re-shooting them on the preview needs nothing but the password.

| Surface | What it shows |
| --- | --- |
| `setlist` | The strip on every gap: who can carry the transition, the risky flag when nobody keeps a harmonic instrument, and the note stored on the pair. |
| `transition-note` | The note editor, naming the ordered pair it belongs to. |
| `song-picker` | The add-a-song sheet, including the offer to create the title being typed. |
| `lineup-editor` | One member holding two instruments at once. |
| `song` | The song page: notes, the default lineup with two instruments on one member, mastery per instrument. |
| `catalog` | The catalog, with the create path visible on a phone. |
| `instruments` | The instrument families the transition rule reads. |
| `members` | The band directory and the mastery matrix. |
| `scene` | The stage view, structure notes above the chart. |

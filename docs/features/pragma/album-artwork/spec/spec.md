# A song is recognised by its cover, not read by its title

## Why

Seventy-five songs in the catalogue, all rendered as two lines of text. Finding one
means reading; scanning a setlist on stage means reading; a vote deck asks a member to
judge a song from its title alone. A cover is recognised in a glance, which is the one
thing a title cannot do.

**Measurable objective:** the time to find a known song in the catalogue. The vote deck
is where it shows first, because that screen asks for one judgement per card.

Field observation: the vote rounds run during this feature's own validation were driven
entirely by reading titles, and the operator asked for covers while using the deck —
*"ce serait top de voir les pochettes d'album dans le catalogue / les setlist"*.

## Result

A square cover on every song, at four sizes:

- the catalogue card, beside the title
- the setlist entry row
- the vote rows and the swipe card
- the song detail page, larger, beside the title

A song with no cover renders a coloured tile carrying its initials, so no row changes
height and no grid gains a hole.

## Use cases / edge cases

1. A song imported from MusicBrainz carries the release it came from, and its cover is
   drawn from Cover Art Archive.
2. A song typed in by hand, or imported before this feature, carries no release: the
   initials tile is what shows.
3. Cover Art Archive has no artwork for a release it knows: the image 404s and the
   component falls back to the same tile, in place, with no layout shift.
4. Cover Art Archive is unreachable: same fallback, and nothing else on the page waits
   on it, because the image loads lazily and out of band.
5. A member re-picks a different MusicBrainz release on an existing song: the new
   release id replaces the old one and the cover follows on the next render.

## Questions, Options and Decisions

**Where does a cover come from?** (2026-09-15) — *Cover Art Archive, automatic.* The
MusicBrainz import already fetches a `releaseId` and throws it away; persisting it costs
one nullable column and gives every imported song a cover with no work per song.
Rejected: an upload-only path (seventy-five uploads), and automatic-plus-override (an S3
key and an upload control for a case that has not come up yet).

**Who fetches the image?** (2026-09-15) — *The browser, straight from Cover Art
Archive.* A plain `<img>`: no API route, no bucket, no cost, and the PWA's HTTP cache
keeps what has been seen. Rejected: caching into S3, which survives Cover Art Archive
going down and fits the offline manifest, but buys that with a fetch path, a bucket key
and a staleness question the band does not have yet. Revisit if covers are missing on
stage.

**What shows when there is no cover?** (2026-09-15) — *A coloured tile with the song's
initials*, tinted from a hash of the title, which is what the app already does for member
avatars. Rejected: one generic placeholder (a wall of identical tiles), and nothing at
all (the layout shifts between songs).

**Out of scope:** uploading a cover by hand, choosing between several releases' artwork,
full-size artwork on the stage view, and any caching of the image on the server.

## Changes

**Types / domain model.** `Song` gains `releaseId: string | null` — the MusicBrainz
*release* the recording was imported from, distinct from `mbid`, which is the recording
itself. One release has one front cover; one recording can appear on many releases.

**Database.** `0005_song_release_id.sql` adds `release_id text` to `song`, nullable, per
the DSQL rule that `ADD COLUMN` takes no constraint and no default.

**Files.**

| Path | State |
| --- | --- |
| `api/src/database/migrations/0005_song_release_id.sql` | NEW |
| `api/src/songs/songs.schema.ts` | UPDATE — column and zod field |
| `api/src/songs/songs.repository.ts` | UPDATE — projection, insert, update |
| `api/src/songs/songs.service.ts` | UPDATE — create mapping |
| `site/src/lib/cover-art.utils.ts` | NEW — URL builder, initials, tint |
| `site/src/components/atoms/AlbumCover.tsx` | NEW |
| `site/src/components/atoms/album-cover.variants.ts` | NEW |
| `site/src/components/organisms/SongCard.tsx` | UPDATE |
| `site/src/components/organisms/SetlistEntryRow.tsx` | UPDATE |
| `site/src/components/molecules/VoteCatalogRow.tsx` | UPDATE |
| `site/src/components/organisms/VoteDeck.tsx` | UPDATE |
| `site/src/routes/catalog/SongDetailPage.tsx` | UPDATE |
| `site/src/routes/catalog/song-draft.core.ts` | UPDATE — carry the picked release |

**Test strategy.** `cover-art.utils.ts` is pure and ships at 100% coverage and 100%
mutation score: the address built for a release, the escaping of what a release id could
carry, the absence of an address for a song with no release, the initials taken from a
title including a punctuated one, and the exact colour a given title hashes to. The
fallback on a failed image load is a visual-validation row, driven by pointing a song at
a release id that does not exist. No manual sweep.

## Production strategy

**Analytics.** None wired: this app has no analytics and adding one for a cover would be
the first. The signal to watch instead is the share of catalogue songs carrying a
`release_id`, readable with one query.

**Zero-defect strategy.** There is no error class to raise. An image that fails to load
is an expected state, not a fault, and it is handled in the component rather than
reported. The one failure worth noticing is *every* cover failing at once, which means
Cover Art Archive is down and which the band sees directly.

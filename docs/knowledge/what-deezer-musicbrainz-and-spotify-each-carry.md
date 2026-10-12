# What Deezer, MusicBrainz and Spotify each carry

Every fact here was probed live on 2026-09-15 and 2026-09-16 from this sandbox.
The three services overlap enough that it is easy to assume one carries what
another does. They do not, and the gaps decide features.

## The table

| Field | Deezer | MusicBrainz | Spotify |
| --- | --- | --- | --- |
| Search without a credential | yes | yes | no |
| ISRC | one, on each search hit | searchable, one-to-many | searchable via `isrc:` filter |
| Album cover | yes, by album id | via Cover Art Archive | yes |
| Duration | seconds | milliseconds | milliseconds |
| Popularity | `rank`, roughly 0–1,000,000 | none | `popularity` 0–100 |
| BPM | yes, partial | no | withdrawn |
| Musical key | no | no | withdrawn |
| Release year | no | yes | yes |
| Tags / genres | no | yes | partial |

## Search relevance, measured

This was the criterion that decided the move from MusicBrainz to Deezer, and
neither ADR on the subject scored it. Measured on 2026-10-04 from this sandbox.

**Method.** Twenty queries of the kind a band or a room types: an artist and a
title run together, a title alone, a typo, missing apostrophes, French songs.
Each query went to both services, with the top ten results as returned and no
ranking of our own on top. A query counts as found when a row's title and
artist both match the original recording, case and accents folded.

- Deezer: `GET https://api.deezer.com/search?q=<query>&limit=10`
- MusicBrainz: `GET https://musicbrainz.org/ws/2/recording?query=<query>&limit=10&fmt=json&dismax=true`,
  with the `dismax` parser the old adapter used

| Result | Deezer | MusicBrainz |
| --- | --- | --- |
| Original ranked first | 19 / 20 | 0 / 20 |
| Original in the top three | 19 / 20 | 4 / 20 |
| Original missing from the top ten | 0 / 20 | 9 / 20 |

Rank of the original per query, where a dash means it was not in the top ten:

| Query | Deezer | MusicBrainz |
| --- | --- | --- |
| beggin maneskin | 1 | 3 |
| smells like teen spirit | 7 | - |
| valerie amy winehouse | 2 | 6 |
| uprising muse | 1 | - |
| wonderwall | 1 | 2 |
| bohemian rapsody | 1 | - |
| dont stop me now | 1 | - |
| get lucky | 1 | - |
| sweet child o mine | 1 | - |
| la boheme aznavour | 1 | 3 |
| seven nation army | 1 | - |
| mr brightside | 1 | 2 |
| dancing queen | 1 | 8 |
| superstition stevie wonder | 1 | - |
| alors on danse | 1 | 2 |
| highway to hell | 1 | 4 |
| hey jude | 1 | 2 |
| take on me | 1 | - |
| le sud nino ferrer | 1 | 2 |
| feeling good nina simone | 1 | 7 |

**Why the gap is structural.** MusicBrainz is an editorial database in which
every recording counts the same: a karaoke cover, a brass band version and a
mashup sit beside the original, and MusicBrainz publishes no popularity figure
to tell them apart. Typing *uprising muse* returned a brass band, then two
*Muse vs. Backstreet Boys* mashups. A typo is matched literally, so *bohemian
rapsody* found covers whose titles carry the same typo. Deezer orders by
listening, so the song a person has in mind comes first.

**Where Deezer is weaker.** Rows for one song repeat as live takes, remasters
and remixes; for *mr brightside* the top three were all remixes and live takes,
with the studio version fourth. A title typed without its artist can lose to
covers: *smells like teen spirit* put Nirvana seventh. The first problem is
what [ADR-0019](../adr/0019-the-room-search-collapses-masters-into-songs.md)
collapses.

**Limit of this measurement.** The old adapter fetched 25 MusicBrainz rows and
reordered them with its own ranking (commit `a769622`), which guessed fame from
release, ISRC and tag counts and fixed several of these cases. No ranking can
promote a recording the source did not return, and for 9 of these 20 queries it
was not in the first ten.

## Deezer needs no key, and carries a BPM nobody expects

`https://api.deezer.com/search?q=&limit=25` and the album image endpoint are
public. No token, no registration.

`https://api.deezer.com/track/<id>` carries a `bpm` field. It is real, and it
is partial:

| track | bpm |
| --- | --- |
| Lose Yourself | 171.6 |
| Without Me | 112.3 |
| Harder, Better, Faster, Stronger | **0** |

**`0` means Deezer has no analysis for that track, not that the track has no
tempo.** It is a plain number, not a null, so a client that stores it as-is
will show a zero-BPM song. Map `0` to absent at the boundary.

`bpm` is on the single-track endpoint, not on search hits — reading it costs one
extra call per song.

### Deezer answers 200 to requests it refused

The refusal is stated only in the body, and the body has a different shape from
a result:

```json
{ "error": { "type": "DataException", "code": 800, "message": "no data" } }
{ "error": { "type": "Exception",     "code": 4,   "message": "Quota limit exceeded" } }
```

`response.ok` is `true` for both. Code `800` is an unknown record; code `4` is
an exhausted quota, and the two need different answers — an unknown track is a
fact about the track, an exhausted quota is a fact about the moment.

An adapter that checks the status alone reports both as *no results*, which is
the same answer a search gives when the song genuinely does not exist. A room
that exhausts the quota during a concert is then told the band has no
catalogue, and tries again, which is exactly what a throttled service does not
want. Read the payload as well as the status, and give the caller an outcome
union it cannot ignore.

Measured 2026-09-16.

### Deezer indexes masters, not songs

Typing what a room types — `nirvana smells like teen spirit` — returned six
rows all reading *Smells Like Teen Spirit — Nirvana*, carrying **five
different ISRCs**: a remaster, three live takes and a compilation cut.

Nothing upstream marks them as one song, because upstream they are not one
song. An ISRC identifies a recording, and these are five recordings. To a room
they are one song, and six rows take six shares of one vote.

So the ISRC is an exact join and an insufficient one. Collapsing on a folded
title and artist after ranking, keeping the first row, took that query from 25
rows to 13. The cost is that a spectator who genuinely wants the Reading live
take can no longer ask for it — acceptable where a band plays its own
arrangement anyway, and not acceptable in a catalogue's own search, where
losing a named version loses information.

Measured 2026-09-16. See [ADR-0019](../adr/0019-the-room-search-collapses-masters-into-songs.md).

## MusicBrainz has no tempo and never did

An ISRC does resolve:

```
GET /ws/2/recording?query=isrc:USQX91300108&fmt=json
→ count: 2, both "Get Lucky", Daft Punk feat. Pharrell, score 100
```

Note the **two** hits for one ISRC — the second is a "Dolby Atmos mix"
disambiguation. An ISRC is not a unique key into MusicBrainz recordings.

There is also a dedicated `/ws/2/isrc/<isrc>` lookup, which answered *"The
MusicBrainz web server is currently busy"* on the probe; the search index above
is the one to use anyway.

What MusicBrainz does **not** have is key or tempo. Those lived in
**AcousticBrainz**, a separate project that stopped accepting submissions in
2022. Reaching for MusicBrainz to get a song's key or BPM is reaching for
something that was never there.

MusicBrainz *does* carry release year and tags, which is what a Deezer-based
search gives up.

## Spotify answers nothing anonymously, and dropped its analysis

Search needs a token. The client-credentials flow (`POST
accounts.spotify.com/api/token` with a Basic header) gets one for an
application rather than a user: it reads the public catalogue and can touch no
account, no library and no playback.

Spotify's search supports an `isrc:` filter, which turns "find this on Spotify
too" into an exact join rather than a fuzzy title match — the reason `pragma`
stores an ISRC at all.

The `audio-features` endpoint that used to carry key, tempo, danceability and
the rest was deprecated in November 2024. Do not plan a feature on it.

## What this means for pragma

- Search and covers are Deezer, and need no secret.
- A Spotify link is exact when the ISRC resolved and a search page otherwise;
  see [`spotify-credentials-for-pragma`](./spotify-credentials-for-pragma.md).
- A song's key is hand-entered (`tonalityStart` / `tonalityEnd`), which is
  correct for a band: the key you play it in is not the key the record is in.
- There is no tempo column. Deezer is the only one of the three that could fill
  one, partially, at one call per song.
- The audience search collapses masters and reads Deezer's in-body refusals as
  refusals. Both are in the section above, and both were found by probing the
  live API rather than by reading its documentation, which states neither.

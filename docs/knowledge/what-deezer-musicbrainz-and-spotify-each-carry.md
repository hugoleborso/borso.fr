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

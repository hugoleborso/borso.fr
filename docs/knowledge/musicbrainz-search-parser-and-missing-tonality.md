---
date: 2026-08-20
introduced-at: apps/pragma/api/src/songs/
detected-at: implementation
severity: low
related-pr: https://github.com/hugoleborso/borso.fr/pull/76
fix-commit: n/a (two properties of the source that shape the adapter)
time-to-detect: hours (an empty result set looks like a bad query)
tags: [pragma, musicbrainz, search, vendor-quirk]
---

# MusicBrainz: use the `dismax` parser, and do not expect a key

`pragma` enriches its song catalogue from MusicBrainz through
`songs/musicbrainz.adapter.ts`. Two properties of that source are not visible
from the code and are worth knowing before changing the query or the mapping.

## 1. The default parser will not find what a user typed

MusicBrainz' default query parser is Lucene's, which reads a search box entry
as a **strict field query**. Given the sort of thing a person types — an
artist and a title run together, no field names, no quoting — it misses the
recording entirely and returns nothing.

The adapter therefore asks for **`dismax`**, MusicBrainz' forgiving parser,
which is built for exactly this input. An empty result set after a query
change is the first thing to check: it usually means the parameter was
dropped, not that the recording is absent.

## 2. Tonality cannot come from here

The catalogue's `tonalityStart` / `tonalityEnd` are entered by hand rather
than enriched, and that is not an oversight. MusicBrainz carries key
information only on **`work`** entities, and sparingly even there. It is
never on a **`recording`**, which is what a search returns. Coverage for
pop and rock is close to zero.

So there is no mapping to write, and adding one against `recording` would
silently produce nulls. A future source for this would be a service that
indexes audio features rather than metadata; GetSongBPM is the candidate
noted at the time.

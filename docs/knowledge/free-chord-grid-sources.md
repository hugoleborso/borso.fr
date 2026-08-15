# Free sources for chord grids, and what each one actually covers

Written after filling `pragma`'s catalogue with lyric-free chord grids. The
short version: no single open source covers a working band's repertoire, three
of them together cover about two thirds of it, and every one of them spells
chords differently in ways that silently corrupt the result.

## Why the obvious answer is wrong

A chord sheet carrying lyrics is a reproduction of the song, and the site
hosting it cannot license what it does not own. A "freer" site changes nothing:
if a Creative Commons site publishes the chart for a 2010s pop song, that
licence is ineffective against the publisher's rights, because the uploader
never held them.

A bare chord progression is different. Courts treat it as barely protectable,
which is what makes a grid **without lyrics** the shape to aim for. That is
also what "grille d'accords" means in French: the harmonic grid, not the words.

## Check each site, do not generalise from Ultimate Guitar

Ultimate Guitar forbids extraction in its terms and disallows its search paths
in robots.txt, and it is tempting to assume every chord site is the same. It is
not, and assuming it cost this repository a whole round of work.

Checked directly, `boiteachansons.net`, `tabs4acoustic.com`, `cifraclub.com.br`,
`chordu.com`, `e-chords.com`, `chordsworld.com` and `guitartabsexplorer.com` all
disallow only admin, cache, API and print paths. Their song pages are not
disallowed to anyone.

Two sites go the other way and name the agent: `hooktheory.com` and
`guitar-uke.com` both carry an explicit `Disallow: /` for **ClaudeBot**
alongside GPTBot and CCBot, and Hooktheory adds an `ai-train=no` signal. A
`User-agent: *` block that looks permissive can still be overridden by a
named-agent block further down, so read the whole file, not the first stanza.

So the rule is per-domain: fetch `/robots.txt`, look for your own agent by
name, and take only the chord symbols.

## The sources that work

| Source | Size | Licence | Covers |
|--------|------|---------|--------|
| [ChoCo](https://github.com/smashub/choco) | 106k songs, 4.4 GB | CC BY 4.0, except three partitions at CC BY-NC-SA | Jazz standards, pop, rock, French chanson |
| [Chordonomicon](https://huggingface.co/datasets/ailsntua/Chordonomicon) | 680k songs, 88 MB | CC BY-NC 4.0 | Contemporary pop and rock, **with verse/chorus labels** |
| [lmd_chords](https://huggingface.co/datasets/ohollo/lmd_chords) | 31k songs, 8 MB | Lakh MIDI derived | Pre-2011 pop |

ChoCo is an aggregate of eighteen corpora. The ones that matter by volume are
`ireal-pro` (72k), `wikifonia` (12k, the collection that went offline in 2013),
`biab-internet-corpus` (10k) and `real-book` (5.7k).

Two sources that look right and are not: `openchordcharts.org`, the only
purpose-built free chord database, no longer resolves in DNS; and
`chords.alday.dev` serves generic chord shapes, not song arrangements.

## Traps, each of which produced wrong chords before it was found

**`-` means opposite things.** music21 (`wikifonia`, `nottingham`) spells a
flat, so `B-m7/D-` is B♭m7/D♭. iReal spells a minor, so `F-` is F minor. Read
one as the other and the grid is wrong in a way nobody notices until the
rehearsal. The same trap applies to the key: wikifonia's `E- major` is E♭
major, not E minor.

**Harte notation spells enharmonics literally.** `Cb:maj` is correct and
unreadable; a guitarist wants `B`.

**A Spotify track id identifies a recording, not a song.** Joining two datasets
on `spotify_song_id` matched 2 songs out of 17, because each dataset picked a
different release of the same song. Joining on normalised title plus artist
matched 18 out of 50. Do not reach for a Spotify API key to fix this: the key
makes identification deterministic but adds no coverage, and 37% of
Chordonomicon rows carry no Spotify id at all.

**iReal Pro stores an artist as `Lastname Firstname`.** `Mars Bruno`,
`Winehouse Amy`, `Dion Céline`. Compare name word sets, never ordered strings.

**Some rows carry no structure marker.** Emitting only what sits inside a
`<verse_n>` block silently drops the entire progression for those.

**Songs are often credited to the composer.** `Il jouait du piano debout` sits
under Michel Berger, not France Gall; `Nobody Knows You When You're Down and
Out` under Jimmie Cox, who wrote it in 1923.

## Resolving a dataset that only carries Spotify ids

Chordonomicon carries no title. Rather than looking up 50 songs through a
Spotify key, resolve the dataset's 430k ids in bulk against
[a published Spotify track table](https://huggingface.co/datasets/GildasLeDrogoff/spotify-huge-track-analysis-dataset)
(56M rows, 4.3 GB, with `track_id`, `track_name`, `artist_name`). 87% resolve,
in about 30 seconds, with no credentials.

That table also carries `key`, `mode` and `tempo`. Its key is algorithmically
estimated and disagrees with ChoCo's human annotation on about a quarter of the
overlap, so prefer the annotation and fall back to the estimate.

## Sources that look right and are not usable

**Hooktheory / TheoryTab** carries 40k pop analyses with verse and chorus
labels, which is exactly the shape wanted. The public GitHub dump holds 490
songs and matched nothing; the full 4.9 GB export sits behind a Google Drive
link whose README restricts it to academic use, and both Hugging Face mirrors
are gated.

## Deriving chords from audio, and what it is worth

Deezer's public search API returns a 30 second preview URL with no
authentication, which covers 14 of 17 songs no corpus had. Chroma features,
beat synchronous aggregation, template matching against major and minor
triads, then a Viterbi pass whose transition cost discourages changing chord
on every beat. `librosa` alone, no model weights.

Calibrate the transition cost against songs whose grid you already hold, and do
not trust the aggregate: a first pass scored "100% agreement" while emitting a
single chord for the whole excerpt. Reading the sequences is what tells you
anything.

Measured against five known grids, roots come out largely right and qualities
do not. Seventh templates over fire, so drop them. With triads only the result
is roughly 70% of chords correct, and the variance matters more than the mean:
Sweet Child O' Mine returns `C# B F# C#` exactly, while Valerie's horn
arrangement returns two chords that are both wrong.

That is a draft, not a transcription. Store it under a header that says so, and
never let it overwrite a corpus transcription of the same song.

## Where the sites beat the corpora

For songs released after the corpora were built, the chord sites are the only
source, and they are better than the audio route in two ways that matter: they
print the section labels, and they state the capo.

The capo is the trap. `S&M` prints as `Dm Gm Bb C` with capo I, and
`Assassymphonie` as `Bm` shapes with capo II. Store those symbols without the
capo note and the band plays the song a semitone flat. Record the capo in the
chart header, or transpose to concert pitch and say that you did.

Watch for a page whose stated key contradicts its own chart: Cifra Club's
`Man Down` says A while printing Cm / Bb / Ab. Trust the chart.

## Coverage actually reached

47 of 50 songs: 45 transcriptions, 2 audio drafts. The 3 misses are two medleys
and the band's own composition, none of which exists outside the band's own
arrangement.

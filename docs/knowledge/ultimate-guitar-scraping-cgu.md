# Don't scrape Ultimate Guitar for chord charts — CGU §2.6 forbids it

Pragma's spec Q.O.D. flags an OCR-assist path for chord-chart import
and explicitly **excludes** automated ripping from Ultimate Guitar.
This entry exists so a future session doesn't re-propose the rip as a
"quick win".

- **Ultimate Guitar's Terms of Use (§2.6)** prohibit automated access /
  scraping / bulk extraction of their tab + chord content. Building a
  scraper into pragma would put the app in breach.
- **Sanctioned import paths in pragma**, in order of preference:
  1. **Manual paste** of ChordPro text into the song form (the primary,
     always-legal path).
  2. **File upload** (PDF / image) of a chart the band already owns,
     stored via the presigned-S3 flow.
  3. **OCR-assist** on an uploaded image (deferred Q.O.D. item) — operates
     on a file the user supplied, not on scraped third-party content.
- **Metadata enrichment** (title / artist / album / duration / tags) goes
  through MusicBrainz, which is explicitly open for this use. That is the
  place to add "fill as much info as possible", not a tab site.

If a tonality/BPM source is wanted later, evaluate providers on their
API terms first (GetSongBPM was trialled then dropped — its free tier
requires a server-rendered backlink that a SPA's JS-injected link
doesn't satisfy; see the round-16 revert).

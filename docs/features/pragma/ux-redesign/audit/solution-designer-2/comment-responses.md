# Answers to the operator's comments on the deck

One answer per comment. Slide numbers follow `coordinator/deck/project/deck.json`. Details and target metrics are in `proposals.md`; mockups are in `mockups/`.

## Slide 16, setlist editor

**"Almost perfect, but I want my lineup view. The lineup changes a lot from one song to the next in pragma."**
Added a **Lineup** view to the setlist (proposal A11, `mockups/compare-lineup.png`). A segmented control under the title switches between Songs, Lineup and My part. The Lineup view is a grid: one row per song, one fixed column per member, and in each cell the instrument glyphs in that member's colour, as today's lineup strip draws them. A cell is shaded when that member's part changes from the song before, so the many changes are visible at a glance. Tapping a cell opens that song's sheet on its lineup; tapping a member opens their part. It needs no new data.

**"And I want to be able to toggle an energy curve somehow, to choose the order of the songs. Maybe it is another screen."**
I chose another screen, **Order** (proposal A12, `mockups/compare-order.png`), opened from a button next to "Add songs". It shows the curve above short 44 px rows, and the curve redraws while you drag a song, so you see the effect before dropping it. A chip in its header turns the curve off. I did not put a toggle on the main list because there each row grows with its notes, so the curve could not line up with the songs, and it would bring back the pinned chart that pushed the first song to 40% of the screen. Decision D7 is revised accordingly: the chart stays, out of the default list.

## Slide 17, session page

**"We don't care about the key here."**
Removed. The setlist preview on the session page now shows the cover, the title, the lineup avatars and a "no lineup" warning, with no key (proposal A4, `mockups/compare-session.png`). The key stays on the setlist itself.

**"What does Talk mean here?"**
Renamed to **"Messages about this practice"** ("about this concert" on a concert). It holds the band's written messages about that one session: who is late, what to run first, a question about a song. It is a thread attached to the session, not a general chat. A message button sits next to "Start the practice". See `mockups/after-session-messages.png`.

## Slide 18, entry bottom sheet

**"I want to see the song's cover."**
Added. The sheet header shows the album cover at 72 px, with the title, the artist and the length (proposal A5, `mockups/compare-entry-sheet.png`). Covers also appear on the setlist rows, the session preview and the new "Add songs" sheet.

**"Never a button without an icon."**
Applied to every mockup and written into the proposals as a rule for every screen, matching hard rule 1 of `design-system/DESIGN.md` (the `icon` prop of `Button` becomes required). In this sheet: Close (`close`), Use the song's (`swap`), Record a take (`mic`), Open the song (`song`). Four glyphs this pass needed are not in DESIGN.md's verb table yet: `reorder`, `swap`, `message`, and `song` as a button icon. They should be added before building.

## Slide 20, song page

**"Not sure we add a song to a setlist from there; we do it from the setlist, all at once."**
Removed "Add to a setlist" from the song page (proposal A8, `mockups/compare-song.png`). Its main action is now **Record a take**, and a line of text says which setlists the song is already in. Adding happens from the setlist with a new **Add songs** sheet (proposal A13, `mockups/compare-add-songs.png`): search and filter chips, tap several songs (each shows its picking number), songs already in the set are marked and cannot be picked twice, then one "Add 3 songs" button at the bottom. The same sheet opens from the session page and creates the session's setlist if it has none.

# Benchmark of musician and band apps, by pattern

Author: bench-musician. Date: 2026-10-25.

## How to read this

This benchmark looks at how other musician apps solve the jobs the operator cares about most: preparing setlists for concerts and practices, agreeing who plays what, noting transitions, taking notes, recording songs and talking about them, and then growing the catalogue and learning new songs with low-effort chords.

It is organised by pattern, not by app. Each pattern says what problem it solves, which apps do it and how, which pragma job it serves, what pragma already has, and whether an installed web app (PWA) on iPhone and Android can do it.

**All evidence comes from public material.** I could not sign in to any of these apps. The sources are official help pages and manuals (BandHelper, OnSong, forScore, SongbookPro, Planning Center, Ultimate Guitar, ChordPro), App Store listings, and a few third-party reviews. Where only marketing copy supports a claim, I say so. Feature names and menus may have changed since the pages were written.

**No screenshots were downloaded.** App Store and vendor screenshots are copyrighted, and none of the pages I read grants reuse. Each pattern links the page where the screens or steps can be seen instead.

**What pragma already has** was checked against `apps/pragma/VOCABULARY.md` and a few files under `apps/pragma/site/src/` in this session. It is a quick check, not a full audit of the screens. The other agents of the team cover the screens themselves.

Two words used below:

- **Setlist entry**: one song in one setlist, with its own notes, key, capo, energy and lineup for that night (pragma's own word).
- **Lineup**: who holds which instrument on a song (pragma's own word).

---

## Part A. Preparing and running setlists (priority 1)

### A1. Build a setlist by picking from the catalogue in one full-screen sheet

**Problem it solves.** Adding songs one by one, with a search and a confirm each time, is slow and pushes the list being built off screen.

**Who does it and how.**

- BandHelper opens an "Add Songs" window from the setlist's edit page. The window can be searched and sorted (for example by key), songs are added in the order they are tapped, and songs already in the list are shown faded but can still be added again. It can also copy a run of songs from an older setlist. Source: [BandHelper, Building set lists](https://www.bandhelper.com/tutorials/building_set_lists.html).
- forScore opens a full-screen editor with the setlist on one side and the library on the other. One tap on a library item adds it, and a checkmark adds every listed item at once. Source: [forScore, Setlists](https://forscore.co/documentation/setlists).

**Pragma job served.** Select songs for a concert or a practice.

**What pragma has.** A setlist editor exists (`SetlistEditor.tsx`). Whether adding songs is a single multi-select sheet or one-at-a-time was not checked by me; the screen agents should compare against this pattern.

**PWA feasibility.** Fully possible on iOS and Android. It is ordinary layout. The sheet must own the only scrolling area on screen, so the page behind it must not scroll too (this is the "double scroll" the operator complains about).

### A2. Reorder by dragging a handle, plus a "move to" menu for long moves

**Problem it solves.** Dragging a song from position 2 to position 18 on a phone is painful. A menu that moves a song to a named place avoids long drags.

**Who does it and how.**

- BandHelper: drag the grip at the right end of a row (on Android, hold it briefly first). Each song also has a three-dot menu to move it to another set, and "Move Multiple Items" moves several at once. Source: [BandHelper, Building set lists](https://www.bandhelper.com/tutorials/building_set_lists.html).
- forScore: drag by the three-line handle in edit mode, or press and hold a row to drag it without edit mode. Source: [forScore, Rearranging items with drag and drop](https://forscore.co/kb/rearranging-items-with-drag-and-drop/).

**Pragma job served.** Define the order of the setlist.

**PWA feasibility.** Drag with touch works in both browsers through pointer events. Long-press on iOS can trigger text selection or the system callout, which must be turned off on the handle. Haptic feedback when a row is picked up is not available on iOS: Safari has no Vibration API, and the known workaround (a hidden switch input) is unofficial and may already be broken in recent iOS versions. Sources: [Ionic issue on iOS haptics](https://github.com/ionic-team/ionic-framework/issues/29942), [Web haptics on iOS Safari](https://azukiazusa.dev/en/blog/ios-safari-web-haptics). Android Chrome supports `navigator.vibrate`.

### A3. Several sets inside one setlist, with breaks and a running time

**Problem it solves.** A real concert is two or three sets with breaks. The band needs to know whether the set fits the time the bar gave them.

**Who does it and how.**

- BandHelper: "Add a Break" starts a new set, and songs can be dragged between sets. Durations come from each song, with a default for songs without one, and breaks, pauses and gaps between songs can be timed too. A projected end time can be shown, and a break timer counts down. Source: [BandHelper, Building set lists](https://www.bandhelper.com/tutorials/building_set_lists.html).
- SetList Pro Music updates the total set length as songs are added, removed or reordered (App Store listing, marketing copy). Source: [SetList Pro Music](https://apps.apple.com/app/id6751470024).
- A Set List Maker user review says entering durations gives reasonable set length estimates. Source: [Set List Maker on the App Store](https://apps.apple.com/us/app/-/id410496349).

**Pragma job served.** Prepare a concert setlist that fits the slot.

**What pragma has.** Songs carry `durationSeconds` from Deezer. I did not find a set break or a total time in the setlist screens. This is cheap to add because the durations already exist.

**PWA feasibility.** Fully possible. Pure data and layout.

### A4. Link songs that run together, and mark a pause between them

**Problem it solves.** Some songs go straight into the next one (a segue or medley). Others need a stop for a tuning change, an instrument swap or a word to the audience. The band needs to see both while preparing.

**Who does it and how.**

- BandHelper: "Link Songs" groups songs that run together, shown with an icon. "Add a Pause" marks a stop for an instrument change or an announcement, pauses can carry a name and notes, and the notes appear when the pause is reached. Source: [BandHelper, Building set lists](https://www.bandhelper.com/tutorials/building_set_lists.html).
- Setz lists "segues between songs" among its features (App Store listing, marketing copy). Source: [Setz](https://apps.apple.com/it/app/setz/id6756835735).

**Pragma job served.** Brainstorm the transitions.

**What pragma has.** More than most apps here. A **transition** verdict says whether someone keeps a harmonic instrument across two songs (`domain/transition.core.ts`), and a **transition comment** stores a note for one ordered pair of songs. What pragma does not seem to have is a simple "these two run together" link or a named pause row inside the setlist. The benchmark suggests showing the transition in the gap between the two rows, where the band looks while ordering, rather than on another screen.

**PWA feasibility.** Fully possible.

### A5. Per-song lineup: who sings lead, who plays what

**Problem it solves.** In a band where people swap instruments, everyone needs to know their job on each song, and the setlist can override the usual lineup for one night.

**Who does it and how.**

- Banderly stores vocal and instrument assignments on each song, lets the band set instrumentation per setlist, and shows "who's singing lead, what key you're in, and your instrumentation at a glance" (App Store listing, marketing copy). Source: [Banderly listing](https://mwm.ai/apps/banderly/6760790674).
- Planning Center Services (a church music planning tool, included because it is the most mature public example of this job) schedules people into positions per service, and its rehearsal checklist recommends assigning song leaders "so your team members know which songs they're leading". Each song in a plan uses one arrangement and one key, and that arrangement's files follow it. Sources: [Planning Center Services](https://www.planningcenter.com/services), [Add or edit an arrangement](https://help.planningcenter.com/en/add-or-edit-an-arrangement.html).
- BandHelper's closest tool is the "smart copy" of a song: a per-setlist copy whose changed fields override the original while the rest keep following it. I found no public BandHelper page describing a per-song musician field. Source: [BandHelper, Building set lists](https://www.bandhelper.com/tutorials/building_set_lists.html).

**Pragma job served.** Agree who does what, define the lineup.

**What pragma has.** This is already a strength. A song has a default **lineup**, and a setlist entry can carry a `lineupOverride` that `resolveLineup` merges with it (`domain/lineup.core.ts`). The benchmark lesson is about display, not data: the competitors show "who sings, which key" on the row itself, so the band sees it while ordering, without opening each song.

**PWA feasibility.** Fully possible.

### A6. A "my part" view filtered to one member

**Problem it solves.** A member opening the setlist mostly wants their own jobs: which songs they sing, where they switch instrument, which songs they still need to learn.

**Who does it and how.**

- Band Central (the successor of Setlist Helper) advertises "per-member lyrics". Source: [Setlist Helper site](https://setlisthelper.com/).
- SetBook advertises per-member key and notes overrides on setlists (listing, marketing copy). Source: [SetBook](https://mwm.ai/apps/setbook-gig-setlist-manager/6760658343).
- Set Genie advertises sending "individualized charts to each member" (App Store listing, marketing copy). Source: [Set Genie](https://apps.apple.com/app/id1500935949).
- BandHelper has a "Personal Transpose" that changes chords only in one member's view, for example for a capo. Source: [BandHelper, Adding lyrics and chords](https://www.bandhelper.com/tutorials/adding_lyrics.html).

**Pragma job served.** Agree who does what; each member prepares their part.

**What pragma has.** Pragma knows who is signed in and has the lineups, so a "only my songs and my instrument changes" filter is a view over data it already holds.

**PWA feasibility.** Fully possible.

### A7. Placeholder songs inside a setlist

**Problem it solves.** While brainstorming a setlist, the band names a song nobody has added to the catalogue yet. Stopping to create a full song record breaks the flow.

**Who does it and how.**

- forScore: in the setlist editor, "+" can "create a placeholder with a custom name". Source: [forScore, Setlists](https://forscore.co/documentation/setlists).
- BandHelper's named pauses play a similar role for non-song rows. Source: [BandHelper, Building set lists](https://www.bandhelper.com/tutorials/building_set_lists.html).

**Pragma job served.** Select songs; expand the catalogue.

**What pragma has.** A song with status `idea` is the natural target, and audience suggestions already create `idea` songs from a Deezer search. Typing a title in the setlist search and choosing "add as idea" would give the placeholder without a new concept.

**PWA feasibility.** Fully possible.

### A8. Notes that live on the setlist entry, by kind

**Problem it solves.** One free-text box mixes "start slower than the record", "Paul switches to bass" and "say thanks to the bar". Notes by kind can be shown in the right place.

**Who does it and how.**

- Planning Center: a plan holds plan notes and item notes, and the note categories can be configured, so a band note and a note for another team can sit on the same song. Sources: [Planning Center Services](https://www.planningcenter.com/services), [a custom plan report write-up describing configurable note categories](https://www.goodreads.com/author_blog_posts/24637621-my-custom-planning-center-services-plan-report-you-re-welcome) (third party).
- BandMate (a different product from BandLab) renders "arrangement notes" as styled callouts between chord lines (directory listing, marketing copy). Source: [BandMate on PeerPush](https://peerpush.com/p/bandmate).
- BandHelper puts notes on songs, on custom fields, and on named pauses. Source: [BandHelper, Practicing](http://www.bandhelper.com/tutorials/practicing.html).

**Pragma job served.** Take notes.

**What pragma has.** A setlist entry has one `notes` field; a song has three (`structureNotes`, `gimmickNotes`, `notes`); transitions have their own comments. The data is there. The lesson is to show the right note in the right place (song note under the title, entry note on the row, transition note in the gap) instead of in separate forms.

**PWA feasibility.** Fully possible.

### A9. Availability and confirmation before the setlist is fixed

**Problem it solves.** "Who does what" depends on who comes. Asking each person and keeping track in a chat is the job the operator wants out of the chat.

**Who does it and how.**

- Planning Center: members accept or decline each request from "My Schedule", give a reason when they decline and can name a replacement, and leaders ask the team to set "blockout dates" ahead of time to avoid declines. Sources: [Respond to scheduling emails](https://help.planningcenter.com/en/respond-to-scheduling-emails.html), [Send blockout requests](https://help.planningcenter.com/en/send-blockout-requests-for-predictable-scheduling.html).

**Pragma job served.** Agree who does what.

**What pragma has.** Calendar feeds, busy intervals and free slots already exist. An "I'm in / I'm out" answer per session, shown next to the lineup, would close the loop.

**PWA feasibility.** Possible. Push notifications reach an installed web app on iOS 16.4 and later and on Android, and pragma already has push subscriptions. On iOS, push only works once the app is added to the Home Screen.

---

## Part B. Recording and discussing (priority 1)

### B1. One-tap recording saved straight onto the song

**Problem it solves.** In a practice, the phone records in a separate app, and the file never reaches the song. Recording from the song screen files it in the right place.

**Who does it and how.**

- BandHelper: a recording control on the song layout; press record, then play, then stop, name it, and the recording is "saved along with a song for quick access later" and synced to bandmates' devices. The record action can also be bound to a gesture or a foot switch. Source: [BandHelper, Using advanced audio features](https://www.bandhelper.com/tutorials/advanced_audio.html).
- BandHelper also accepts uploaded recordings per song and a zip of many files matched to songs by name. Source: [BandHelper, Attaching recordings](https://bandhelper.com/tutorials/attaching_recordings.html).

**Pragma job served.** Record songs.

**What pragma has.** This exists: a **take** belongs to a song and optionally a session, is recorded on the device (`recorder.adapter.ts`, `RecordingSheet.tsx`) and is queued for upload. The benchmark lesson is findability: BandHelper puts the record button on the song screen used in practice. During a practice that works through a setlist, the record button should be on the current setlist row, already pointing at that song and that session.

**PWA feasibility.** Possible with care. Safari has supported MediaRecorder since iOS 14.3, recording AAC in MP4. Source: [WebKit, MediaRecorder API](https://webkit.org/blog/11353/mediarecorder-api/). Several developer reports say recording from a Home Screen web app on iOS is unreliable (works the first time, then silent or empty after the app is reopened). Source: [Apple Developer Forums, MediaRecorder as PWA on iOS](https://developer.apple.com/forums/thread/797987). I found no confirmation that this is fixed. Recording keeps going only while the app is on screen: a web app cannot record with the screen locked or in the background on iOS. The screen wake lock, which stops the phone from sleeping during a take, works in Home Screen web apps since iOS 18.4 according to [Progressier](https://progressier.com/pwa-capabilities/screen-wake-lock) and [WebKit bug 254545](https://bugs.webkit.org/show_bug.cgi?id=254545); pragma already uses it in the scene view.

### B2. Comments pinned to a moment in a recording

**Problem it solves.** "The bridge at 2:10 drags" is useful only if it points to 2:10.

**Who does it and how.** I found no official public page showing BandLab or the band apps above doing this. One comparison article says timestamped comments are handled by project-sync tools, without naming BandLab. Source: [Freecords, music collaboration apps](https://www.freecords.com/post/the-best-music-collaboration-app-isnt-a-daw-heres-what-to-look-for) (third party, low authority). Treat this pattern as unconfirmed in the benchmark set.

**Pragma job served.** Discuss.

**What pragma has.** Pragma is ahead here: a **take comment** carries an optional `at_seconds`, so it is either a thread message or a comment at a point in the take. The lesson is to make tapping a comment jump the player to that point, and to offer "comment here" from the player at the current time.

**PWA feasibility.** Fully possible.

### B3. Practice player: loop a section and slow it down

**Problem it solves.** Learning a part means repeating eight bars at a slower speed.

**Who does it and how.**

- BandHelper: loop start and loop end buttons while a recording plays, a speed slider (double-tap resets it), and pitch shift on the recording. Sources: [BandHelper, Practicing](http://www.bandhelper.com/tutorials/practicing.html), [Using advanced audio features](https://www.bandhelper.com/tutorials/advanced_audio.html).
- Moises: AI finds the song's sections so one can be looped, a one-tap speed changer, and stem separation (vocals, drums, bass free; guitar on paid tiers). App Store listing, marketing copy. Source: [Moises](https://apps.apple.com/app/id1515796612).

**Pragma job served.** Learn and play new songs.

**PWA feasibility.** Looping and speed change are possible with the standard audio element (`playbackRate`, keeping pitch through `preservesPitch`) on both platforms. Stem separation is a server-side machine learning job and a new dependency, so it is out of reach without an architecture decision.

### B4. Practice to-do list driven by a status or tag

**Problem it solves.** The band needs one list of "songs we still need to work on" that empties itself as songs are learned.

**Who does it and how.**

- BandHelper: tag a song "Practice" or give it a colour, then build a smart list filtered on it; removing the tag drops the song off the list, so it works "as a running to-do list". Source: [BandHelper, Building smart lists](https://bandhelper.com/tutorials/building_smart_lists.html), [Practicing](http://www.bandhelper.com/tutorials/practicing.html).

**Pragma job served.** Make it easy to learn new songs; prepare a practice.

**What pragma has.** A song `status` (`idea`, `wip`, `rehearsed`, `concert_ready`), per-member **mastery** scores, **studies** and **concert readiness**. Pragma holds richer data than BandHelper. The lesson is a single entry point: "what should we practise next?" built from setlists coming up and low mastery, one tap from home, that can turn into a practice setlist.

**PWA feasibility.** Fully possible.

---

## Part C. Growing the catalogue and adding chords with little effort (priority 2)

### C1. Paste a chord sheet as it is found on the web ("chords above lyrics") and convert it

**Problem it solves.** Almost every chord sheet online is written with chords on their own line above the lyrics. ChordPro wants chords in brackets inside the lyric line. Retyping one into the other is the single biggest effort in adding chords.

**Who does it and how.**

- OnSong: "Detect Chords In Lyrics" places chords written "on a separate line above lyrics" over the lyrics automatically, and it is on by default. It can also detect the song's key from the first chord, the last chord or a count of sharps and flats. Source: [OnSong manual, Text settings](https://onsongapp.com/docs/interface/menubar/utilities-menu/settings/import-settings/text-settings).
- BandHelper: chords typed above lyric lines are recognised, and a "ChordPro tools" button converts that layout to ChordPro positions. Source: [BandHelper, Adding lyrics and chords](https://www.bandhelper.com/tutorials/adding_lyrics.html).
- SongbookPro: for chord-over-lyric text, create a song and paste it in, with the key left on "Detect". Source: [SongbookPro, Importing songs](https://songbook-pro.com/docs/getting-started/importing-songs).
- The reference ChordPro tool ships a converter for exactly this ("a2crd"), and warns that its output "will generally need some additional editing". Source: [ChordPro, a2crd configuration](https://www.chordpro.org/beta/chordpro-configuration-a2crd), [a2crd man page](https://dyn.manpages.debian.org/trixie/chordpro/a2crd.1.en.html).

**Pragma job served.** Chords, "only if really easy".

**What pragma has.** Pragma stores and renders ChordPro (`chordpro.utils.ts` parses bracketed chords; transposition exists). I found no converter from a pasted chords-above-lyrics sheet. This is the highest-value gap in the benchmark for priority 2: paste, see the converted preview, fix the few wrong lines, save. The conversion is a pure text function, so it fits a `*.utils.ts` file and its coverage gate.

**PWA feasibility.** Fully possible. Paste from the clipboard works everywhere inside a text field. Reading the clipboard from a button needs a user tap and a permission prompt on iOS; a plain text area avoids that.

### C2. Search the web from inside the song and import the result

**Problem it solves.** Leaving the app to find a chord sheet, copying, switching back and pasting is four steps on a phone.

**Who does it and how.**

- BandHelper: a web search inside the song edit page; import the page's formatted block, a selection or the URL into a chosen field. Source: [BandHelper, Adding lyrics and chords](https://www.bandhelper.com/tutorials/adding_lyrics.html).
- SongbookPro: "Search online" for Ultimate Guitar or WorshipTogether, preview, then import. Source: [SongbookPro, Importing songs](https://songbook-pro.com/docs/getting-started/importing-songs).

**Pragma job served.** Chords; expand the catalogue.

**PWA feasibility.** A web app cannot read another site's page from the browser (cross-origin rules), and scraping Ultimate Guitar raises terms-of-use and licensing questions. A safe low-effort version is a "find chords" button that opens a web search for "title artist chords" in a new tab, plus the paste converter of C1 for the way back. Anything that fetches chord text on the server is a new external dependency and an architecture decision.

### C3. Receive a chord sheet or a recording from the phone's share sheet

**Problem it solves.** The member is already looking at a chord page or a voice memo. Sharing it straight into the band app skips the copy-paste.

**Who does it and how.** Native apps do this through share extensions (the forScore, OnSong and BandHelper apps accept files this way; I did not find a single page that documents each, so treat this as general knowledge about native apps).

**Pragma job served.** Chords; recordings.

**PWA feasibility.** **Android only.** Chrome on Android lets an installed web app register as a share target through its manifest. iOS has no Web Share Target support for web apps; the WebKit request has been open since 2019. Source: [WebKit bug 194593](https://bugs.webkit.org/show_bug.cgi?id=194593). Sending out from pragma (sharing a setlist or a take to a chat) works on both through `navigator.share`; sharing files is supported on iOS since version 15, with audio types to be tested. Source: [web.dev, Web Share API](https://web.dev/articles/web-share), [WebKit bug 231995](https://auto-bugs.webkit.org/show_bug.cgi?id=231995).

### C4. Photo or PDF of a chart when typing is too much

**Problem it solves.** Some members have a paper or PDF chart. Attaching it is enough to learn the song; converting it to text is not needed.

**Who does it and how.**

- SongbookPro: "From camera" photographs a sheet in several shots (iOS and Android only). Source: [SongbookPro, Importing songs](https://songbook-pro.com/docs/getting-started/importing-songs).
- BandHelper and forScore attach PDFs to songs. Sources: [BandHelper, Attaching documents](https://www.bandhelper.com/tutorials/attaching_documents.html), [forScore, Setlists](https://forscore.co/documentation/setlists).

**Pragma job served.** Chords at the lowest possible effort.

**What pragma has.** This exists: a **chord chart** is ChordPro text, a PDF or an image. The lesson is to offer the three as equal first choices ("paste text", "take a photo", "add a PDF") rather than leading with ChordPro.

**PWA feasibility.** Fully possible. A file input with `accept="image/*"` and `capture` opens the camera on both platforms.

### C5. Chord tools that make a chart playable: transpose, capo, diagrams, simplify

**Problem it solves.** A chart in the wrong key, or with chords a member cannot play, is useless.

**Who does it and how.**

- Ultimate Guitar: transpose, "simplified fretboard diagrams", a "simplify" button on some tabs, and autoscroll. Transpose and simplify appear to be paid features now. Sources: [Ultimate Guitar help, Tabs](https://help.ultimate-guitar.com/en/articles/6741306-tabs), [TechRadar review](https://www.techradar.com/computing/websites-apps/ultimate-guitar).
- BandHelper: half-step transpose buttons, a personal transpose for one member, Roman numeral and German chord names. Source: [BandHelper, Adding lyrics and chords](https://www.bandhelper.com/tutorials/adding_lyrics.html).
- OnSong: key detection from chords when the key is not written. Source: [OnSong manual, Text settings](https://onsongapp.com/docs/interface/menubar/utilities-menu/settings/import-settings/text-settings).

**Pragma job served.** Learn and play new songs.

**What pragma has.** Transposition (`transposeChord`), a key override and a capo per setlist entry, and a **tonality** rule. Detecting the key from the chords on paste (C1) would fill the song's key for free.

**PWA feasibility.** Fully possible. Chord diagrams need a chord-shape dataset; reusing an existing open library is better than drawing them, and adding one is a dependency decision.

### C6. Song structure written once, played in an order ("flow")

**Problem it solves.** A chart written verse, chorus, verse, chorus, chorus repeats itself. A flow line ("V1 C V2 C C B C C") is shorter, and it is also the place to note the band's own arrangement.

**Who does it and how.**

- OnSong "Flow": label the sections once, then give the order with a shorthand line; entries can carry "(Repeat 2x)" and key changes. Source: [OnSong manual, Flow](https://onsongapp.com/docs/flow).
- Planning Center: each song can have several arrangements, each with its own sequence and files, and a plan picks one. Source: [Add or edit an arrangement](https://help.planningcenter.com/en/add-or-edit-an-arrangement.html).

**Pragma job served.** Learn songs; take notes on structure.

**What pragma has.** A free-text `structureNotes` field on the song. A short structured flow line is a later step; this pattern is lower priority than C1.

**PWA feasibility.** Fully possible.

### C7. Auto-detect chords from the audio

**Problem it solves.** No chord sheet exists, for example for an obscure cover.

**Who does it and how.**

- Chordify extracts chords from YouTube, Deezer, SoundCloud or a file, and lets users correct mistakes. Accuracy is reported as fair on simple songs and poor on complex ones, and voicings are limited to triads. Sources: [ISMIR 2015 demo by the Chordify team](https://www.ismir2015.uma.es/LBD/LBD42.pdf), [Digital Music News review](https://www.digitalmusicnews.com/2014/03/10/chordify/).
- Moises advertises chord, key and tempo detection synced to the song (marketing copy). Source: [Moises](https://apps.apple.com/app/id1515796612).

**Pragma job served.** Chords for songs nobody wrote down.

**PWA feasibility.** Not realistic inside pragma: it needs audio analysis on a server or a third-party service, which is a new dependency and an architecture decision, and the operator asked for chords only if really easy. A link out to such a service from the song (pragma already stores Deezer and YouTube links) is the cheap version.

---

## Part D. Cross-cutting patterns

### D1. Offline copy of what is needed tonight

**Problem it solves.** Bars and rehearsal rooms often have poor signal.

**Who does it and how.** BandHelper syncs songs, setlists and recordings to every device. Banderly says everything works offline once loaded (marketing copy). Sources: [BandHelper, Using advanced audio features](https://www.bandhelper.com/tutorials/advanced_audio.html), [Banderly listing](https://mwm.ai/apps/banderly/6760790674).

**What pragma has.** An **offline manifest** and an upload queue for takes.

**PWA feasibility.** Possible on both. On iOS, WebKit has said that Home Screen web apps keep their own counter of days of use and that their first-party storage should not be deleted after 7 days, but a 2022 bug report describes users logged out after 7 days anyway. Sources: [WebKit bug 237350](https://bugs.webkit.org/show_bug.cgi?id=237350), [Search Engine Land on the 7-day cap](https://searchengineland.com/what-safaris-7-day-cap-on-script-writeable-storage-means-for-pwa-developers-332519). Not provable on an emulator.

### D2. Sharing a setlist with people outside the app

**Problem it solves.** A sound engineer, a stand-in player or the bar wants the list without an account.

**Who does it and how.** BandHelper emails a setlist as PDF or HTML, prints it, or shows it on the band's website through a live widget. forScore shares a setlist as plain text, its own file, or one PDF. Sources: [BandHelper, Sharing set lists](https://www.bandhelper.com/tutorials/sharing_set_lists.html), [forScore, Setlists](https://forscore.co/documentation/setlists).

**Pragma job served.** Prepare concerts.

**PWA feasibility.** `navigator.share` with text works on both platforms. Printing to PDF works through the browser's print menu.

---

## What the emulator and this benchmark could not prove

- No competitor app was used. Every claim about them comes from their public pages, and several only from store listings, which are marketing copy. Those are marked.
- Per-song musician assignment in BandHelper, and timestamped comments in BandLab, are **not** documented in any public page I found. I did not count them.
- The iOS limits above (recording reliability in a Home Screen app, haptics, storage eviction, wake lock) can only be confirmed on a real iPhone at the iOS version the band uses. An Android emulator or a desktop Chromium proves none of them.
- No pragma screen was driven for this benchmark. The notes under "What pragma has" come from reading the vocabulary and a few files, not from using the app.

---

## The 10 patterns I would most recommend for pragma

Ranked by how much they serve the operator's priorities, how much pragma already holds the data, and whether they work in a web app on both phones.

1. **Paste a chords-above-lyrics sheet and convert it to ChordPro (C1), with key detection from the chords (C5).** The biggest effort cut for priority 2, and the only chord pattern that is "really easy" for the band. Pure text work; no dependency.
2. **Show lineup, key and lead singer on each setlist row (A5).** Pragma already resolves the lineup per entry; the competitors win by putting it on the row so nobody opens each song.
3. **Show the transition and its comment in the gap between two rows, plus a simple "runs into the next song" link and a named pause row (A4).** Pragma's transition data is better than any competitor's; it needs to sit where the band orders songs.
4. **Record from the current setlist row during a practice (B1).** The take already knows its song and session; put the button where the band is. Test on a real iPhone, because Home Screen recording is reported as unreliable.
5. **A single full-screen "add songs" sheet with multi-select and "copy from another setlist" (A1).** Fixes selection speed and, done as the only scrolling area, removes one source of double scroll.
6. **Sets, breaks and a running total time inside a setlist (A3).** Durations already come from Deezer; this answers "does it fit the slot?".
7. **"My part" filter per member (A6).** Built from data pragma holds: the signed-in member, the lineups and the mastery scores.
8. **"What do we practise next?" list built from upcoming setlists and low mastery, one tap from home, turnable into a practice setlist (B4).**
9. **Placeholder songs typed straight into the setlist and saved as `idea` (A7).** Keeps brainstorming fast and grows the catalogue as a side effect.
10. **Practice player with loop and slow-down on takes and reference tracks, with tap-to-jump on timestamped comments (B3 and B2).** Uses standard audio features on both platforms; pragma already stores `at_seconds` on comments.

Patterns I would **not** recommend now: in-app web scraping of chord sites (C2, licensing and cross-origin), audio chord detection (C7, new service and poor accuracy), receiving from the iOS share sheet (C3, not possible in a web app on iOS; Android only), and haptic feedback on iOS (A2, no supported API).

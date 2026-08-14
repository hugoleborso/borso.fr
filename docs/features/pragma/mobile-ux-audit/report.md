# Mobile UX audit of the pragma web app

Three rounds of audit and fix, run at 375x667 and 375x780 against the local dev
server. Each round swept every route, reported what a person holding a phone
would hit, and was followed by a fix commit that re-measured each symptom after
the change.

## Verdict

The app is close to clean on a phone, and it is not proven clean. The auditor
reported 63 findings across the three rounds, 60 of them were fixed and measured
again after the fix, and every blocker and every major finding raised in any
round is now closed. Three minor findings were skipped in round one and two of
the three came back in round two and were fixed there; the last one, the missing
cue that the member filter strip on the setlist scrolls sideways, was left open
because nobody had re-measured the strip after the round two toolbar fix. It has
been measured since, and it is closed — see note S3.
The app cannot be called proven clean for two reasons. First, every round found
defects the round before it had missed, and one of those defects was created by a
round one fix, because the radio labels grew an 8px wider hit box than their
layout slot and started stealing each other's taps. Second, nobody has run a
fourth round against the round three fixes, so the only evidence for the last
seven fixes is the fixer's own measurements recorded in commit e38735f.

## Findings

Every finding from every round is listed below. One round one finding covered two
separate symptoms that were answered separately, so it appears as two rows, which
is why the table has 64 rows for 63 findings. Severity is the auditor's own
grading.

| # | Round | Route | Finding | Severity | Outcome |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | /catalog/:songId/scene | Lyrics rendered at 1.62:1 contrast on the near black stage background | Blocker | Fixed in 068e5d5 |
| 2 | 1 | /catalog/:songId/scene | Chart lines ran 5.2 times wider than the screen, so the chart could not be read as a chart | Blocker | Fixed in 068e5d5 |
| 3 | 1 | /catalog/:songId/scene | The two zoom buttons changed the dialog font size but never the chart | Blocker | Fixed in 068e5d5 |
| 4 | 1 | /catalog | The last status filter, Ideas, was clipped by an overflow hidden parent and could not be panned to | Blocker | Fixed in 068e5d5 |
| 5 | 1 | /catalog/new and /catalog/:songId/edit | An oEmbed link rendered a fixed 560px player, 242px of it unreachable | Major | Fixed in 068e5d5 |
| 6 | 1 | /catalog/new and /catalog/:songId/edit | All 14 form controls sat below 16px, so iOS Safari zooms the page on focus | Major | Fixed in 068e5d5 |
| 7 | 1 | /catalog/:songId lineup modal | Save and Cancel sat below the bottom of the screen with nothing saying the sheet scrolls | Major | Fixed in 068e5d5 |
| 8 | 1 | /catalog/:songId/scene | All five stage header controls were 34px tall, under the 44px floor | Major | Fixed in 068e5d5 |
| 9 | 1 | /catalog/new and /catalog/:songId/edit | The chart kind radios were 13px dots inside 20px labels | Major | Fixed in 068e5d5 |
| 10 | 1 | /catalog/:songId/edit | Delete sat 8px from Save and destroyed the song with no confirmation and no undo | Major | Fixed in 068e5d5 |
| 11 | 1 | /catalog/new and /catalog/:songId/edit | An added external link rendered 723px above the fold, so the Add button looked dead | Major | Fixed in 068e5d5 |
| 12 | 1 | /catalog/new and /catalog/:songId/edit | The status select was 37px tall | Minor | Fixed in 068e5d5 |
| 13 | 1 | /catalog | The five status filter chips were 40px tall | Minor | Fixed in 068e5d5 |
| 14 | 1 | /catalog/:songId lineup modal | The 20 instrument chips were 36px tall and the close button 24px wide | Minor | Fixed in 068e5d5 |
| 15 | 1 | /catalog | 82 text nodes rendered below 12px | Minor | Fixed in 068e5d5 |
| 16 | 1 | /catalog | The floating New song button covered part of the card underneath it | Minor | Skipped, see note S1, then fixed in round two |
| 17 | 1 | /catalog/new, /catalog/:songId, /catalog/:songId/edit | The back link was a 16px tall strip | Minor | Fixed in 068e5d5 |
| 18 | 1 | /catalog/:songId | The embed kept its 315px height while squeezed to 276px wide | Minor | Fixed in 068e5d5 |
| 19 | 1 | /sessions/:id/setlist | The right edge of the energy readout was a live delete button on every row | Blocker | Fixed in 068e5d5 |
| 20 | 1 | /sessions/:id/setlist | No back link and no title, so you could not tell which session you were editing | Major | Fixed in 068e5d5 |
| 21 | 1 | /bars | Saving a new bar kept every value, so a second Save created a duplicate record | Major | Fixed in 068e5d5 |
| 22 | 1 | /bars | The row delete button removed the record with no confirmation and no undo | Major | Fixed in 068e5d5 |
| 23 | 1 | /bars | The kanban board rendered at 375px but its cards only move with a mouse | Major | Fixed in 068e5d5 |
| 24 | 1 | /bars, /sessions and the setlist | Every text field in the area was below 16px | Major | Fixed in 068e5d5 |
| 25 | 1 | /sessions/:id/setlist | The per song detail fields were three 89px boxes at 28.8px tall | Major | Fixed in 068e5d5 |
| 26 | 1 | /sessions/:id/setlist | The page scrolled behind an open sheet, and the transition note modal answered neither Escape nor a backdrop tap | Major | Fixed in 068e5d5 |
| 27 | 1 | /sessions/:id/setlist | Drag handle, row icon buttons, energy slider and member pills were all under the 44px floor | Minor | Fixed in 068e5d5 |
| 28 | 1 | /bars | An empty kanban board was 1758px tall | Minor | Fixed in 068e5d5, by hiding the board below the lg breakpoint |
| 29 | 1 | /sessions/:id/setlist | The last member filter pill sat almost entirely off the right edge | Minor | Skipped in round one, closed by the round two toolbar fix, see note S3 |
| 30 | 1 | /sessions/:id/setlist | The pinned toolbar took 188px of a 667px screen | Minor | Skipped, see note S2, then fixed in round two |
| 31 | 1 | /bars | Two invisible unlabelled sort buttons, and City and Capacity shown nowhere on a phone | Minor | Fixed in 068e5d5 |
| 32 | 1 | /sessions | Labels and chips printed below 12px | Minor | Fixed in 068e5d5 |
| 33 | 1 | /members | One tap on the round button deleted a member with no confirmation and no undo | Blocker | Fixed in 068e5d5 |
| 34 | 1 | /members | Scrolling the mastery matrix sideways slid the member name off the left edge | Major | Fixed in 068e5d5 |
| 35 | 1 | /members | Every input was below 16px | Major | Fixed in 068e5d5 |
| 36 | 1 | /members | The 20 mastery score boxes were 48x26 | Major | Fixed in 068e5d5 |
| 37 | 1 | /members and /instruments | The name button, the only way to open the edit form, was a 19.6px strip in a 62px row | Major | Fixed in 068e5d5 |
| 38 | 1 | More drawer, every route | Every drawer navigation row was 33.6px tall | Major | Fixed in 068e5d5 |
| 39 | 1 | More drawer, every route | The FR and EN buttons were 37.6x25.9 | Major | Fixed in 068e5d5 |
| 40 | 1 | /members | Instrument checkboxes were 13px squares in a 20px label | Major | Fixed in 068e5d5 |
| 41 | 1 | /instruments | The family chips were 40px tall | Minor | Fixed in 068e5d5 |
| 42 | 1 | /members, /instruments and the shell | Small print across the shell and the admin pages sat below 12px | Minor | Fixed in 068e5d5 |
| 43 | 1 | /members | The colour swatch was 40px tall | Minor | Fixed in 068e5d5 |
| 44 | 1 | /members and /instruments | No bottom tab was highlighted, so nothing said where you were | Minor | Fixed in 068e5d5 |
| 45 | 1 | Every route | The shell's 64px bottom clearance did not follow the home indicator inset | Minor | Fixed in 068e5d5 |
| 46 | 2 | /catalog/:songId/scene | A stage link to a deleted song showed the words "song 404" on an empty screen with nothing to tap | Major | Fixed in 1b5402a |
| 47 | 2 | /catalog/:songId/edit | An edit link to a deleted song rendered the whole form, blank and fully operable, with Save and Delete live | Major | Fixed in 1b5402a |
| 48 | 2 | /catalog | The floating New song button covered 95% of a mastery badge on the card underneath | Minor | Fixed in 1b5402a, by removing the floating button |
| 49 | 2 | /catalog/new | The chart kind radio hit boxes overlapped by 4px, so a tap on one option selected the next | Minor | Fixed in 01e1d33, verified in round two. Introduced by the round one fix for finding 9 |
| 50 | 2 | /sessions/:id concert edit form | The four friends expected boxes were 80x26 at 12px | Major | Fixed in 01e1d33, verified in round two |
| 51 | 2 | /sessions/:id and the New concert dialog | The gear notes textarea was the one field left at 12px | Major | Fixed in 01e1d33, verified in round two |
| 52 | 2 | /bars | Tapping a bar row did nothing visible, and the form that switched into edit mode was off the bottom of the phone | Major | Fixed in 1b5402a |
| 53 | 2 | /sessions/:id/setlist | The pinned toolbar plus the tab bar took 36.3% of the screen, so at most one song row was visible | Minor | Fixed in 1b5402a |
| 54 | 2 | /sessions/:id with a stale id | A link to a missing session showed one red line of developer text and no way back | Minor | Fixed in 1b5402a |
| 55 | 2 | /members | The matrix told you to scroll and right click to clear a score, neither of which a phone fires, and emptying a cell wrote a zero | Minor | Fixed in 1b5402a |
| 56 | 2 | More drawer, every route | The wordmark subtitle was 9px, the smallest text in the app | Minor | Fixed in 1b5402a |
| 57 | 2 | More drawer, every route | The drawer ignored Escape while the delete confirmation beside it closed on Escape | Minor | Fixed in 1b5402a |
| 58 | 3 | /catalog/:songId | A pasted link in a note field ran off the right edge and the tail was unreachable | Major | Fixed in e38735f |
| 59 | 3 | /catalog/:songId/edit | A song with a ChordPro chart made the edit page 12.1 screens tall, with Save and Delete far below the chart box | Major | Fixed in e38735f |
| 60 | 3 | /sessions/:id | The Setlist button linked to /setlists instead of that session's setlist | Major | Fixed in e38735f |
| 61 | 3 | /sessions/:id/setlist | A song with a long title was cut off mid word even though half the card width was empty | Major | Fixed in e38735f |
| 62 | 3 | /sessions/:id/setlist | A newly added song showed the slider at the halfway mark while the number beside it read a dash | Minor | Fixed in e38735f, with a different remedy, see note D1 |
| 63 | 3 | /members | One member with a 61 character first name made every score box in the matrix untappable, for every member | Major | Fixed in e38735f |
| 64 | 3 | /members | The matrix scrolls sideways with no scrollbar, so two of the five instrument columns were effectively absent | Minor | Fixed in e38735f, with a different remedy, see note D2 |

Two fixes in round one answered no finding of their own. The fixer applied the
same confirmation dialog to instrument deletion, because the audit had flagged
that exact shape on members and bars, and the fixer repaired a pre-existing
TypeScript error on the two bare font package imports, because it was blocking
the typecheck gate on a clean checkout.

### Notes on the skipped findings

**S1, the floating New song button on /catalog.** The fixer skipped it in round
one, on the grounds that a floating button overlaps content by definition, and
that reserving clearance would cost a permanent right hand gutter on every card
in the list so that one card is not covered. Round two measured the same button
covering 95% of a mastery badge and 56% of the one beside it, and the fixer then
removed the floating button entirely and stopped hiding the header New song
action below the sm breakpoint. The fixer recorded the property that change
drops, which is that the create action is no longer in thumb reach while you are
scrolled down the list.

**S2, the pinned toolbar on the setlist editor.** The fixer skipped it in round
one because it conflicted with the touch target finding on the same screen.
Raising the member pills from 32px to the 44px floor made the toolbar taller
rather than shorter, measured at 200px after the fix against 188px before, and
the fixer took the extra 12px rather than leave five controls under the floor.
Round two measured the sticky block at 185px and 36.3% chrome, and the fixer then
split the toolbar so that only the energy curve stays pinned and the member pills
scroll away with the page, which took the pinned band to 51px and the chrome to
25.2%.

**S3, the last member filter pill on the setlist editor.** Closed, by
measurement rather than by a fix. The strip no longer scrolls at all: it is
`flex flex-wrap gap-2`, its `scrollWidth` and `clientWidth` are both 343, and at
375px the five pills sit on two rows — All members / Hugo / Léa, then Marc /
Sarah — each 44px tall and each fully inside the viewport. There is no hidden
pill left to cue. What follows is why it was skipped at the time.

The fixer skipped it because the strip was then a horizontal scroller, with
scrollWidth 435 against clientWidth 328, so the pill was reachable by the gesture
the strip is built for, unlike the /catalog filter group which sat inside an
overflow hidden parent and genuinely could not be panned. What was missing was a
stronger cue that the strip scrolls, and the fixer left the design of that cue to
the operator rather than inventing one. The round two toolbar fix then wrapped the
pills onto two rows, which removed the scroller and the need for a cue with it.

### Notes on the two fixes that departed from the suggested remedy

**D1, the energy slider and its readout.** The auditor suggested keeping the em
dash and correcting the slider. The fixer did the opposite, because a range input
always puts its thumb somewhere and so cannot draw "nothing stored" by being
blank, which means keeping the dash would leave the two controls contradicting
each other either way. The row now prints the slider's value in both places and
mutes both until an energy is actually stored.

**D2, the missing scrollbar on the mastery matrix.** The auditor's finding rested
on the styled scrollbar reserving no layout space. The fixer did not try to make a
scrollbar reserve space, because iOS Safari, which is the device the audit is
about, draws no persistent scrollbar at all, so any scrollbar based cue would be
absent exactly where it is needed. The matrix now renders a one line hint above
the grid below the sm breakpoint, and hides the hint at desktop width where the
grid no longer overflows.

## What is still not verified

**No real touch input was ever dispatched.** Every interaction in all three
rounds went through agent-browser over CDP, using agent-browser click or
element.click() through eval, and every geometry number came from
getBoundingClientRect and elementFromPoint in the page. The argent gesture tap
verb is broken on this Chromium and times out on Input.dispatchMouseEvent, as
recorded in `docs/knowledge/driving-previews-with-agent-browser-and-argent.md`,
so touch specific behaviour was inferred from attributes, computed touch-action
and source rather than driven. Momentum scrolling, overscroll chaining, pinch
zoom, long press and a genuine finger drag on the setlist reorder handle are all
unexercised.

**iOS Safari behaviour was inferred, never observed.** The 16px focus zoom
threshold was checked by measuring font sizes, not by watching a page zoom, and
whether a long press on a number input fires a contextmenu event on a real device
could not be tested. There is no iOS engine, simulator or /dev/kvm in this
sandbox.

**The on screen keyboard was never raised.** Whether the Save button of the new
member form, the new instrument form, the bars form, the add song sheet or the
transition note modal stays reachable while a field is focused is unknown, and it
matters most on the forms that used to trigger the zoom.

**Safe area insets resolve to zero in this Chromium.** The tab bar's computed
padding-bottom is 0px, so the notch case was arithmetic from the computed CSS
rather than a measurement. Round three also noted, without being able to test it,
that the drawer's nav uses a fixed py-4 and its last block sits 16px above the
viewport bottom, so on a handset reporting a 34px inset that block would fall
inside the home indicator strip.

**PDF and image charts were never uploaded.** Only the empty drop zone was
measured, at 283x156. The uploaded file preview on the detail page, the file name
and replace and remove controls on the edit form, and the stage view for a non
ChordPro chart are all unmeasured, because the upload path needs an S3 target the
local stack does not provide.

**No oEmbed player ever painted.** The sandbox proxy blocks youtube.com, so only
the iframe box geometry was measured. The player controls at 375px, including
fullscreen and the scrubber, are unmeasured.

**Copy order feedback could not be confirmed.** Headless Chromium blocks the
clipboard, so the copied state and the error branch were never observed, and the
auditor could not tell a real failure from a harness limit.

**The bars kanban board is unauditable at phone width.** The round one fix hides
the List and Kanban toggle below the lg breakpoint on purpose, because HTML5 drag
and drop does not fire on touch, so at 375px there is nothing to drive and the
board's touch behaviour is moot rather than measured.

**Long lists were never stressed.** The seed carries four members, five
instruments, one session, six or seven setlist entries and no bars, so the add
song sheet never scrolled internally, the bars list never paginated, and the
members list was only pushed as far as twelve rows in one round three probe. A
populated mastery grid on the song detail page was never rendered either, because
every seeded mastery row read as empty.

**Several write paths were opened and cancelled rather than completed.** The
lineup editor modal was never saved, so its post save re-render is unmeasured, and
most delete confirmations were cancelled to protect data other agents were using.

**Two events were seen once and could not be reproduced, so neither was
reported.** In round one the setlist row detail panel collapsed on its own twice
early in the run, then stayed open through a 24 second poll. In round three the
bars edit form reverted from an edited bar back to New bar between two
measurements with no click in between, and four eight second polls afterwards held
steady. A concurrent agent was writing to the same API and the same source files
at the time, so neither could be attributed.

**The audit ran against a moving tree and a shared database.** Other agents
re-seeded the database several times, so song and session ids drift between
measurements, and in rounds two and three source files were being written while
measurements were taken. Round three measured against git HEAD 1b5402a with a
dirty tree of 15 modified files. Anything the fixer landed after each round's
final re-measurement is unmeasured.

**The round three fixes were never independently audited.** Commit e38735f
records an after measurement for each of its seven fixes, and no fourth round
checked them.

**One harness artefact is worth knowing about before re-running.** Playwright's
fill with an empty string leaves the DOM value empty while React state keeps the
old value, which produced a false alarm on the catalog search box in round three
and does not clear a mastery score. Clear a field with a real click plus
Control+a plus Backspace, or with press, not with fill.

## How the audit was driven

Anyone re-running the audit should follow the same setup.

**Browser and driver.** Use agent-browser, which is Playwright over CDP, against
the local dev server at `http://localhost:5174`. Do not use argent for
interaction, because its gesture tap is broken on this Chromium, and read
`docs/knowledge/driving-previews-with-agent-browser-and-argent.md` first. When a
click looks ignored, re-issue it as `element.click()` through eval, per
`docs/knowledge/agent-browser-cdp-click-no-op-on-react-onclick.md`, and probe with
`document.elementFromPoint` first to check nothing covers the target.

**Viewports.** Set 375x667 and 375x780, and re-check anything viewport sensitive
at both. Run the admin routes in English and in French, because the language
switcher changes label widths.

**Measurements.** Take every number from the page through eval. The audit used
`getBoundingClientRect` for target sizes, `getComputedStyle` for font size,
overflow, position and colour, `scrollWidth` against `clientWidth` for overflow,
`document.elementFromPoint` for hit testing and occlusion, and
`Range.getBoundingClientRect` walked character by character to find where a long
string leaves the screen.

**Thresholds applied.** A touch target is a failure below 44x44. A text control
is a failure below 16px, because iOS Safari zooms the page on focus. Body text is
a failure below 12px. Text contrast is a failure below the WCAG AA ratio of
4.5:1.

**Test data.** Read the current ids first with `GET /api/songs`, because the
seeded ids rotate. Write probe data through the app's own API, for example `POST
/api/songs` for a song carrying a long ChordPro chart or a long pasted URL, and
`POST /api/setlists/<id>/entries` for a setlist row with a long title. Restore
afterwards with `POST /api/__test/seed`, and delete anything you created.

**Coverage per round.** Each round swept the catalog list, the new song form, the
song detail page, the song edit form, the stage view, the lineup modal, the
sessions list and detail, the setlist editor with all its sheets and modals, the
setlists list, the bars list and forms, the login page, the members page with its
mastery matrix, the instruments page, the More drawer, the bottom tab bar and the
language switcher. Rounds two and three also swept the not found states for a
missing song and a missing session.

**Gates run after each fix commit.** From `apps/pragma`, `npx tsc --noEmit` and
`npx vitest run --project core`, plus `npx vitest run --project core --coverage`
because the repo gates every `*.core.ts` and `*.utils.ts` file at 100%. From the
repo root, `pnpm exec eslint apps/pragma`, and in round two also `pnpm exec knip`.
All three rounds finished with zero TypeScript errors, zero ESLint errors, all
core tests passing, and 100% coverage on statements, branches, functions and
lines. The two ESLint warnings that remain are the pre-existing
`react-hooks/incompatible-library` notice on `useReactTable` in `BarsList.tsx` and
`MasteryMatrix.tsx`.

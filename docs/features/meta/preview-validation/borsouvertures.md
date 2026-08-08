# Preview validation of `borsouvertures` for PR 40

## Verdict

FAIL with 6 defects. None of them blocks a user, and every functional check
asked for passed, so read this as a working preview carrying six small faults
rather than a broken one. Every toggle toggles, the English
and French catalogues are both complete with no raw key and no leaked string,
an opening expands to its variations, a variation loads onto the board, and a
real sequence of moves plays through the drill to completion with the counter
advancing. No uncaught error and no console message of any level appeared at
any point. No page state scrolls sideways at 375, 393 or 1280 pixels. The two
`borsouvertures` defects recorded in the earlier mobile viewport audit are both
fixed. The six defects below are an untranslated `lang` attribute, a missing
plural rule, thirty-two unnamed ARIA buttons on the drill board, a page with no
landmark and no level one heading, a board square that ignores a click or a tap,
and a missing favicon.

## What was checked and how

The functional walkthrough ran through `agent-browser` on its own session named
`borsouvertures`, against
`https://borsouvertures-pr-40.preview.borso.fr`, with the launch flags from
[`docs/knowledge/driving-previews-with-agent-browser-and-argent.md`](../../../knowledge/driving-previews-with-agent-browser-and-argent.md).

The touch pass ran through `argent` on device `chromium-cdp-9224`. Argent has no
viewport tool, so a second protocol session was held open beside it, sending
`Emulation.setDeviceMetricsOverride` at 375 by 667 with a device pixel ratio of
2 and `Emulation.setTouchEmulationEnabled` with five touch points. The page then
reported `matchMedia('(pointer: coarse)').matches` true,
`matchMedia('(hover: none)').matches` true and `navigator.maxTouchPoints` 5.

Argent's own `gesture-tap` could not be used. Every call returned
`[Tool:gesture-tap] CDP request Input.dispatchMouseEvent (id=…) timed out`, and
it did so with the emulation session closed as well as open, so it is not caused
by the extra session. Taps were sent instead as `Input.dispatchTouchEvent`
`touchStart` and `touchEnd` pairs over the same protocol connection, which
worked on the first attempt and every attempt after. Drags were sent the same
way with intermediate `touchMove` points.

## Layout by state and viewport

Each cell reports `document.documentElement.scrollWidth` over
`document.documentElement.clientWidth`. A state fails when the scroll width is
larger than the client width.

| State | 375 | 393 | 1280 |
|---|---|---|---|
| Landing, Learn mode | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| Opening expanded, variations listed | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| Variation selected, lines listed | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| Play mode | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| Drill board | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |

The board is the element the earlier audit expected to overflow. It does not. At
375 pixels each square measures 37 by 37 and the board sits inside its card.

Control heights measured at 375 pixels, all of them at or above the 44 pixel
floor: mode toggle 171 by 44, board style select 129 by 44, language toggle 133
by 44, side toggle 181 by 44, `Drill this variation` 173 by 44, opening cards
321 by 163, drill move buttons 159 by 44.

Text contrast was measured against the alpha composited background rather than
the single nearest background colour, because every panel here paints a
translucent white over a near black page. The lowest ratio among the sampled
labels is 6.06 to 1 for the active accent `rgb(164, 125, 255)` on the composited
`rgb(21, 21, 21)`. Every other sampled label sits between 13.61 and 18.05 to 1.
The `axe-core` run lists colour contrast as incomplete for 34 nodes for exactly
this reason, and the manual measurement clears the ones it could not resolve.

## What was driven

- Learn and Play toggle. `aria-pressed` moved from `false` to `true`, and Play
  mode added a `You play both` and `Auto opponent` toggle, an `All openings`
  scope card reading `15 families`, an `All variations` card reading
  `477 total`, an `All lines` card reading `1837 lines`, a `Load more` button in
  the variation and line columns, and a `Play within this scope` action. Evidence
  `borsouvertures/12-play-mode-desktop.png`.
- White and Black toggle. `aria-pressed` moved to `true` and the drill board
  flipped: `a8` moved from the top left to `x 624, y 778` and `h1` moved to
  `x 41, y 195`, so rank 1 is now at the top. In the Sicilian main line drilled
  as Black the app had already played `e4` for White before the first user move.
  Evidence `borsouvertures/14-side-black-desktop.png` and
  `borsouvertures/15-drill-as-black.png`.
- Board style selector. The four options produce four distinct palettes,
  measured as the computed background colour of `a8` over `b8`: Chess.com
  `rgb(217, 215, 201)` over `rgb(107, 143, 65)`, Lichess `rgb(240, 217, 181)`
  over `rgb(181, 136, 99)`, Nord Blue `rgb(236, 239, 244)` over
  `rgb(76, 86, 106)`, Sand `rgb(243, 233, 220)` over `rgb(194, 168, 120)`.
  Evidence `borsouvertures/16-board-style-sand.png`.
- Tree visualisation toggle, labelled `Arrows` and `Buttons`. It toggles on
  click, and it also follows the viewport on its own: `aria-pressed` reads
  `false` at 1280 pixels and `true` at 375 pixels, with no reload and no user
  action in between. At 375 pixels the drill panel therefore offers each book
  move as a 159 by 44 button instead of an on-board arrow.
- Show moves toggle. `aria-pressed` moves between `false` and `true`.
- Opening expansion. Selecting `Italian Game` filled the Variations column with
  19 entries; selecting `Giuoco Piano` filled the Lines column with the ten
  `Italian Game: Giuoco Piano…` entries and their ECO codes, and enabled the
  previously disabled `Drill this variation` button. Evidence
  `borsouvertures/03-variation-selected-desktop.png`.

## The English and French catalogues

The language toggle was exercised in Learn mode and in Play mode, in both
directions, and the page was read as text each time rather than eyeballed.

Every user facing string changes. `Learn` and `Play` become `Apprendre` and
`Jouer`, `Board style:` becomes `Style d'échiquier :`, `Train as:` becomes
`S'entraîner avec :`, `White` and `Black` become `Blancs` and `Noirs`,
`Openings` `Variations` `Lines` become `Ouvertures` `Variantes` `Lignes`,
`27 variations` becomes `27 variantes`, `Drill this variation` becomes
`Travailler cette variante`, the empty state
`Pick an opening + variation to drill its tree.` becomes
`Choisissez une ouverture et une variante pour travailler son arbre.`, and in
Play mode `You play both` `Auto opponent` `All openings` `15 families`
`477 total` `Load more` `Play within this scope` become `Vous jouez les deux`
`Adversaire automatique` `Toutes les ouvertures` `15 familles` `477 au total`
`Voir plus` `Jouer dans ce périmètre`. Inside the drill, `Change selection`
`Hide moves` `Show moves` `Arrows` `Buttons` `Reset drill` `Reveal arrows`
`Lines visited` become `Changer la sélection` `Masquer les coups`
`Afficher les coups` `Flèches` `Boutons` `Recommencer la séance`
`Afficher les flèches` and the panel heading `Drill:` becomes `Travail :`.

The `aria-label` attributes translate too, which is easy to forget: the four
labelled buttons read `Toggle mode`, `Board style:`, `Interface language`,
`Choose side` in English and `Changer de mode`, `Style d'échiquier :`,
`Langue de l'interface`, `Choisir la couleur` in French.

No raw key leaks. A walk of every text node in the document, matching
`^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+)+$`, returned nothing in either language
in either mode. The only hit on a first pass was the literal string `Chess.com`,
which is the board style name and not a key.

No English survives in the French page. A scan for `variations`, `lines`,
`Openings`, `Variations`, `Lines`, `Load more`, `Play within`, `Pick at least`,
`Board style`, `Train as`, `You play both`, `Auto opponent`, `All openings`,
`All variations`, `All lines`, `families` and `total` matched only `total`,
inside the correctly French `477 au total`.

Opening, variation and line names stay in English in the French page:
`Modern Defense`, `Sicilian Defense`, `Giuoco Piano`,
`Italian Game: Giuoco Piano, Aitken Variation`. These come from the baked
opening data keyed by ECO code, not from the interface catalogue, and a French
chess player reads ECO names in this form routinely. Recorded as an observation,
not counted as a defect.

Evidence `borsouvertures/01-landing-en-desktop.png`,
`borsouvertures/02-landing-fr-desktop.png`,
`borsouvertures/13-play-mode-fr-desktop.png`,
`borsouvertures/31-argent-phone-drill.png`.

## Playing a real sequence on the drill board

Drilling `Italian Game` then `Giuoco Piano` as White, the moves were made by
pressing the mouse on the origin square, moving through intermediate points and
releasing on the destination square. The board state was read back each time
from the `data-piece` attributes rather than from a screenshot.

`e2` to `e4` put `wP` on `e4` and the opponent answered `e7e5`, so `e5` held
`bP`. `g1` to `f3` put `wN` on `f3` and the opponent answered `Nc6`, so `c6`
held `bN`. `f1` to `c4` put `wB` on `c4` and the opponent answered `Nf6`, so
`f6` held `bN`. The board updates on every ply and the opponent replies on its
own, so the state synchronisation the `useEffect` removal touched is intact.

The drill was then played to the end of a line by reading the book move out of
the arrow overlay each ply. The arrow layer publishes the move in a marker id of
the form `bors-board-arrowhead-<n>-<from>-<to>`, so the sequence is exact:
`d2d4`, `f3d4`, `c1g5`, `g5h4`, `f2f4`. On the last of those the panel counter
moved from `Lines visited 0 / 10` to `1 / 10`. Evidence
`borsouvertures/10-drill-line-complete.png`.

`Reset drill` returns the board to the start position, and `Reveal arrows` shows
exactly one arrow at the start position, `e2` to `e4`, which is the only book
move there. The reveal is a one shot hint: after each move the button returns to
`Reveal arrows` and the overlay clears. Evidence
`borsouvertures/07-drill-start-arrows.png`.

One thing that looked like a defect and is not. When drilling `Giuoco Piano`,
whose ten lines all pass through `3…Bc5`, the opponent answered `3.Bc4` with
`Nf6` twice in a row, which is the Two Knights move order. The drill then walked
a Two Knights line and still credited it as one of the ten. Reading the mini
board FEN out of each line card settles it: the card for
`Italian Game: Giuoco Piano, Holzhausen Attack` carries
`r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R`, a knight on `f6` and
the bishop still on `f8`. That line genuinely reaches the position through
`3…Nf6`, so `Nf6` is a book reply inside the selected variation and the counter
was right. A second drill on `Italian Game` `Main Line`, which has exactly one
line, confirms the tree is scoped correctly: `e7e5`, `b8c6`, and the counter
went straight to `1 / 1` with no further book move.

## Touch behaviour at a phone viewport

With coarse pointer emulation active at 375 by 667, taps sent as touch events
reached and operated the language toggle, the side toggle, the mode toggle, an
opening card, a variation card, the `Travailler cette variante` button and a
book move button. Tapping the `c5` move button moved the black pawn from `c7` to
`c5` and the app answered with a new book move button `g6`. A touch drag from
`g7` to `g6`, sent as `touchStart`, four `touchMove` points and `touchEnd`,
moved the pawn. Every control that was tapped measures 44 pixels tall or more,
so nothing was too small to hit. Evidence
`borsouvertures/30-argent-phone-landing.png` and
`borsouvertures/31-argent-phone-drill.png`.

Tapping a board square does nothing at all. See defect 5.

## Defect 1, the document language attribute stays English in French

**What was done.** Switched the interface to French with the language toggle and
read `document.documentElement.lang`.

**Expected.** `fr`, so assistive technology reads the French text with a French
voice and hyphenation rules.

**Observed.** `en`, in both Learn mode and Play mode, while every visible string
on the page was French. The value was read twice, in separate checks, and was
`en` both times.

**Screenshot.** `borsouvertures/02-landing-fr-desktop.png` shows the fully
French page whose `lang` was measured as `en`.

## Defect 2, counts of one render as plurals in both catalogues

**What was done.** Expanded `Italian Game` and read the variation cards, in
English and then in French.

**Expected.** `1 line` and `1 ligne`.

**Observed.** `1 lines` in English and `1 lignes` in French, on every variation
holding a single line, which is eleven of the nineteen Italian Game variations
alone. The English catalogue and the French catalogue are both affected, so the
gap is the count formatting rather than one translation.

**Screenshot.** `borsouvertures/40-plural-1-lines.png`, where `Main Line` and
`Anti-Fried Liver Defense` both read `1 lines`.

## Defect 3, thirty-two draggable pieces are ARIA buttons with no name

**What was done.** Ran `agent-browser a11y`, which runs `axe-core` 4.12.1, on
the drill board.

**Expected.** No serious violation.

**Observed.** `[serious] aria-command-name: ARIA commands must have an
accessible name (32 nodes)`. Every piece on the board is wrapped by the drag and
drop layer in
`div[role="button"][aria-roledescription="draggable"][aria-describedby="dnd-bors-board"]`
with no accessible name, one per occupied square, listed for
`#bors-board-square-h1` through the whole back rank and both pawn ranks. A
screen reader user tabbing the drill board meets thirty-two buttons called
nothing.

This is distinct from the defect the earlier audit recorded against the selector
mini boards. Those are now fixed, see the section below.

**Screenshot.** `borsouvertures/04-drill-initial-desktop.png` shows the board the
audit ran against. The finding itself is textual and is quoted verbatim above.

## Defect 4, the page has no main landmark and no level one heading

**What was done.** Same `axe-core` run.

**Expected.** No moderate violation of document structure.

**Observed.** Three moderate violations: `landmark-one-main`, `Document should
have one main landmark`, on `html`; `page-has-heading-one`, `Page should contain
a level-one heading`, on `html`; and `region`, `All page content should be
contained by landmarks`, on 18 nodes. The panel titles are `h3` elements and the
site title `Borsouvertures` is a `div`, so there is no `h1` anywhere and no
document outline to navigate by.

**Screenshot.** `borsouvertures/01-landing-en-desktop.png`, where the largest
text on the page, `Borsouvertures`, is the unheaded `div` in question.

## Defect 5, clicking or tapping a board square does nothing

**What was done.** On the desktop viewport, clicked `#bors-board-square-e2` and
then `#bors-board-square-e4`. On the phone viewport, sent a touch tap to the
centre of `c7` and then to the centre of `c5`.

**Expected.** Either the piece moves, or the first square is at least visibly
selected so the user knows the interaction was received.

**Observed.** Nothing happens. The board state read back identical before and
after in both cases. The square's computed `background-color` stayed
`rgb(243, 233, 220)`, its `box-shadow` stayed `none`, and
`document.activeElement` stayed `BODY`. Moves only go through a drag, which does
work with a mouse and with touch, or through the `Buttons` mode move buttons.

The impact is bounded, because the tree mode switches itself to `Buttons` at
narrow viewports, so a phone user is offered tappable move buttons by default. A
touch device at a wide viewport gets the `Arrows` default and has only the drag
path. What has no mitigation is the silence: a first time user tapping a piece
gets no feedback of any kind.

**Screenshot.** `borsouvertures/22-drill-375-panel.png` shows the `Boutons` mode
the narrow viewport falls back to.

## Defect 6, the favicon returns 404

**What was done.** Read the network request log for the whole session.

**Expected.** No failing request.

**Observed.** One non 200 response across the entire walkthrough,
`GET https://borsouvertures-pr-40.preview.borso.fr/favicon.ico` returning 404.
Everything else, including `/openings.json`, `/manifest.webmanifest`,
`/pwa-192x192.png` and the Workbox service worker script, returned 200. The 404
did not produce a console entry.

## Errors

None. `agent-browser errors` returned empty and `agent-browser console` returned
empty, both checked mid session and again at the end, after the full
walkthrough: both languages, both modes, all four board styles, both sides,
three viewport sizes, two complete drills, a reset, and the arrow and move and
tree toggles. There is nothing to quote verbatim because nothing was logged.

## The earlier mobile viewport audit, defect by defect

[`docs/features/meta/mobile-viewport-audit/report.md`](../mobile-viewport-audit/report.md)
recorded two `borsouvertures` defects. Both are fixed.

**Defect 7 of that report, 480 tiny focusable elements.** Fixed. The decorative
mini board inside each selector card is now wrapped in
`<div inert aria-hidden="true">`. Counting elements matching
`a[href],button,select,input,textarea,[tabindex]:not([tabindex="-1"]),[role="button"]`
on the landing view gives 1127 in the raw DOM, of which 1088 sit inside an
`inert` subtree and are not focusable, leaving 39 real tab stops. The
`--interactive` accessibility snapshot of the landing view lists only the four
header controls, the fifteen opening cards, the three panel headings and the
drill button.

**Defect 8 of that report, toggles and the board style select 36 pixels tall.**
Fixed. At 375 pixels the mode toggle is 44 tall, the language toggle 44, the
side toggle 44 and the board style select 44. The `Drill this variation` button
is 44. No control measured below 44 in this pass.

The report's remaining defects belong to `borso-fr`, `pragma` and
`last-loop-lepin` and were not in scope here.

## What could not be checked

Argent's `gesture-tap` never completed against this Chromium. Every call ended
with `CDP request Input.dispatchMouseEvent timed out`, with and without the
emulation session attached, so whatever argent sends alongside the mouse event
is not being acknowledged here. Touch input was therefore driven by hand over
the protocol. The consequence is that argent's own gesture semantics, its tap
duration and its pointer id handling, went untested. What was tested is the
page's response to `Input.dispatchTouchEvent`, which is the same event stream a
real finger produces.

No real device was involved. There is no `/dev/kvm`, no Android SDK and no
macOS, so a viewport override on a desktop Chromium is the closest available
approximation. That leaves the same four gaps the earlier audit named: the
software keyboard, iOS Safari and Android Chrome scroll and `100vh` behaviour,
touch event ordering under a real compositor, and rendering at a real device
pixel ratio.

Play mode was opened, translated, measured and screenshotted, but no game was
played through it. Only the Learn mode drill board was played, twice, to the end
of a line. The `Play within this scope` flow, the `You play both` and
`Auto opponent` toggle behaviour, and the `Load more` pagination in the
variation and line columns were not exercised.

The drill was never played to completion, only to the end of individual lines.
`Lines visited` reached `1 / 10` on the Giuoco Piano and `1 / 1` on the Italian
Game main line, so the counter increments and can reach its maximum, but what
the interface does at the moment every line has been visited was not observed.

Colour contrast was measured for the header, the toggles, the board style
select, the drill buttons and the panel labels. Text drawn inside the board,
which is the rank and file coordinates, and the text on the selector cards were
not measured.

Only three viewport widths were measured, 375, 393 and 1280. Nothing between 393
and 1280 was checked, so the width at which the tree mode flips between
`Buttons` and `Arrows` is not known, only that it is somewhere in that range.

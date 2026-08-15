# Preview validation of `borsouvertures` for PR 40

> **Correction, 2026-08-14.** This record says argent's `gesture-tap` could not be
> used, because every call returned `CDP request Input.dispatchMouseEvent timed out`.
> That was true of these runs and is not true of the tool: `gesture-tap` was
> re-verified working, and the timeouts were almost certainly agent-browser holding
> the same browser, which wedges argent's input dispatch exactly as it wedges
> `Page.navigate`. Two later phone audits read the claim and sent no touch events at
> all. Give argent its own browser with `scripts/argent.sh`; see
> [`docs/knowledge/driving-previews-with-agent-browser-and-argent.md`](../../../knowledge/driving-previews-with-agent-browser-and-argent.md).
> The findings below stand; only the claim about the tool is withdrawn.

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

# Regression check at `f88e1d0`

2026-08-08. Re-run of the walkthrough above against
`https://borsouvertures-pr-40.preview.borso.fr`, looking for regressions
introduced since the validation recorded in the previous sections.

## Verdict

**No regressions found.** Every functional check that passed before passes
again, and none of the three changes broke anything that was working.

**Defect 1 is closed.** The `lang` attribute now follows the language toggle in
both directions.

The other five defects all still reproduce, unchanged: the plural rule, the
thirty-two unnamed ARIA buttons, the missing `main` landmark and level one
heading, the board square that ignores a click or a tap, and the 404 favicon.

The preview was confirmed to be serving the new code before anything was
measured. `https://borsouvertures-pr-40.preview.borso.fr/` served
`assets/index-Do7mtLcu.js` with a `last-modified` of 2026-08-08 19:57, and
`grep -c languageChanged` on that bundle returns 1, so the `i18n.ts`
subscription that change 1 adds is in the shipped code.

## Change 1, the `lang` attribute now follows the EN/FR toggle

Closed. This was defect 1 of the baseline, and it no longer reproduces.

On a fresh load with `localStorage` cleared, `document.documentElement.lang`
reads `en`, which is the English fallback this app is meant to land on. The
toggle was then pressed six times, reading the attribute after each press:

| Press | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| `document.documentElement.lang` | `fr` | `en` | `fr` | `en` | `fr` | `en` |

It alternates cleanly and is still tracking on the sixth switch, so the
subscription is not being dropped or double-registered.

Two further checks. With the interface in French the attribute reads `fr` while
`document.body.innerText` begins
`Borsouvertures | Apprendre | Jouer | Style d'échiquier : …`, so the attribute
and the rendered catalogue agree. `localStorage` holds
`{"borsouvertures.language":"fr"}`, and after a reload with that value stored
the attribute is `fr` on the first paint, so the initial-language path sets it
too rather than only the change event.

The same six-press check was repeated through touch on the phone viewport, and
produced the same alternation, `fr en fr en fr en`.

Evidence `borsouvertures/regress-01-landing-fr-lang-fr.png`.

## Change 2, `isSquare` is a plain predicate and `Selection` ids are simpler

No regression. The board was driven hard, with the console and the page-error
log read after every group of actions. Nothing threw, and nothing was logged at
any level.

`toSquare` is reached from `uciFromSquare` and `uciToSquare`, which are called
by `learnTreeMachine.utils.ts`, `playMachine.utils.ts`, `moveNotation.utils.ts`
and `uciToArrow`. The user drag path reaches them through `BoardView.tsx`, which
builds the UCI with `buildDroppedUci(sourceSquare, targetSquare)` and gates it on
`selectBoardDropDecision`, so a drop off the board arrives as a `null` target and
is discarded before any parse happens.

What was driven, all of it with an empty console and an empty error log
afterwards:

- **Legal moves.** `e2e4` put `wP` on `e4` and the opponent answered `e7e5`.
  `g1f3` put `wN` on `f3` and the opponent answered `Nc6`. Board state was read
  back from the `data-piece` attributes each time, not from a screenshot.
- **A line played to its end.** Continuing from there, `f1c4`, `e1g1`, `d2d4`,
  `f3d4`, `c1g5`, `f2f4`, `f4e5`, `b1c3`, each read out of the arrow overlay's
  `bors-board-arrowhead-<n>-<from>-<to>` marker id. The counter moved from
  `Lines visited 0 / 10` to `1 / 10`. Evidence
  `borsouvertures/regress-02-drill-line-complete.png`.
- **An illegal move.** `a1` to `a5`, a rook through its own pawn. Rejected, no
  piece appeared on `a5`, no dialog, no log entry.
- **A legal move that is out of book.** `a2a3`. The board refused it and the
  panel opened the out-of-book dialog reading
  `That move isn't in this variation. Try one of the book moves shown.` with
  `Try again` and `Reveal book moves`. This is the intended path, and it is the
  one that most nearly exercises a bad square string.
- **A drag starting from an empty square.** `e4` to `e5` with `e4` empty.
  Nothing happened.
- **A drag ending on the same square it started on.** `e2` to `e2`, which builds
  the UCI `e2e2`. Nothing happened.
- **Five drops outside the board.** A piece was picked up and released at
  viewport points `(20, 60)`, `(1270, 990)`, `(12, 890)`, `(400, 100)` and
  `(740, 500)`, all outside the 700 by 700 board container that sits at
  `(24, 178)`. The piece stayed on its origin square every time.
- **Clicks that are not drags.** An empty square, an occupied square, and the
  page background at `(10, 10)`. Nothing moved and nothing was logged.
- **A burst of ten drags** issued back to back with no wait between them.
- **The same abuse through touch**, at 375 by 667 with `pointer: coarse`,
  `hover: none` and `maxTouchPoints: 5`. A touch drag from `e2` to `e4` moved the
  pawn and drew the reply, a touch drag from `g1` released at `(5, 5)` left the
  knight in place, and a tap on the `Nf3` move button played it.
- **Play mode**, which the baseline did not exercise at all and which uses the
  same UCI helpers through `playMachine.utils.ts`. Three book moves narrowed the
  match count from `347` to `7` to `2` to `1`. `Undo` and `Reset game` both
  worked, and an out-of-book move opened the same dialog. Evidence
  `borsouvertures/regress-05-play-mode.png`.
- **Drilling as Black.** `e7e5`, `b8c6`, `f8c5`, reaching `1 / 10`. Evidence
  `borsouvertures/regress-04-drill-as-black.png`.

## Change 3, `require-array-sort-compare` replaced the unicorn rule

No behaviour change, and no user-visible surface at all.

The two sorts are `listTranslationKeys` in
`apps/borsouvertures/site/i18n/i18n.utils.ts` and the three calls in
`i18n-parity.core.ts`. Both now sort with `compareTranslationKeys`, which wraps
`localeCompare`. Neither is reachable from the interface: they exist to let the
parity gate compare the English and French key lists. `grep -c localeCompare` on
the shipped bundle returns 0, so this code is tree-shaken out of the deployed
app entirely and cannot have changed what a user sees.

The user-visible lists were checked anyway, and are ordered exactly as before.
The fifteen openings appear in the same sequence in English and in French, with
the same counts: Modern Defense 27, English Opening 33, Pirc Defense 10,
Scandinavian Defense 23, Caro-Kann Defense 44, Sicilian Defense 88, French
Defense 45, Vienna Game 21, Scotch Game 34, Four Knights Game 8, Italian Game 19,
Ruy Lopez 36, Queen's Gambit 67, Catalan Opening 5, Nimzo-Indian Defense 17. The
Italian Game still expands to 19 variations in the same order, and Giuoco Piano
still lists 10 line cards.

## The baseline, re-confirmed

**Every toggle toggles.** Learn and Play moves `aria-pressed` from `false` to
`true` and switches the screen. White and Black moves to `true` and flips the
board: `a8` moved from `(83, 237)` to `(665, 819)` and `h1` moved the other way,
so rank 1 sits at the top, and White had already played `e4` before the first
user move. EN and FR is covered above. `Show moves` moves between `false` and
`true`. The tree mode toggle moves between `false` and `true` on click and still
reads `true` on its own at 375 pixels, where it offers move buttons instead of
arrows. Playing a move by tapping one of those buttons works. Evidence
`borsouvertures/regress-03-buttons-mode.png`.

**The four board styles are unchanged**, measured as the computed background of
`a8` over `b8`, and identical to the values the baseline recorded: Chess.com
`rgb(217, 215, 201)` over `rgb(107, 143, 65)`, Lichess `rgb(240, 217, 181)` over
`rgb(181, 136, 99)`, Nord Blue `rgb(236, 239, 244)` over `rgb(76, 86, 106)`, Sand
`rgb(243, 233, 220)` over `rgb(194, 168, 120)`.

**Both catalogues are complete.** A walk of every text node matching
`^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+)+$` returned only the literal
`Chess.com`, which is a board style name, in all of these states: landing,
opening expanded, variation selected with lines listed, drill board, and play
session, in both languages. No English string survives in the French page and no
French string appears in the English page, checked with a word list covering the
selector columns, the play-mode scope cards and every drill control. The
`aria-label` attributes still translate, `Toggle mode`, `Board style:`,
`Interface language`, `Choose side` against `Changer de mode`,
`Style d'échiquier :`, `Langue de l'interface`, `Choisir la couleur`, and inside
the drill `Show moves toggle` and `Tree visualization mode` against
`Afficher les coups` and `Mode de visualisation de l'arbre`.

**An opening expands and a variation loads onto the board.** Selecting
`Italian Game` filled the Variations column with 19 entries, selecting
`Giuoco Piano` filled the Lines column with 10 cards and enabled
`Drill this variation`, and pressing it opened the drill on the start position.

**A real sequence of moves plays through the drill to completion.** Two full
drills were played, described under change 2 above, plus a third on
`Italian Game` `Main Line`, which has exactly one line. That third drill was
played to `1 / 1`, and reaching it revealed the completion state the baseline
had not observed: the panel shows
`Variation cleared — every line visited at least once` with two new controls,
`Drill again` and `Switch to Play with this scope`. Evidence
`borsouvertures/regress-09-variation-cleared.png`.

**No console message of any level.** `agent-browser console` and
`agent-browser errors` were read after every group of actions through the whole
session and returned empty every time, including a final sweep over a fresh
load that switched language twice, expanded an opening, flipped sides, entered
and left Play mode and changed the board style. The touch pass listened on
`Runtime.consoleAPICalled`, `Log.entryAdded` and `Runtime.exceptionThrown`
directly over the protocol and recorded no event.

**No horizontal overflow.** Each cell is
`document.documentElement.scrollWidth` over `clientWidth`.

| State | 375 | 393 | 1280 |
|---|---|---|---|
| Landing | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| Opening expanded | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| Variation selected | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| Drill board | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |
| Play mode | 375 / 375 pass | 393 / 393 pass | 1280 / 1280 pass |

**The two fixes from the earlier mobile viewport audit still hold.** On a fresh
landing at 1280 the decorative mini boards are still 15 `inert` and
`aria-hidden` subtrees holding 480 of the 500 elements matching the focusable
selector, leaving 20 real tab stops; with an opening and a variation expanded the
figures are 1408 of 1457, leaving 49. Control heights at 375 are all at or above
44: mode toggle 171 by 44, board style select 129 by 44, language toggle 133 by
44, side toggle 182 by 44, `Drill this variation` 173 by 44, opening cards 321 by
163. Evidence `borsouvertures/regress-07-landing-375.png`.

**Contrast is unchanged.** Measured against the alpha composited background as
before, the lowest sampled ratio is again 6.06 to 1 for the active accent
`rgb(164, 125, 255)` on the composited `rgb(21, 21, 21)`, rising to 6.52 to 1
where the composite is `rgb(11, 11, 11)`. The brand title and the panel headings
sit at 16.79 to 1 and the board style select at 17.89 to 1.

## The six baseline defects, one by one

| # | Defect | Status at `f88e1d0` |
|---|---|---|
| 1 | `document.documentElement.lang` stays `en` in French | **Closed** |
| 2 | Counts of one render as `1 lines` and `1 lignes` | Still reproduces |
| 3 | 32 draggable pieces are ARIA buttons with no name | Still reproduces |
| 4 | No `main` landmark and no level one heading | Still reproduces |
| 5 | Clicking or tapping a board square does nothing | Still reproduces |
| 6 | `/favicon.ico` returns 404 | Still reproduces |

**Defect 1.** Closed, see change 1 above.

**Defect 2.** Unchanged. Expanding `Italian Game` gives `Main Line1 lines`,
`Anti-Fried Liver Defense1 lines`, `Blackburne-Kostić Gambit1 lines`,
`Deutz Gambit1 lines` and seven more reading `1 lines`, eleven of the nineteen.
French gives `1 lignes` on the same eleven. Evidence
`borsouvertures/regress-06-plural-1-lines.png`.

**Defect 3.** Unchanged. `agent-browser a11y` on the drill board reports
`[serious] aria-command-name: ARIA commands must have an accessible name
(32 nodes)`, the same count on the same
`div[role="button"][aria-roledescription="draggable"]` wrappers.

**Defect 4.** Unchanged. The same axe-core run reports the same three moderate
violations, `landmark-one-main` on `html`, `page-has-heading-one` on `html`, and
`region` on 18 nodes. `color-contrast` is still incomplete for 34 nodes, and the
manual measurement above resolves them.

**Defect 5.** Unchanged, on both input methods. With a mouse, clicking
`#bors-board-square-e2` and then `#bors-board-square-e4` left the board
identical, the square's `box-shadow` stayed `none` and its `background-color`
stayed at the palette value. Through touch at 375, tapping the centre of `e2` and
then `e4` also left the board identical, with `document.activeElement` staying
`BODY`. One small difference from the baseline, which is a detail rather than a
change in behaviour: after a mouse click on an occupied square
`document.activeElement` is now the draggable `DIV` rather than `BODY`. Nothing
visible follows from it, there is still no selection highlight and no move, so
the defect stands as written.

**Defect 6.** Unchanged. `curl` returns 404 for
`https://borsouvertures-pr-40.preview.borso.fr/favicon.ico`, and it is the only
non-200 entry in the session's network log. `/openings.json`,
`/manifest.webmanifest` and `/pwa-192x192.png` all return 200.

## Observations that are not regressions

**`Reset drill` clears the visited counter.** Pressing it on a 10-line variation
returns the board to the start position and the counter from `3 / 10` to
`0 / 10`. This matches `start()` in `learnTreeMachine.utils.ts`, which assigns
`visitedLeafIds = EMPTY_VISITED`, and it matches the control's French label
`Recommencer la séance`, so it reads as the intended restart rather than a fault.
It is recorded here because the baseline listed the drill's completion behaviour
as unchecked, and anyone reading that gap should know the counter does not carry
across a reset.

**A drilled branch can dead-end before the variation is cleared.** On
`Giuoco Piano` one run reached `1 / 10` and then had no book move left, with only
`Reset drill`, `Reveal arrows` and `Change selection` offered. A second run on the
same variation played ten consecutive book moves and reached `3 / 10` without
dead-ending. So progress does accumulate across several lines inside one session,
and whether a session can reach `10 / 10` depends on which replies the random
opponent picks. This was not measured against the baseline and is not attributable
to any of the three changes.

## What could not be checked

`10 / 10` on a ten-line variation was not reached. The completion state itself
was reached and is described above, on the single-line `Main Line`, so the
cleared banner and its two controls are confirmed to exist and to render.

Argent's own `gesture-tap` was not usable, exactly as the baseline and the
knowledge document record. Touch was driven as `Input.dispatchTouchEvent` pairs
over a protocol connection held beside argent on `chromium-cdp-9224`, with
`Emulation.setDeviceMetricsOverride` at 375 by 667 and
`Emulation.setTouchEmulationEnabled` at five touch points. The page reported
`pointer: coarse` true, `hover: none` true and `maxTouchPoints` 5.

No real device was involved, so the four gaps the baseline named remain: the
software keyboard, iOS Safari and Android Chrome scroll behaviour, touch event
ordering under a real compositor, and rendering at a real device pixel ratio.

One harness note for the next run, since it cost time here and is not a fault in
the page. A drag only registers if the mouse moves in several steps and the
target square is inside the viewport. Two intermediate points were not enough,
eight were; and at a viewport height of 633 the lower half of the board sits
below the fold, so `mouse move` never reaches those squares. Driving the drill at
1280 by 1000 removed both problems.

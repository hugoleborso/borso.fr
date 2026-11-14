---
name: Borsouvertures
description: A phone-first chess opening trainer set like a Swiss tournament poster.
colors:
  page: "#ffffff"
  ink: "#111111"
  ink-muted: "#595959"
  surface: "#f1f1ee"
  rule: "#d6d6d1"
  primary: "#111111"
  on-primary: "#ffffff"
  accent: "#d52b1e"
  recalled: "#12733f"
  on-recalled: "#ffffff"
  missed: "#c8281a"
  on-missed: "#ffffff"
  signal: "#ffd43b"
  on-signal: "#111111"
  dark-page: "#111111"
  dark-ink: "#f4f4f2"
  dark-ink-muted: "#a6a6a6"
  dark-surface: "#1e1e1e"
  dark-rule: "#343434"
  dark-primary: "#f4f4f2"
  dark-on-primary: "#111111"
  dark-accent: "#ff5a45"
  dark-recalled: "#3dbe73"
  dark-missed: "#ff6b5a"
  dark-on-state: "#0b0b0b"
  evaluation-white: "#f4f4f2"
  on-evaluation-white: "#111111"
  evaluation-black: "#2b2b2b"
  on-evaluation-black: "#f4f4f2"
typography:
  screen-title:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  section-title:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  count:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  idea:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    letterSpacing: "0.06em"
  notation:
    fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
    fontSize: "0.875rem"
  segment:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.25
  tab-label:
    fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.25
rounded:
  control: "6px"
  sheet: "12px"
spacing:
  gutter: "16px"
  tab-bar: "56px"
  action-bar: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
    height: "48px"
  button-default:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "48px"
  section-tab-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    height: "44px"
  tab-bar:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink-muted}"
    height: "{spacing.tab-bar}"
    icon: "24px glyph above a one-line label"
  status-band:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  board-mark-recalled:
    backgroundColor: "{colors.recalled}"
    textColor: "{colors.on-recalled}"
    size: "28% of the board, centred"
  board-mark-missed:
    backgroundColor: "{colors.missed}"
    textColor: "{colors.on-missed}"
    size: "7.5% of the board, on a square's corner"
  mini-board:
    size: "56px"
  evaluation-bar:
    width: "24px"
    backgroundColor: "{colors.evaluation-black}"
    fill: "{colors.evaluation-white}"
    text: "9px bold, tabular figures, at the leading side's end"
---

# Design System: Borsouvertures

## Overview

The trainer is used on a phone, one-handed, in a few minutes on a metro ride. The world is the Swiss tournament poster of the 1960s chess olympiads: a white or black ground, one grotesk at two weights, a 2 px ink rule that opens each section, and flat colour fields with no gradient, glass or shadow. The board is the poster's image. It spans the full width of a phone, edge to edge, and everything else sits below it within thumb reach.

The signature move is the board mark. Once a card is answered, a flat disc lands on the board itself: a white check in a green disc when the card was recalled, a white cross in a red disc when it was missed. The board is the poster's image, so the verdict sits in the image and reads at arm's length, and the space under the board goes to the move and its idea (operator, 2026-11-13, who found the recalled band took space for nothing).

Light and dark follow the system setting. The four board themes (Lichess, Chess.com, Nord, Sand) are unchanged and live in the settings sheet with the language.

## Colors

The strategy is restrained neutrals with colour that only carries meaning. Every pair below was measured at 4.5:1 or more in both schemes.

### Primary

- **Ink** (`ink`, `primary`): text, rules and the filled primary button. It flips to near-white in dark mode, so the primary button is always the strongest object on screen.
- **Poster red** (`accent`): the current tab marker, the focus ring, the brand square and link underlines. Never a fill for a control.

### Tertiary

- **Recalled green** (`recalled`) and **missed red** (`missed`): the board mark only, plus the sign-in error. In dark mode they turn bright and carry near-black text.
- **Evaluation white and black** (`evaluation-white`, `evaluation-black`): the two sides of the evaluation bar only. They mean the two sides of the game, so they stay the same in dark mode.
- **Signal yellow** (`signal`): notices (an added or refused line in Explore) and text selection.

### Neutral

- **Page**, **surface** (a second neutral layer for the deck game's status band, hover and empty bars), **rule** (hairlines between rows) and under the tab bar. The tab bar sits on the page colour, not on an inverted shell (operator, 2026-11-13, who found the black bar heavy).

### Named Rules

- **Colour has a job.** A colour that does not mean recalled, missed, here or notice stays out.

## Typography

One system grotesk stack, Helvetica Neue first, so nothing is fetched and the page works offline. Two weights, regular and bold. Fixed rem sizes, no fluid type.

### Hierarchy

- Screen title 24 px bold, section title 20 px bold, body 16 px, idea text 17 px at 1.6 line height and 65 characters wide, labels 14 px bold uppercase tracked, counts 48 px bold with tabular figures, move notation in the system monospace.

## Layout

- **The fold rule (operator, 2026-11-13).** At 375 × 812, minus the tab bar and the safe area, a screen shows one section at a time when its sections would not all fit without scrolling. Split them with the `SectionTabs` segmented control inside the screen. One list that scrolls inside a tab is fine. Two different sections stacked past the fold are not. Applied today: Today (Session / Ahead when the plan is empty / Retention), a deck page (Review / Lines / Play, and an opened line replaces the deck header and its tabs, as a drill-down with its own back button), Stats (Retention / Accuracy, with the streak above), Credits (Lichess / Wikipedia / Stockfish). Explore needs no tabs: the opening name and the moves played sit above the board, the side toggle beside them, and the book moves below it in the one list that scrolls, its height set from the board width so the page never scrolls. Back, start over and *Add to my deck* sit in `ActionBar`, and the notice of an add sits at the top of the list.
- **The review session fits one screen.** Top bar, progress row, board, prompt line, the idea and the action bar must be visible together at 375 × 812, including a name card's four choices. The space the result band gave back goes to the idea, three lines on a phone instead of two. Every card kind uses the same board width, so the board never changes size from one card to the next; a name card's four choices still fit, each choice at least 60 px tall so a two-line name does not resize its row (measured 13 px of room at 375 × 812).
- **Thumb bar.** The screen's main actions (Start, Show the move and Next, Review this deck, New game and Leave the game, Explore's back, start over and *Add to my deck*) sit in `ActionBar`, fixed above the tab bar on a phone and inline from 601 px. On a phone it has no rule and no fill of its own: it sits on the page colour, so the bottom reads as one light band of buttons over one hairline over the tabs.
- **Board width.** Full viewport width under 601 px, viewport minus 48 px up to 1023 px, half the viewport from 1024 px, capped at 560 px.
- The shell is one column with a 16 px gutter, 24 px from 601 px, at most 1024 px wide. The four tabs are fixed at the bottom with the safe-area inset, on the page colour with one hairline above them. Each tab is a 24 px `Icon` glyph over a 13 px semibold label on one line, in muted ink: a calendar with a square dot (Today), a stack of cards (Decks), three bars on a baseline (Stats), a compass (Explore). The glyphs share the app's 2.25 px square-cap stroke. The Decks tab says *Decks* in both languages and its accessible name is the screen title (*Opening decks*, *Decks d'ouvertures*), so a label never wraps; every tab's accessible name is its screen title. The current tab turns icon and label to ink and carries a 40 px poster-red bar centred on the hairline above its icon. Both states keep the same weight, so nothing moves when a tab becomes current (measured: identical boxes across all four tabs at 375 and 1280 px, English and French). From 1024 px the review session and the deck game put the board left and the card column right.

### Touch and stability (operator, 2026-11-13)

- **A swipe never grabs the wrong piece.** `BoardView` takes a `mover` (`white`, `black`, `both` or `none`) and lets only the pieces of the side to move drag, when that side may move: the reader's side in a review and in the deck game, both sides in Explore, nobody in the line stepper. The chessboard library puts `touch-action: none` on every piece, so the other pieces get `touch-action: manipulation` back and a swipe that starts on them is the browser's.
- **The shell never rubber-bands.** `overscroll-behavior: none` on the root and the body. Inner lists keep `overscroll-behavior: contain`.
- **No long-press selection on the board.** The board turns off text selection and the iOS callout.
- **Nothing resizes with its content in place.** Counts use tabular figures (the body sets `proportional-nums`, which a `tabular-nums` class overrides; the former `font-feature-settings: 'tnum' 0` beat every `tabular-nums` class). Explore's opening name holds two lines whether it needs one or two, a book move row holds two lines of names, the deck game keeps the line of the last reply even before the first one, and the book move list is rebuilt for each position instead of reusing rows across positions.

## Elevation & Depth

Flat. No shadow, no blur, no gradient. Depth comes from the 2 px ink rule that opens a section, 1 px hairlines between rows, and the scrim behind the settings sheet.

## Shapes

Squares. The board has square corners. Controls have a 6 px radius, the settings sheet 12 px at its top corners. Secondary buttons, the select and the sign-in field carry a 1.5 px ink border. The segmented control and the side toggle have no border: they sit on a surface track, and the selected segment is an ink fill.

## Components

### Buttons

Primary is an ink fill, default is an ink outline, quiet is underlined text. All are 48 px tall. Disabled drops to 40% opacity. A press scales to 98%.

### Section tabs

`SectionTabs` and `TabPanel` atoms: a segmented control on a surface track with `role="tablist"`. Hidden panels keep their state and stay in the DOM with `hidden`.

### Mini boards

- **The preview rule (operator, 2026-11-13).** Wherever an opening, deck, line or variation is named, a small board shows its position beside the name: deck rows, the deck page header, each line, Today's retention and ahead lists, Stats rows and each book move in Explore, which shows the position after the move from the side he plays. A name card's choices show none, because the preview would give the answer away.
- A deck row reads the deck's side and counts, then its retention over the last 30 days.
- `MiniBoard` is a static 8 × 8 grid of squares and the bundled piece SVGs, 56 px on a phone and 64 px from 601 px, never a live chessboard. A deck shows its first line after six plies, a line shows its last position, both from the reader's side.

### Board (operator, 2026-11-14)

The operator plays on Chess.com every day and asked for the board to behave like that one. `BoardView` copies the interaction model that strong chess sites share, and keeps the app's own themes, pieces and colours. Every board that takes a move has it, in the review, the deck game and Explore. The line stepper takes no move, so it keeps only the highlights and the right click.

- **Tap to move.** A tap on a movable piece selects it and gives its square the theme highlight. Each legal empty square gets a dot and each legal capture a ring, both in ink at 26%. A tap on a target plays. A tap on the piece again, or on a square it cannot reach, deselects. A tap on another movable piece switches to it. The rule that only the side to move drags still holds, and a tap on the other side's pieces selects nothing.
- **Drag to move.** The piece lifts under the finger. On a touch screen it grows 1.6 times and rises by half a square, so the finger does not hide it. Under a mouse it grows 1.15 times. The square under the finger gets an inner white ring. A drag shows the same dots and rings. A drop on an illegal square or off the board puts the piece back. A drop on its own square leaves it selected.
- **Last move and check.** The two squares of the move that led to the position take the theme highlight on every board, the opponent's reply included. `BoardView` finds that move by comparing the position with the one before it, so a jump of several moves highlights nothing. A king in check gets a red glow under it.
- **Promotion.** A pawn reaching the last rank opens a column of queen, knight, rook and bishop over the promotion square, on the page colour, over a scrim. Nothing is picked for the reader. A tap outside the column cancels and the pawn stays.
- **Coordinates and orientation.** Files and ranks sit inside the edge squares, 11 px bold, in the colour of the opposite square. The board turns for Black.
- **Desktop.** The mouse does the same as the finger. A right click marks a square in poster red at 60%, a right drag draws an arrow, and a left click clears both. A square is marked when the right button is pressed and released on it, because Chromium on Linux sends `contextmenu` on the press and would mark the start of every arrow.
- **No premove.** A premove saves time in a game with a clock. The deck game has no clock and Stockfish answers in 400 ms, so a premove would save nothing and add a state to explain. It is worth adding if games get a clock.
- **Move sound, off by default.** The settings sheet turns it on. It is a click of 70 ms synthesised with the Web Audio API, lower and 110 ms long for a capture, so nothing is fetched and it works offline. Only the reader's own moves click, because the opponent's reply arrives from a machine outside any event handler and the app has no effect to hang a sound on.

### Evaluation bar (operator, 2026-11-14)

- **Where.** A 24 px vertical bar on the left of the board in Explore, the line stepper and the deck game. The board gives up those 24 px, so board and bar take the room the board alone took, and the layout does not move when a reading arrives.
- **What it shows.** White's share fills from White's side, from the bottom when White is at the bottom and from the top when the board is turned for Black. The share is the winning chance of the centipawn reading (`50 + 50 × (2 / (1 + e^(−0.00368 × cp)) − 1)`), and a mate fills it whole. The text sits at the leading side's end on that side's colour, 9 px bold, as `+0.6`, `-1.2`, `0.0`, `+14` from ten pawns up, `M3` and `-M3` for a mate, `1-0` and `0-1` for a mate on the board. Its accessible name says it in words (*Evaluation: White is better by 0.6*).
- **Motion.** The fill slides to its new share over 500 ms with the quick ease-out, and jumps under `prefers-reduced-motion`.
- **Not in the review.** A review card asks the reader to recall the book move. A bar before the answer gives it away, since a swing after the opponent's move tells him something is to be taken. A bar after the answer would need its 24 px kept on every card, which breaks the rule that the board never changes size from one card to the next, for a number the outcome does not use. Explore, the line stepper and the game are where the reader studies a position, so the bar lives there.
- **Stockfish budget.** Each position is searched to depth 14, stopped at 500 ms. Measured on this sandbox's desktop CPU, five Explore positions took 44 to 139 ms and the game positions up to 247 ms. A phone is slower, so the 500 ms limit is the bound. The reading is cached by position key for 30 minutes, so a position seen again costs nothing, and a search whose position is left is stopped.
- **One worker.** The bar uses the same vendored worker as the deck game's opponent, through one queue. A second instance measured about 52 MB more renderer memory each, and two searches at once would double the heat. The opponent's search is asked first after the reader's move, so it runs first. Each evaluation lifts the strength limit before it searches, and each opponent search sets its strength again.
- **Waiting and failing.** Until the first reading arrives the bar sits at half with no text, and later readings keep the previous one until the new one lands. When the worker cannot load, offline before its first download for example, the bar turns invisible in its place and nothing is reported.
- **Setting.** *Evaluation bar: Hidden / Shown* in the settings sheet, shown by default. Hidden gives the 24 px back to the board.

### Board mark

`BoardView` draws the mark over the board after the answer and keeps it until *Next*. It is an overlay, so the layout does not move. It scales in over 220 ms and appears without motion under `prefers-reduced-motion`. It carries the `img` role and is named *Recalled* or *Missed*.

- **Recalled** puts a large check (28% of the board) in the centre, as the operator asked. Nothing under it is news, because the reader just played the move.
- **Missed** puts a small cross (7.5% of the board) on the top right corner of the square the book move lands on, the way chess sites mark a move. Opening moves land on the centre squares, so a centred cross would cover the very move the reader has to learn. The cross also points at it. A name card draws no move, so its cross sits in the board's top right corner and leaves the position readable.

### Prompt line

`PromptLine`, two fixed lines under the board, no fill: the lead in bold on a 24 px line, the detail in muted ink on a 20 px line under it, each cut with an ellipsis. Neither line ever wraps or moves sideways, so a new card or an answer replaces the text without moving anything (measured CLS 0). While the card asks it reads the question and what the opponent played (*Your move*, then *White played 1. d4*). Once answered it reads the book move in notation and in words, the way the line stepper does (*2... e5 · black pawn on e7 goes to e5*), a trap's whole solution, or a name card's moves and name. The live region around it also carries the outcome sentence for screen readers, visually hidden (*Missed. The book move is 2... e5.*).

### Status band

`StatusBand`, one neutral look, under the board of the deck game only. It names the move source and the game status. It stays a band because what it says is not on the board.

### Settings sheet

The gear in the top bar opens a bottom sheet (`Modal`) holding the board theme, the language, the Stockfish strength, the evaluation bar and the move sound switches, Credits and the account. The top bar is 48 px and holds only the name and that button. The sign-in link stays in the sheet (operator delegation, 2026-11-13). When the API answers 401, a signal band under the top bar says the session expired, and its *Sign in* button opens the sheet on the sign-in form. This band and the sync-paused band show only on the screens that draw no board (Today, Opening decks, Stats, Credits), so a board screen keeps its fit at 375 × 812.

### Source credits

Wherever an excerpt of a Wikipedia-based idea shows, its credit shows beside it: a short *Wikipedia, CC BY-SA* link in the idea header on a phone, the full credit under the text from 601 px and in the *Read all* sheet, and one full credit per source under a deck line's ideas.

## Do's and Don'ts

- Do keep the board edge to edge on a phone and the actions under it.
- Do split a screen into tabs before it scrolls past the fold with two sections.
- Do show a mini board beside every opening name, except where it gives the answer away.
- Don't add a gradient, glass, a glow or a coloured card.
- Don't load a font or an asset from a CDN; the trainer is used offline.
- Don't add an emoji or a Unicode glyph as an icon; draw it in `Icon` with the shared stroke.
- Don't let a tab label wrap; give the tab a short label and keep the full name as its accessible name.

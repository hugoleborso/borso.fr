---
name: Borsouvertures
description: A phone-first chess opening trainer set like a Swiss tournament poster.
colors:
  page: "#ffffff"
  ink: "#111111"
  ink-muted: "#595959"
  surface: "#f1f1ee"
  rule: "#d6d6d1"
  shell: "#111111"
  on-shell: "#ffffff"
  on-shell-muted: "#b8b8b8"
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
  dark-shell: "#1e1e1e"
  dark-primary: "#f4f4f2"
  dark-on-primary: "#111111"
  dark-accent: "#ff5a45"
  dark-recalled: "#3dbe73"
  dark-missed: "#ff6b5a"
  dark-on-state: "#0b0b0b"
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
    backgroundColor: "{colors.shell}"
    textColor: "{colors.on-shell}"
    height: "{spacing.tab-bar}"
  status-band-asking:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  status-band-recalled:
    backgroundColor: "{colors.recalled}"
    textColor: "{colors.on-recalled}"
  status-band-missed:
    backgroundColor: "{colors.missed}"
    textColor: "{colors.on-missed}"
  mini-board:
    size: "56px"
---

# Design System: Borsouvertures

## Overview

The trainer is used on a phone, one-handed, in a few minutes on a metro ride. The world is the Swiss tournament poster of the 1960s chess olympiads: a white or black ground, one grotesk at two weights, thick black rules that open each section, and flat colour fields with no gradient, glass or shadow. The board is the poster's image. It spans the full width of a phone, edge to edge, and everything else sits below it within thumb reach.

The signature move is the result field. Under the board, a flat band carries the prompt while the card asks. It turns green when the move was recalled and red when it was missed, with the answer set large inside it. The colour change is the feedback, and it reads at arm's length.

Light and dark follow the system setting. The four board themes (Lichess, Chess.com, Nord, Sand) are unchanged and live in the settings sheet with the language.

## Colors

The strategy is restrained neutrals with colour that only carries meaning. Every pair below was measured at 4.5:1 or more in both schemes.

### Primary

- **Ink** (`ink`, `primary`): text, rules and the filled primary button. It flips to near-white in dark mode, so the primary button is always the strongest object on screen.
- **Poster red** (`accent`): the current tab marker, the focus ring, the brand square and link underlines. Never a fill for a control.

### Tertiary

- **Recalled green** (`recalled`) and **missed red** (`missed`): the result field only, plus the sign-in error. In dark mode they turn bright and carry near-black text.
- **Signal yellow** (`signal`): notices, celebrations in Explore and text selection.

### Neutral

- **Page**, **surface** (a second neutral layer for the asking band, hover and empty bars), **rule** (hairlines between rows), **shell** (the tab bar, inverted in light mode).

### Named Rules

- **Colour has a job.** A colour that does not mean recalled, missed, here or notice stays out.

## Typography

One system grotesk stack, Helvetica Neue first, so nothing is fetched and the page works offline. Two weights, regular and bold. Fixed rem sizes, no fluid type.

### Hierarchy

- Screen title 24 px bold, section title 20 px bold, body 16 px, idea text 17 px at 1.6 line height and 65 characters wide, labels 14 px bold uppercase tracked, counts 48 px bold with tabular figures, move notation in the system monospace.

## Layout

- **The fold rule (operator, 2026-11-13).** At 375 × 812, minus the tab bar and the safe area, a screen shows one section at a time when its sections would not all fit without scrolling. Split them with the `SectionTabs` segmented control inside the screen. One list that scrolls inside a tab is fine. Two different sections stacked past the fold are not. Applied today: Today (Session / Ahead when the plan is empty / Retention), a deck page (Review / Lines / Play), Stats (Retention / Accuracy, with the streak above), Credits (Lichess / Wikipedia / Stockfish), Explore's picker (Pick / Setup, with the mode toggle beside the title and the start action in `ActionBar`) and Explore's drill and game (Board / Status / Options, with Change selection as a back button beside the tabs and the drill's actions in `ActionBar`).
- **The review session fits one screen.** Top bar, progress row, board, result field, and the action bar must be visible together at 375 × 812, including a name card's four choices.
- **Thumb bar.** The screen's main actions (Start, Show the move and Next, Review this deck, New game and Leave the game) sit in `ActionBar`, fixed above the tab bar on a phone and inline from 601 px.
- **Board width.** Full viewport width under 601 px, viewport minus 48 px up to 1023 px, half the viewport from 1024 px, capped at 560 px.
- The shell is one column with a 16 px gutter, 24 px from 601 px, at most 1024 px wide. The four tabs are fixed at the bottom with the safe-area inset. From 1024 px the review session and the deck game put the board left and the card column right.

## Elevation & Depth

Flat. No shadow, no blur, no gradient. Depth comes from the 3 px ink rule that opens a section, 1 px hairlines between rows, and the scrim behind the settings sheet.

## Shapes

Squares. The board has square corners. Controls have a 6 px radius, the settings sheet 12 px at its top corners. Secondary buttons and the segmented control carry a 2 px ink border.

## Components

### Buttons

Primary is an ink fill, default is an ink outline, quiet is underlined text. All are 48 px tall. Disabled drops to 40% opacity. A press scales to 98%.

### Section tabs

`SectionTabs` and `TabPanel` atoms: a bordered segmented control with `role="tablist"`. Hidden panels keep their state and stay in the DOM with `hidden`.

### Mini boards

- **The preview rule (operator, 2026-11-13).** Wherever an opening, deck, line or variation is named, a small board shows its position beside the name: deck rows, the deck page header, each line, Today's retention and ahead lists, Stats rows and every Explore list. A name card's choices show none, because the preview would give the answer away.
- A deck row reads the deck's side and counts, then its retention over the last 30 days.
- `MiniBoard` is a static 8 × 8 grid of squares and the bundled piece SVGs, 56 px on a phone and 64 px from 601 px, never a live chessboard. A deck shows its first line after six plies, a line shows its last position, both from the reader's side.

### Result field

`StatusBand` with three tones (asking, recalled, missed). It bleeds to the screen edges on a phone.

### Settings sheet

The gear in the top bar opens a bottom sheet (`Modal`) holding the board theme, the language, the Stockfish strength, Credits and the account. The top bar is 48 px and holds only the name and that button. The sign-in link stays in the sheet (operator delegation, 2026-11-13). When the API answers 401, a signal band under the top bar says the session expired, and its *Sign in* button opens the sheet on the sign-in form. This band and the sync-paused band show only on the screens that draw no board (Today, Decks, Stats, Credits), so a board screen keeps its fit at 375 × 812.

### Source credits

Wherever an excerpt of a Wikipedia-based idea shows, its credit shows beside it: a short *Wikipedia, CC BY-SA* link in the idea header on a phone, the full credit under the text from 601 px and in the *Read all* sheet, and one full credit per source under a deck line's ideas.

## Do's and Don'ts

- Do keep the board edge to edge on a phone and the actions under it.
- Do split a screen into tabs before it scrolls past the fold with two sections.
- Do show a mini board beside every opening name, except where it gives the answer away.
- Don't add a gradient, glass, a glow or a coloured card.
- Don't load a font or an asset from a CDN; the trainer is used offline.
- Don't add an emoji or a Unicode glyph as an icon; draw it in `Icon`.

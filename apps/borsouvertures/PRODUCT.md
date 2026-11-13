# Product

<!-- impeccable:product-schema 1 -->

Every fact below was inferred from the operator's brief of 2026-11-13 and from this repository. No interview took place: the operator delegated the calls and was unreachable. Inferred facts are marked (inferred).

## Platform

web

## Users

One reader, the operator. He learns his own chess opening repertoire and trains on a phone, one-handed, in short sessions such as a metro ride (stated in the brief). He also opens it on a laptop at home (inferred from the desktop layouts already shipped).

## Product Purpose

A daily opening trainer. Hand-written decks of the reader's lines are asked back as cards on a spaced-repetition schedule, so each move is asked again just before it is forgotten. Success is the reader recalling the book move from the position, a few minutes a day, without friction.

## Positioning

The decks are the operator's own repertoire with one written idea per move, not a generic opening database. The card asks for a move on a real board, then explains why.

## Operating Context

- Today shows what is due and new, and Start opens a review session.
- A review session asks one card at a time on the board: play the move, or show it, then Next. Feedback says recalled or missed, then the idea behind the move.
- Decks list the repertoire; a deck page reviews that deck, lists its lines and plays a game from it against Stockfish.
- Stats show the streak, retention by week and accuracy per deck.
- Explore drills or plays the whole Lichess catalogue.
- Works offline as an installed PWA; one account syncs devices.

## Capabilities and Constraints

- Offline first: no asset or font may come from a third-party CDN.
- Four board themes (lichess, chesscom, nord, sand) are kept.
- English and French, every visible string through i18n.
- Every screen works at 375 px wide.

## Brand Commitments

The name Borsouvertures. No visual identity was made binding.

## Evidence on Hand

Real decks in `content/decks/`, with ideas in English and French. No testimonials, users or metrics exist and none may be invented.

## Product Principles

- The board is the product. Everything else gets out of its way.
- One thumb, one hand. Every frequent action sits within reach at the bottom.
- Calm and fast. A session is minutes long; nothing should make the reader wait or hunt.

## Accessibility & Inclusion

Tap targets at least 44 px, readable contrast in light and dark (inferred from the brief's phone checklist).

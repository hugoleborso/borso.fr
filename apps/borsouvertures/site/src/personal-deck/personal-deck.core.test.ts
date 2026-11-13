import type { DeckLineEvent } from '@domain/deck-line-event.core';
import { describe, expect, it } from 'vitest';
import {
  buildPersonalDecks,
  checkLineAdd,
  findPersonalLine,
  isPersonalDeck,
  PERSONAL_DECK_NAME_KEY,
  type PersonalLine,
  replayPersonalLines,
} from './personal-deck.core';

const NOW = new Date('2026-11-13T12:00:00.000Z');
const PHONE = '11111111-1111-4111-8111-111111111111';
const CLOSED_SICILIAN = ['e2e4', 'c7c5', 'b1c3'];
const OPEN_SICILIAN = ['e2e4', 'c7c5', 'g1f3'];
const CLOSED_SICILIAN_LONGER = ['e2e4', 'c7c5', 'b1c3', 'b8c6', 'g2g3'];
const FRENCH = ['e2e4', 'e7e6', 'd2d4'];
const START_KEY = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
const AFTER_C5_KEY = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -';

function buildEvent(sequence: number, overrides: Partial<DeckLineEvent> = {}): DeckLineEvent {
  return {
    id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(sequence).padStart(12, '0')}`,
    kind: 'line-added',
    side: 'white',
    movesUci: CLOSED_SICILIAN,
    openingName: 'Sicilian Defense: Closed',
    occurredAt: `2026-11-13T10:00:${String(sequence).padStart(2, '0')}.000Z`,
    calendarDay: '2026-11-13',
    deviceId: PHONE,
    receivedAt: null,
    ...overrides,
  };
}

function linesOf(events: readonly DeckLineEvent[]): PersonalLine[] {
  return replayPersonalLines(events, NOW);
}

// @FollowsBlueprint test-pure-unit
describe('checkLineAdd', () => {
  const closed = linesOf([buildEvent(1)]);

  it('accepts a first line and names its moves in SAN', () => {
    const check = checkLineAdd([], { side: 'white', movesUci: CLOSED_SICILIAN });
    expect(check).toMatchObject({ ok: true, replacedKeys: [], movesSan: ['e4', 'c5', 'Nc3'] });
    expect(check.ok && check.readerMoves.map((move) => move.moveSan)).toEqual(['e4', 'Nc3']);
  });

  it('refuses a line where the reader has another move at a position of the deck', () => {
    expect(checkLineAdd(closed, { side: 'white', movesUci: OPEN_SICILIAN })).toEqual({
      ok: false,
      reason: 'conflicts',
      conflictingMoveSan: 'Nc3',
    });
  });

  it('refuses a line the deck already holds, whole or as the start of a longer one', () => {
    expect(checkLineAdd(closed, { side: 'white', movesUci: CLOSED_SICILIAN })).toMatchObject({
      ok: false,
      reason: 'already-in-deck',
    });
    expect(checkLineAdd(closed, { side: 'white', movesUci: ['e2e4', 'c7c5'] })).toMatchObject({
      reason: 'already-in-deck',
    });
  });

  it('accepts a longer line and replaces the line it extends', () => {
    expect(checkLineAdd(closed, { side: 'white', movesUci: CLOSED_SICILIAN_LONGER })).toMatchObject(
      { ok: true, replacedKeys: ['white:e2e4 c7c5 b1c3'] },
    );
  });

  it('reads the lines of the other side apart', () => {
    expect(checkLineAdd(closed, { side: 'black', movesUci: OPEN_SICILIAN })).toMatchObject({
      ok: true,
      replacedKeys: [],
    });
  });

  it('refuses a line holding no move of the reader, and a line the board refuses', () => {
    expect(checkLineAdd([], { side: 'black', movesUci: ['e2e4'] })).toEqual({
      ok: false,
      reason: 'no-reader-move',
      conflictingMoveSan: null,
    });
    expect(checkLineAdd([], { side: 'white', movesUci: ['e2e5'] })).toEqual({
      ok: false,
      reason: 'illegal',
      conflictingMoveSan: null,
    });
  });

  it('finds a conflict reached by another move order', () => {
    const italian = linesOf([
      buildEvent(1, { movesUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'] }),
    ]);
    expect(
      checkLineAdd(italian, {
        side: 'white',
        movesUci: ['e2e4', 'b8c6', 'g1f3', 'e7e5', 'f1b5'],
      }),
    ).toMatchObject({ ok: false, reason: 'conflicts', conflictingMoveSan: 'Bc4' });
  });
});

describe('replayPersonalLines', () => {
  it('replays added lines in time order, skipping a conflicting line wherever it was added', () => {
    const lines = linesOf([
      buildEvent(2, { movesUci: OPEN_SICILIAN, openingName: 'Sicilian Defense: Open' }),
      buildEvent(1),
      buildEvent(3, { movesUci: FRENCH, openingName: null }),
    ]);
    expect(lines.map((line) => line.key)).toEqual(['white:e2e4 c7c5 b1c3', 'white:e2e4 e7e6 d2d4']);
    expect(lines[1]).toMatchObject({
      key: 'white:e2e4 e7e6 d2d4',
      side: 'white',
      movesUci: FRENCH,
      movesSan: ['e4', 'e6', 'd4'],
      openingName: null,
    });
  });

  it('removes a line, ignores the removal of a line it does not hold, and adds it back', () => {
    const removed = buildEvent(2, { kind: 'line-removed' });
    expect(linesOf([buildEvent(1), removed])).toEqual([]);
    expect(
      linesOf([buildEvent(1), buildEvent(2, { kind: 'line-removed', movesUci: FRENCH })]),
    ).toHaveLength(1);
    expect(linesOf([buildEvent(1), removed, buildEvent(3)])).toHaveLength(1);
  });

  it('keeps the longer line once a line extends another', () => {
    const lines = linesOf([buildEvent(1), buildEvent(2, { movesUci: CLOSED_SICILIAN_LONGER })]);
    expect(lines.map((line) => line.key)).toEqual(['white:e2e4 c7c5 b1c3 b8c6 g2g3']);
  });

  it('finds a held line by its side and moves', () => {
    const lines = linesOf([buildEvent(1)]);
    expect(findPersonalLine(lines, 'white', CLOSED_SICILIAN)).toBe(lines[0]);
    expect(findPersonalLine(lines, 'black', CLOSED_SICILIAN)).toBeNull();
  });
});

describe('buildPersonalDecks', () => {
  it('builds no deck before a line is added', () => {
    expect(buildPersonalDecks([])).toEqual([]);
  });

  it('builds one deck per side, white first, with one move card per reader position', () => {
    const lines = linesOf([
      buildEvent(1, { side: 'black', movesUci: ['e2e4', 'c7c5', 'b1c3', 'b8c6'] }),
      buildEvent(2),
      buildEvent(3, { movesUci: FRENCH, openingName: 'French Defense: Advance? no, Normal' }),
    ]);
    const [white, black] = buildPersonalDecks(lines);
    expect(white).toMatchObject({
      id: 'my-lines-white',
      nameKey: PERSONAL_DECK_NAME_KEY,
      side: 'white',
    });
    expect(black).toMatchObject({ id: 'my-lines-black', side: 'black' });
    expect(white?.cards.map((card) => card.cardId)).toEqual([
      `move:my-lines-white:${START_KEY}`,
      `move:my-lines-white:${AFTER_C5_KEY}`,
      'move:my-lines-white:rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -',
    ]);
    expect(white?.cards[1]).toEqual({
      dueFromDay: '2026-11-14',
      kind: 'move',
      cardId: `move:my-lines-white:${AFTER_C5_KEY}`,
      deckId: 'my-lines-white',
      positionKey: AFTER_C5_KEY,
      fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      opponentMoveUci: 'c7c5',
      bookMoveUci: 'b1c3',
      bookMoveSan: 'Nc3',
      ideaPositionKey: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq -',
    });
    expect(white?.cards[0]).toMatchObject({ opponentMoveUci: null, bookMoveSan: 'e4' });
    expect(black?.cards.map((card) => card.cardId)).toEqual([
      'move:my-lines-black:rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -',
      'move:my-lines-black:rnbqkbnr/pp1ppppp/8/2p5/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq -',
    ]);
  });

  it('makes a shared move due from the day the first line holding it was added', () => {
    const lines = linesOf([
      buildEvent(1, { calendarDay: '2026-11-10' }),
      buildEvent(2, { movesUci: FRENCH, calendarDay: '2026-11-12' }),
    ]);
    const [white] = buildPersonalDecks(lines);
    const firstMove = white?.cards
      .filter((card) => card.kind === 'move')
      .find((card) => card.positionKey === START_KEY);
    expect(firstMove?.dueFromDay).toBe('2026-11-11');
  });

  it('shows the opening name in place of an idea, the first line naming a shared move', () => {
    const lines = linesOf([buildEvent(1), buildEvent(2, { movesUci: FRENCH, openingName: null })]);
    const [white] = buildPersonalDecks(lines);
    expect(white?.ideas).toEqual([
      {
        positionKey: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -',
        en: 'Sicilian Defense: Closed',
        fr: 'Sicilian Defense: Closed',
        source: 'opening-name',
      },
      {
        positionKey: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq -',
        en: 'Sicilian Defense: Closed',
        fr: 'Sicilian Defense: Closed',
        source: 'opening-name',
      },
      {
        positionKey: 'rnbqkbnr/pppp1ppp/4p3/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq -',
        en: '1. e4 e6 2. d4',
        fr: '1. e4 e6 2. d4',
        source: 'opening-name',
      },
    ]);
  });

  it('names each line by its opening, numbering two lines of one name, and the moves when unnamed', () => {
    const lines = linesOf([
      buildEvent(1, { movesUci: ['e2e4', 'c7c5', 'b1c3', 'b8c6'] }),
      buildEvent(2, { movesUci: ['e2e4', 'c7c5', 'b1c3', 'd7d6'] }),
      buildEvent(3, { movesUci: ['e2e4', 'c7c5', 'b1c3', 'e7e6'] }),
      buildEvent(4, { movesUci: FRENCH, openingName: null }),
    ]);
    const [white] = buildPersonalDecks(lines);
    expect(white?.lines.map((line) => line.name)).toEqual([
      'Sicilian Defense: Closed',
      'Sicilian Defense: Closed (2)',
      'Sicilian Defense: Closed (3)',
      '1. e4 e6 2. d4',
    ]);
    expect(white?.lines[3]).toEqual({
      name: '1. e4 e6 2. d4',
      movesSan: ['e4', 'e6', 'd4'],
      movesUci: FRENCH,
    });
  });

  it('tells a personal deck from a file deck', () => {
    expect(isPersonalDeck('my-lines-white')).toBe(true);
    expect(isPersonalDeck('my-lines-black')).toBe(true);
    expect(isPersonalDeck('albin-countergambit')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildReviewCard,
  findCard,
  findDeck,
  findIdea,
  findOpponentMove,
  formatMoveNotation,
  formatNumberedLine,
  isBookMove,
  listDeckCards,
  listLineSteps,
  listReviewCards,
  selectOpponentSide,
} from './card.core';
import { buildExampleDeck } from './deck.test-utils';
import type { BuiltDeck, MoveCard } from './deck.utils';

const deck = buildExampleDeck();

function getCard(bookMoveSan: string): MoveCard {
  const card = deck.cards.find((candidate) => candidate.bookMoveSan === bookMoveSan);
  if (card === undefined) throw new Error(`no card plays ${bookMoveSan}`);
  return card;
}

const WHITE_DECK: BuiltDeck = {
  id: 'vienna-game',
  nameKey: 'decks.names.vienna-game',
  side: 'white',
  lines: [{ name: 'Main line', movesSan: ['e4', 'e5', 'Nc3'], movesUci: ['e2e4', 'e7e5', 'b1c3'] }],
  cards: [
    {
      kind: 'move',
      cardId: 'move:vienna-game:rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
      deckId: 'vienna-game',
      positionKey: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      opponentMoveUci: null,
      bookMoveUci: 'e2e4',
      bookMoveSan: 'e4',
      ideaPositionKey: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -',
    },
  ],
  ideas: [],
};

// @FollowsBlueprint test-pure-unit
describe('finding cards, decks and ideas', () => {
  it('lists the cards of every deck in deck order', () => {
    expect(listDeckCards([deck, WHITE_DECK]).map((card) => card.bookMoveSan)).toEqual([
      'd5',
      'e5',
      'd4',
      'Nc6',
      'Bb4+',
      'dxe3',
      'e4',
    ]);
    expect(listDeckCards([])).toEqual([]);
  });

  it('finds a card and a deck by id, or nothing', () => {
    const card = getCard('e5');
    expect(findCard(deck.cards, card.cardId)).toBe(card);
    expect(findCard(deck.cards, 'move:albin-countergambit:nowhere')).toBeNull();
    expect(findDeck([deck, WHITE_DECK], 'vienna-game')).toBe(WHITE_DECK);
    expect(findDeck([deck], 'vienna-game')).toBeNull();
  });

  it('finds the idea of a card by the position after its move', () => {
    expect(findIdea(deck, getCard('e5').ideaPositionKey)?.en).toBe('English idea 2.');
    expect(findIdea(deck, getCard('e5').positionKey)).toBeNull();
  });
});

describe('isBookMove', () => {
  it('accepts the book move and refuses another', () => {
    const card = getCard('e5');
    expect(isBookMove(card, 'e7e5')).toBe(true);
    expect(isBookMove(card, 'e7e6')).toBe(false);
    expect(isBookMove(card, 'e7')).toBe(false);
    expect(isBookMove(card, '')).toBe(false);
  });

  it('accepts a board drop on the two squares of a promotion, and only the book piece when one is named', () => {
    const promotion = { ...getCard('e5'), bookMoveUci: 'f2g1n' };
    expect(isBookMove(promotion, 'f2g1')).toBe(true);
    expect(isBookMove(promotion, 'f2g1n')).toBe(true);
    expect(isBookMove(promotion, 'f2g1q')).toBe(false);
    expect(isBookMove(promotion, 'f2f1')).toBe(false);
  });
});

describe('notation', () => {
  it('numbers a white and a black move', () => {
    expect(formatMoveNotation(0, 'd4')).toBe('1. d4');
    expect(formatMoveNotation(1, 'd5')).toBe('1... d5');
    expect(formatMoveNotation(4, 'dxe5')).toBe('3. dxe5');
    expect(formatMoveNotation(5, 'd4')).toBe('3... d4');
  });

  it('numbers a whole line once per full move', () => {
    expect(formatNumberedLine(['d4', 'd5', 'c4', 'e5', 'dxe5'])).toBe('1. d4 d5 2. c4 e5 3. dxe5');
    expect(formatNumberedLine([])).toBe('');
  });

  it('names the other side', () => {
    expect(selectOpponentSide('white')).toBe('black');
    expect(selectOpponentSide('black')).toBe('white');
  });
});

describe('findOpponentMove', () => {
  it('gives the position before the opponent moved, the move and who played it', () => {
    expect(findOpponentMove(deck, getCard('d4'))).toEqual({
      fenBefore: 'rnbqkbnr/ppp2ppp/8/3pp3/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
      notation: '3. dxe5',
      side: 'white',
    });
    expect(findOpponentMove(deck, getCard('d5'))).toEqual({
      fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      notation: '1. d4',
      side: 'white',
    });
  });

  it('reads a card of the second line off the second line', () => {
    expect(findOpponentMove(deck, getCard('dxe3'))?.notation).toBe('5. Bd2');
  });

  it('names Black as the opponent of a white deck', () => {
    const afterBlackReply: MoveCard = {
      ...WHITE_DECK.cards[0],
      kind: 'move',
      cardId: 'x',
      deckId: 'vienna-game',
      positionKey: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -',
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      opponentMoveUci: 'e7e5',
      bookMoveUci: 'b1c3',
      bookMoveSan: 'Nc3',
      ideaPositionKey: 'x',
    };
    expect(findOpponentMove(WHITE_DECK, afterBlackReply)).toEqual({
      fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      notation: '1... e5',
      side: 'black',
    });
  });

  it('answers nothing for the first move of a white deck and for a card no line reaches', () => {
    const [firstMove] = WHITE_DECK.cards;
    if (firstMove === undefined) throw new Error('the white deck holds one card');
    expect(findOpponentMove(WHITE_DECK, firstMove)).toBeNull();
    expect(findOpponentMove(WHITE_DECK, getCard('e5'))).toBeNull();
  });
});

describe('buildReviewCard and listReviewCards', () => {
  it('gathers what the session shows for a card', () => {
    const card = getCard('d4');
    expect(buildReviewCard(deck, card)).toEqual({
      card,
      deckId: 'albin-countergambit',
      deckNameKey: 'decks.names.albin-countergambit',
      readerSide: 'black',
      idea: findIdea(deck, card.ideaPositionKey),
      opponentMove: findOpponentMove(deck, card),
      answerFen: 'rnbqkbnr/ppp2ppp/8/4P3/2Pp4/8/PP2PPPP/RNBQKBNR w KQkq - 0 4',
      bookMoveNotation: '3... d4',
    });
  });

  it('numbers a white book move and applies a promotion to the answer position', () => {
    const [firstMove] = WHITE_DECK.cards;
    if (firstMove === undefined) throw new Error('the white deck holds one card');
    const whiteCard = buildReviewCard(WHITE_DECK, firstMove);
    expect(whiteCard.bookMoveNotation).toBe('1. e4');
    expect(whiteCard.idea).toBeNull();
    expect(whiteCard.opponentMove).toBeNull();
    const promotion: MoveCard = {
      ...firstMove,
      fen: '4k3/8/8/8/8/8/4Kp2/6N1 b - - 0 7',
      bookMoveUci: 'f2g1n',
      bookMoveSan: 'fxg1=N+',
    };
    const promoted = buildReviewCard(WHITE_DECK, promotion);
    expect(promoted.answerFen).toBe('4k3/8/8/8/8/8/4K3/6n1 w - - 0 8');
    expect(promoted.bookMoveNotation).toBe('7... fxg1=N+');
  });

  it('keeps the order asked and skips an id no deck holds', () => {
    const cardIds = [getCard('Nc6').cardId, 'move:gone:nowhere', getCard('d5').cardId];
    expect(
      listReviewCards([deck], cardIds).map((reviewCard) => reviewCard.card.bookMoveSan),
    ).toEqual(['Nc6', 'd5']);
  });

  it('skips a card whose deck is not loaded', () => {
    const orphan: BuiltDeck = { ...WHITE_DECK, cards: [{ ...getCard('d5'), deckId: 'gone' }] };
    expect(listReviewCards([orphan], [getCard('d5').cardId])).toEqual([]);
  });
});

describe('listLineSteps', () => {
  it('gives one step per reader move of a line, with its idea', () => {
    const [mainLine] = deck.lines;
    if (mainLine === undefined) throw new Error('the example has a main line');
    expect(
      listLineSteps(deck, mainLine).map((step) => [step.notation, step.idea?.en ?? null]),
    ).toEqual([
      ['1... d5', 'English idea 1.'],
      ['2... e5', 'English idea 2.'],
      ['3... d4', 'English idea 3.'],
      ['4... Nc6', 'English idea 4.'],
    ]);
  });

  it('falls back to the UCI move for a line that carries fewer SAN moves than UCI moves', () => {
    const shortOnSan = { name: 'Main line', movesSan: ['e4'], movesUci: ['e2e4', 'e7e5', 'b1c3'] };
    expect(listLineSteps(WHITE_DECK, shortOnSan).map((step) => step.notation)).toEqual([
      '1. e4',
      '2. b1c3',
    ]);
  });

  it('gives the white moves of a white deck, without an idea when none is written', () => {
    const [line] = WHITE_DECK.lines;
    if (line === undefined) throw new Error('the white deck has a line');
    expect(listLineSteps(WHITE_DECK, line)).toEqual([
      { notation: '1. e4', idea: null },
      { notation: '2. Nc3', idea: null },
    ]);
  });
});

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
  isExpectedMove,
  listDeckCards,
  listLineSteps,
  listReviewCards,
  selectOpponentSide,
} from './card.core';
import {
  buildExampleDeck,
  buildNameDeck,
  EXAMPLE_NAME_CARD,
  EXAMPLE_TRAP_CARD,
} from './deck.test-utils';
import type { BuiltDeck, Card, MoveCard } from './deck.utils';

const deck = buildExampleDeck();

function listMoveCards(cards: readonly Card[]): MoveCard[] {
  return cards.filter((card) => card.kind === 'move');
}

function getCard(bookMoveSan: string): MoveCard {
  const card = listMoveCards(deck.cards).find((candidate) => candidate.bookMoveSan === bookMoveSan);
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
    expect(
      listMoveCards(listDeckCards([deck, WHITE_DECK])).map((card) => card.bookMoveSan),
    ).toEqual(['d5', 'e5', 'd4', 'Nc6', 'Bb4+', 'dxe3', 'e4']);
    expect(listDeckCards([])).toEqual([]);
  });

  it('slips one name card in after every four deck cards, and the rest at the end', () => {
    const names = ['Ruy Lopez', 'Scotch Game', 'Italian Game'].map((openingName) => ({
      ...EXAMPLE_NAME_CARD,
      cardId: `name:${openingName}`,
      openingName,
    }));
    const order = listDeckCards([buildNameDeck(names), deck]).map((card) =>
      card.kind === 'name' ? card.openingName : card.cardId,
    );
    const moveIds = deck.cards.map((card) => card.cardId);
    expect(order).toEqual([
      ...moveIds.slice(0, 4),
      'Ruy Lopez',
      ...moveIds.slice(4),
      'Scotch Game',
      'Italian Game',
    ]);
  });

  it('slips in no name card where the name deck has run out', () => {
    const twoDecks = [deck, { ...deck, id: 'second' }, buildNameDeck([EXAMPLE_NAME_CARD])];
    const kinds = listDeckCards(twoDecks).map((card) => card.kind);
    expect(kinds).toEqual([
      ...Array.from({ length: 4 }, () => 'move'),
      'name',
      ...Array.from({ length: 8 }, () => 'move'),
    ]);
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

describe('isExpectedMove', () => {
  it('accepts the expected move, its two squares, and nothing else', () => {
    expect(isExpectedMove('e5d3', 'e5d3')).toBe(true);
    expect(isExpectedMove('e7e8q', 'e7e8')).toBe(true);
    expect(isExpectedMove('e5d3', 'e5c4')).toBe(false);
    expect(isExpectedMove('e5d3', 'e5d3q')).toBe(false);
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
    const [firstMove] = listMoveCards(WHITE_DECK.cards);
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
      steps: [
        {
          fen: card.fen,
          moveUci: 'd5d4',
          answerFen: 'rnbqkbnr/ppp2ppp/8/4P3/2Pp4/8/PP2PPPP/RNBQKBNR w KQkq - 0 4',
        },
      ],
    });
  });

  it('numbers a white book move and applies a promotion to the answer position', () => {
    const [firstMove] = listMoveCards(WHITE_DECK.cards);
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

  it('gathers a name card: its position, the moves to show and no step on the board', () => {
    const nameDeck = buildNameDeck([EXAMPLE_NAME_CARD]);
    expect(buildReviewCard(nameDeck, EXAMPLE_NAME_CARD)).toEqual({
      card: EXAMPLE_NAME_CARD,
      deckId: 'opening-names',
      deckNameKey: 'cards.name-deck',
      readerSide: 'white',
      idea: null,
      opponentMove: null,
      answerFen: EXAMPLE_NAME_CARD.fen,
      bookMoveNotation: '1. e4 e5 2. Nc3',
      steps: [],
    });
  });

  it('gathers a trap card: the opponent move, one step per reader move and the whole solution', () => {
    expect(buildReviewCard(deck, EXAMPLE_TRAP_CARD)).toEqual({
      card: EXAMPLE_TRAP_CARD,
      deckId: 'albin-countergambit',
      deckNameKey: 'decks.names.albin-countergambit',
      readerSide: 'black',
      idea: null,
      opponentMove: {
        fenBefore: EXAMPLE_TRAP_CARD.fen,
        notation: '9. Nxd4',
        side: 'white',
      },
      answerFen: 'r2qk1nr/ppp2pbp/6p1/8/1PPN4/P2P4/1B1N1PPP/R2bKB1R w KQkq - 0 11',
      bookMoveNotation: '9... Nd3+ 10. exd3 Bxd1',
      steps: [
        {
          fen: 'r2qk1nr/ppp2pbp/6p1/4n3/1PPN2b1/P7/1B1NPPPP/R2QKB1R b KQkq - 0 9',
          moveUci: 'e5d3',
          answerFen: 'r2qk1nr/ppp2pbp/6p1/8/1PPN2b1/P2n4/1B1NPPPP/R2QKB1R w KQkq - 1 10',
        },
        {
          fen: 'r2qk1nr/ppp2pbp/6p1/8/1PPN2b1/P2P4/1B1N1PPP/R2QKB1R b KQkq - 0 10',
          moveUci: 'g4d1',
          answerFen: 'r2qk1nr/ppp2pbp/6p1/8/1PPN4/P2P4/1B1N1PPP/R2bKB1R w KQkq - 0 11',
        },
      ],
    });
  });

  it('names Black as the opponent of a trap for White', () => {
    const whiteTrap = {
      ...EXAMPLE_TRAP_CARD,
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      opponentMoveUci: 'e7e5',
      solutionUci: ['g1f3', 'b8c6', 'f1c4'],
    };
    const reviewCard = buildReviewCard(WHITE_DECK, whiteTrap);
    expect(reviewCard.opponentMove?.notation).toBe('1... e5');
    expect(reviewCard.opponentMove?.side).toBe('black');
    expect(reviewCard.bookMoveNotation).toBe('2. Nf3 Nc6 3. Bc4');
  });

  it('keeps the order asked and skips an id no deck holds', () => {
    const cardIds = [getCard('Nc6').cardId, 'move:gone:nowhere', getCard('d5').cardId];
    expect(
      listMoveCards(listReviewCards([deck], cardIds).map((reviewCard) => reviewCard.card)).map(
        (card) => card.bookMoveSan,
      ),
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

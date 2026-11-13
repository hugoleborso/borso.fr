import { Chess } from 'chess.js';
import { derivePositionKey } from '@domain/position-key.core';
import type { CardId } from '@domain/review-event.core';
import { uciFromSquare, uciPromotion, uciToSquare } from '@/openings/uciSquare.utils';
import type { Side } from '@/state/persistedState.utils';
import type {
  BuiltDeck,
  BuiltDeckLine,
  Card,
  Idea,
  MoveCard,
  NameCard,
  TrapCard,
} from './deck.utils';

export type { Card };

export interface OpponentMove {
  fenBefore: string;
  notation: string;
  side: Side;
}

export interface ReviewStep {
  fen: string;
  moveUci: string;
  answerFen: string;
}

export interface ReviewCard {
  card: Card;
  deckId: string;
  deckNameKey: string;
  readerSide: Side;
  idea: Idea | null;
  opponentMove: OpponentMove | null;
  answerFen: string;
  bookMoveNotation: string;
  steps: ReviewStep[];
}

export interface LineStep {
  notation: string;
  idea: Idea | null;
}

const PLIES_PER_FULL_MOVE = 2;
const SQUARE_PAIR_LENGTH = 4;
const OPPOSITE_SIDE: Record<Side, Side> = { white: 'black', black: 'white' };
const SIDE_BY_TURN: Record<'w' | 'b', Side> = { w: 'white', b: 'black' };
const MOVE_SEPARATOR = ' ';
export const DECK_CARDS_PER_NAME_CARD = 4;

// @FollowsBlueprint core-projection
export function listDeckCards(decks: readonly BuiltDeck[]): Card[] {
  const cards = decks.flatMap((deck) => deck.cards);
  const nameCards = cards.filter((card) => card.kind === 'name');
  const deckCards = cards.filter((card) => card.kind !== 'name');
  const mixed = deckCards.flatMap((card, index) => {
    const nameCard = nameCards[(index + 1) / DECK_CARDS_PER_NAME_CARD - 1];
    return nameCard === undefined ? [card] : [card, nameCard];
  });
  const mixedNameCardCount = Math.floor(deckCards.length / DECK_CARDS_PER_NAME_CARD);
  return [...mixed, ...nameCards.slice(mixedNameCardCount)];
}

export function findCard(cards: readonly Card[], cardId: CardId): Card | null {
  return cards.find((card) => card.cardId === cardId) ?? null;
}

export function findDeck(decks: readonly BuiltDeck[], deckId: string): BuiltDeck | null {
  return decks.find((deck) => deck.id === deckId) ?? null;
}

export function findIdea(deck: BuiltDeck, positionKey: string): Idea | null {
  return deck.ideas.find((idea) => idea.positionKey === positionKey) ?? null;
}

export function isExpectedMove(expectedUci: string, uci: string): boolean {
  if (uci.length > SQUARE_PAIR_LENGTH) return uci === expectedUci;
  return uci.length === SQUARE_PAIR_LENGTH && expectedUci.startsWith(uci);
}

export function isBookMove(card: MoveCard, uci: string): boolean {
  return isExpectedMove(card.bookMoveUci, uci);
}

export function formatMoveNotation(plyIndex: number, san: string): string {
  const moveNumber = Math.floor(plyIndex / PLIES_PER_FULL_MOVE) + 1;
  return plyIndex % PLIES_PER_FULL_MOVE === 0 ? `${moveNumber}. ${san}` : `${moveNumber}... ${san}`;
}

export function formatNumberedLine(movesSan: readonly string[]): string {
  return movesSan
    .map((san, plyIndex) =>
      plyIndex % PLIES_PER_FULL_MOVE === 0 ? formatMoveNotation(plyIndex, san) : san,
    )
    .join(' ');
}

interface LineMove {
  plyIndex: number;
  uci: string;
  notation: string;
  mover: Side;
}

function selectMover(plyIndex: number): Side {
  return plyIndex % PLIES_PER_FULL_MOVE === 0 ? 'white' : 'black';
}

function listLineMoves(line: BuiltDeckLine): LineMove[] {
  return line.movesUci.map((uci, plyIndex) => ({
    plyIndex,
    uci,
    notation: formatMoveNotation(plyIndex, line.movesSan[plyIndex] ?? uci),
    mover: selectMover(plyIndex),
  }));
}

function applyUci(game: Chess, uci: string): string {
  return game.move({
    from: uciFromSquare(uci),
    to: uciToSquare(uci),
    promotion: uciPromotion(uci),
  }).san;
}

function readFullMovePlyIndex(fen: string): number {
  const game = new Chess(fen);
  const sideOffset = game.turn() === 'w' ? 0 : 1;
  return (game.moveNumber() - 1) * PLIES_PER_FULL_MOVE + sideOffset;
}

function findOpponentMoveInLine(line: BuiltDeckLine, card: MoveCard): OpponentMove | null {
  const game = new Chess();
  for (const move of listLineMoves(line)) {
    const fenBefore = game.fen();
    applyUci(game, move.uci);
    if (derivePositionKey(game.fen()) === card.positionKey) {
      return { fenBefore, notation: move.notation, side: move.mover };
    }
  }
  return null;
}

export function findOpponentMove(deck: BuiltDeck, card: MoveCard): OpponentMove | null {
  for (const line of deck.lines) {
    const opponentMove = findOpponentMoveInLine(line, card);
    if (opponentMove !== null) return opponentMove;
  }
  return null;
}

function buildMoveReviewCard(deck: BuiltDeck, card: MoveCard): ReviewCard {
  const game = new Chess(card.fen);
  applyUci(game, card.bookMoveUci);
  const answerFen = game.fen();
  return {
    card,
    deckId: deck.id,
    deckNameKey: deck.nameKey,
    readerSide: deck.side,
    idea: findIdea(deck, card.ideaPositionKey),
    opponentMove: findOpponentMove(deck, card),
    answerFen,
    bookMoveNotation: formatMoveNotation(readFullMovePlyIndex(card.fen), card.bookMoveSan),
    steps: [{ fen: card.fen, moveUci: card.bookMoveUci, answerFen }],
  };
}

function buildNameReviewCard(deck: BuiltDeck, card: NameCard): ReviewCard {
  return {
    card,
    deckId: deck.id,
    deckNameKey: deck.nameKey,
    readerSide: deck.side,
    idea: null,
    opponentMove: null,
    answerFen: card.fen,
    bookMoveNotation: formatNumberedLine(card.movesSan),
    steps: [],
  };
}

function buildTrapReviewCard(deck: BuiltDeck, card: TrapCard): ReviewCard {
  const game = new Chess(card.fen);
  const opponentPlyIndex = readFullMovePlyIndex(card.fen);
  const opponentSide = SIDE_BY_TURN[game.turn()];
  const opponentSan = applyUci(game, card.opponentMoveUci);
  const steps: ReviewStep[] = [];
  const notations: string[] = [];
  for (const [index, uci] of card.solutionUci.entries()) {
    const fen = game.fen();
    const plyIndex = opponentPlyIndex + 1 + index;
    const san = applyUci(game, uci);
    const isReaderMove = index % PLIES_PER_FULL_MOVE === 0;
    const isNumbered = index === 0 || plyIndex % PLIES_PER_FULL_MOVE === 0;
    if (isReaderMove) steps.push({ fen, moveUci: uci, answerFen: game.fen() });
    notations.push(isNumbered ? formatMoveNotation(plyIndex, san) : san);
  }
  return {
    card,
    deckId: deck.id,
    deckNameKey: deck.nameKey,
    readerSide: deck.side,
    idea: null,
    opponentMove: {
      fenBefore: card.fen,
      notation: formatMoveNotation(opponentPlyIndex, opponentSan),
      side: opponentSide,
    },
    answerFen: game.fen(),
    bookMoveNotation: notations.join(MOVE_SEPARATOR),
    steps,
  };
}

export function buildReviewCard(deck: BuiltDeck, card: Card): ReviewCard {
  if (card.kind === 'move') return buildMoveReviewCard(deck, card);
  if (card.kind === 'name') return buildNameReviewCard(deck, card);
  return buildTrapReviewCard(deck, card);
}

export function listReviewCards(
  decks: readonly BuiltDeck[],
  cardIds: readonly CardId[],
): ReviewCard[] {
  const reviewCards: ReviewCard[] = [];
  for (const cardId of cardIds) {
    const card = findCard(listDeckCards(decks), cardId);
    if (card === null) continue;
    const deck = findDeck(decks, card.deckId);
    if (deck === null) continue;
    reviewCards.push(buildReviewCard(deck, card));
  }
  return reviewCards;
}

export function listLineSteps(deck: BuiltDeck, line: BuiltDeckLine): LineStep[] {
  const game = new Chess();
  const steps: LineStep[] = [];
  for (const move of listLineMoves(line)) {
    applyUci(game, move.uci);
    if (move.mover === deck.side) {
      steps.push({
        notation: move.notation,
        idea: findIdea(deck, derivePositionKey(game.fen())),
      });
    }
  }
  return steps;
}

export function selectOpponentSide(readerSide: Side): Side {
  return OPPOSITE_SIDE[readerSide];
}

import { buildDecksDocument } from '../../../scripts/decks/deck-build.core';
import {
  buildExampleFolder,
  buildExampleInput,
} from '../../../scripts/decks/deck-build.test-utils';
import {
  type BuiltDeck,
  type DecksDocument,
  NAME_DECK_ID,
  type NameCard,
  type TrapCard,
} from './deck.utils';

export function buildExampleDocument(): DecksDocument {
  const build = buildDecksDocument(buildExampleInput([buildExampleFolder()]));
  if (!build.ok) throw new Error(build.problems.join('\n'));
  return build.document;
}

export function buildExampleDeck(): BuiltDeck {
  const [deck] = buildExampleDocument().decks;
  if (deck === undefined) throw new Error('the example holds one deck');
  return deck;
}

const VIENNA_KEY = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq -';

export const EXAMPLE_NAME_CARD: NameCard = {
  kind: 'name',
  cardId: `name:${VIENNA_KEY}`,
  deckId: NAME_DECK_ID,
  positionKey: VIENNA_KEY,
  fen: `${VIENNA_KEY} 1 2`,
  openingName: 'Vienna Game',
  movesSan: ['e4', 'e5', 'Nc3'],
  choices: ['Sicilian Defense', 'Vienna Game', 'Scotch Game', 'Ruy Lopez'],
};

export const EXAMPLE_TRAP_CARD: TrapCard = {
  kind: 'trap',
  cardId: 'trap:FUczt',
  deckId: 'albin-countergambit',
  fen: 'r2qk1nr/ppp2pbp/6p1/4n3/1PPp2b1/P4N2/1B1NPPPP/R2QKB1R w KQkq - 0 9',
  opponentMoveUci: 'f3d4',
  solutionUci: ['e5d3', 'e2d3', 'g4d1'],
};

export function buildNameDeck(cards: NameCard[]): BuiltDeck {
  return {
    id: NAME_DECK_ID,
    nameKey: 'cards.name-deck',
    side: 'white',
    lines: [],
    cards,
    ideas: [],
  };
}

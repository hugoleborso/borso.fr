import { describe, expect, it } from 'vitest';
import { buildExampleDeck, buildExampleDocument } from './deck.test-utils';
import { DeckContentInvalidError, parseDecksDocument } from './deck.utils';

function readFailedDeckId(value: unknown): string {
  try {
    parseDecksDocument(value);
  } catch (error) {
    if (error instanceof DeckContentInvalidError) return `${error.name} ${error.deckId}`;
  }
  return 'parsed';
}

function withDeckChange(change: Record<string, unknown>): unknown {
  return { version: 1, decks: [{ ...buildExampleDeck(), ...change }] };
}

function withCardChange(change: Record<string, unknown>): unknown {
  const deck = buildExampleDeck();
  return withDeckChange({ cards: [{ ...deck.cards[0], ...change }] });
}

function withIdeaChange(change: Record<string, unknown>): unknown {
  const deck = buildExampleDeck();
  return withDeckChange({ ideas: [{ ...deck.ideas[0], ...change }] });
}

// @FollowsBlueprint test-pure-unit
describe('parseDecksDocument', () => {
  it('reads the build output back unchanged after a JSON round trip', () => {
    const document = buildExampleDocument();
    const roundTripped: unknown = JSON.parse(JSON.stringify(document));
    expect(parseDecksDocument(roundTripped)).toEqual(document);
  });

  it('keeps a trap filter, a credit and a card with no opponent move', () => {
    const deck = buildExampleDeck();
    const document = {
      version: 1,
      decks: [
        {
          ...deck,
          side: 'white',
          trapFilter: { openingTags: ['Albin'] },
          cards: [{ ...deck.cards[0], opponentMoveUci: null }],
          ideas: [
            { ...deck.ideas[0], source: 'wikipedia', sourceUrl: 'https://en.wikipedia.org/wiki/A' },
          ],
        },
      ],
    };
    expect(parseDecksDocument(document)).toEqual(document);
  });

  it('drops a field the type does not name', () => {
    const decksDocument = parseDecksDocument(withDeckChange({ retention: 0.9 }));
    expect(decksDocument.decks[0]).not.toHaveProperty('retention');
  });

  it('refuses a function that carries the fields of a document', () => {
    const disguised = Object.assign(() => undefined, buildExampleDocument());
    expect(readFailedDeckId(disguised)).toBe('DeckContentInvalidError unknown');
  });

  it('names an error with the tag of the trainer and a message naming the deck', () => {
    const error = new DeckContentInvalidError('vienna-game');
    expect(error.name).toBe('DeckContentInvalidError');
    expect(error.deckId).toBe('vienna-game');
    expect(error.message).toBe(
      'The built deck "vienna-game" does not have the shape the trainer reads.',
    );
  });

  it.each([
    ['a value that is no record', 'decks'],
    ['a null', null],
    ['a list', [buildExampleDocument()]],
    ['another version', { version: 2, decks: [] }],
    ['decks that are no list', { version: 1, decks: {} }],
    ['a deck that is no record', { version: 1, decks: ['albin'] }],
    ['a deck that is a list', { version: 1, decks: [[]] }],
    ['a deck that is null', { version: 1, decks: [null] }],
    ['a deck with no id', withDeckChange({ id: undefined })],
    ['a deck with an empty id', withDeckChange({ id: '' })],
  ])('refuses %s without knowing the deck', (_label, value) => {
    expect(readFailedDeckId(value)).toBe('DeckContentInvalidError unknown');
  });

  it.each([
    ['a name key that is no text', withDeckChange({ nameKey: 3 })],
    ['an unknown side', withDeckChange({ side: 'both' })],
    ['lines that are no list', withDeckChange({ lines: 'd4' })],
    ['a line that is no record', withDeckChange({ lines: ['d4'] })],
    ['a line that is null', withDeckChange({ lines: [null] })],
    ['a trap filter that is null', withDeckChange({ trapFilter: null })],
    [
      'a card whose position is an object that prints as a key',
      withCardChange({ positionKey: { toString: () => '8/8/8/8/8/8/8/K6k w - -' } }),
    ],
    [
      'a card id that is an object that prints as a move card id',
      withCardChange({ cardId: { toString: () => 'move:albin:8/8/8/8/8/8/8/K6k w - -' } }),
    ],
    ['a line with no name', withDeckChange({ lines: [{ movesSan: ['d4'], movesUci: ['d2d4'] }] })],
    [
      'a line whose SAN is no list of texts',
      withDeckChange({
        lines: [{ name: 'Main', movesSan: ['d4', 4], movesUci: ['d2d4', 'd7d5'] }],
      }),
    ],
    [
      'a line whose UCI is no list',
      withDeckChange({ lines: [{ name: 'Main', movesSan: ['d4'], movesUci: 'd2d4' }] }),
    ],
    [
      'a line whose two notations differ in length',
      withDeckChange({ lines: [{ name: 'Main', movesSan: ['d4', 'd5'], movesUci: ['d2d4'] }] }),
    ],
    ['cards that are no list', withDeckChange({ cards: {} })],
    ['a card that is no record', withDeckChange({ cards: ['card'] })],
    ['a card of another kind', withCardChange({ kind: 'name' })],
    ['a card id that is no move card id', withCardChange({ cardId: 'trap:00sHx' })],
    ['a card id that is no text', withCardChange({ cardId: 3 })],
    ['a card id that is no card id at all', withCardChange({ cardId: 'nowhere' })],
    ['a card with no deck', withCardChange({ deckId: '' })],
    ['a card whose position is no key', withCardChange({ positionKey: 'somewhere' })],
    ['a card whose position is no text', withCardChange({ positionKey: 4 })],
    ['a card with no FEN', withCardChange({ fen: undefined })],
    ['a card whose opponent move is missing', withCardChange({ opponentMoveUci: undefined })],
    ['a card whose opponent move is empty', withCardChange({ opponentMoveUci: '' })],
    ['a card with no book move', withCardChange({ bookMoveUci: null })],
    ['a card with no SAN', withCardChange({ bookMoveSan: 5 })],
    ['a card whose idea position is no key', withCardChange({ ideaPositionKey: 'x' })],
    ['ideas that are no list', withDeckChange({ ideas: 'ideas' })],
    ['an idea that is no record', withDeckChange({ ideas: [null] })],
    ['an idea whose position is no key', withIdeaChange({ positionKey: 'x' })],
    ['an idea with no English', withIdeaChange({ en: '' })],
    ['an idea with no French', withIdeaChange({ fr: undefined })],
    ['an idea with another source', withIdeaChange({ source: 'lichess', sourceUrl: 'https://x' })],
    ['an idea with a source and no link', withIdeaChange({ source: 'wikipedia' })],
    ['an idea with a link and no source', withIdeaChange({ sourceUrl: 'https://x' })],
    ['a trap filter that is no record', withDeckChange({ trapFilter: 'Albin' })],
    ['a trap filter with no tags', withDeckChange({ trapFilter: { openingTags: 'Albin' } })],
  ])('refuses %s and names the deck', (_label, value) => {
    expect(readFailedDeckId(value)).toBe('DeckContentInvalidError albin-countergambit');
  });
});

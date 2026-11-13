import { describe, expect, it } from 'vitest';
import { buildExampleDocument } from './deck.test-utils';
import { DeckContentInvalidError } from './deck.utils';
import { selectDecksLoad } from './decks-load.utils';

// @FollowsBlueprint test-pure-unit
describe('selectDecksLoad', () => {
  it('hands the decks over when the body parses', () => {
    const document = buildExampleDocument();
    expect(selectDecksLoad(document)).toEqual({
      status: 'loaded',
      decks: document.decks,
      failure: null,
    });
  });

  it('answers a failure that names the deck when the body does not parse', () => {
    const load = selectDecksLoad({ version: 1, decks: [{ id: 'vienna-game' }] });
    expect(load.status).toBe('failed');
    expect(load.decks).toEqual([]);
    expect(load.failure).toBeInstanceOf(DeckContentInvalidError);
    expect(load.failure?.deckId).toBe('vienna-game');
  });

  it('fails on a body the network did not deliver', () => {
    expect(selectDecksLoad(null).failure?.deckId).toBe('unknown');
  });

  it('lets an error of another kind through', () => {
    const hostile = {
      version: 1,
      get decks(): never {
        throw new TypeError('hostile getter');
      },
    };
    expect(() => selectDecksLoad(hostile)).toThrow(TypeError);
  });
});

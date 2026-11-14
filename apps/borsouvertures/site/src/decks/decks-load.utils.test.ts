import { describe, expect, it } from 'vitest';
import { buildExampleDocument } from './deck.test-utils';
import { DeckContentInvalidError } from './deck.utils';
import { DecksDocumentRefusedError, selectDecksLoad } from './decks-load.utils';

// @FollowsBlueprint test-pure-unit
describe('selectDecksLoad', () => {
  it('hands the decks over when the body parses', () => {
    const document = buildExampleDocument();
    expect(selectDecksLoad({ status: 'arrived', body: document })).toEqual({
      status: 'loaded',
      decks: document.decks,
      failure: null,
    });
  });

  it('answers a failure that names the deck when the body does not parse', () => {
    const load = selectDecksLoad({
      status: 'arrived',
      body: { version: 1, decks: [{ id: 'vienna-game' }] },
    });
    expect(load.status).toBe('failed');
    expect(load.decks).toEqual([]);
    expect(load.failure).toBeInstanceOf(DeckContentInvalidError);
    expect(load).toMatchObject({
      failure: { deckId: 'vienna-game' },
      tags: { deckId: 'vienna-game' },
    });
  });

  it('fails on a body that arrived and is no deck document, naming no deck', () => {
    expect(selectDecksLoad({ status: 'arrived', body: null }).failure).toMatchObject({
      deckId: 'unknown',
    });
  });

  it('answers unreachable with no failure to report when the file did not arrive', () => {
    expect(selectDecksLoad({ status: 'unreachable' })).toEqual({
      status: 'unreachable',
      decks: [],
      failure: null,
    });
  });

  it('fails with the status when our own origin refuses the file, so a deploy defect is reported', () => {
    const load = selectDecksLoad({ status: 'refused', httpStatus: 404 });
    expect(load.status).toBe('failed');
    expect(load.decks).toEqual([]);
    expect(load.failure).toBeInstanceOf(DecksDocumentRefusedError);
    expect(load.failure?.name).toBe('DecksDocumentRefusedError');
    expect(load.failure?.message).toBe('The site answered 404 for the built decks.');
    expect(load).toMatchObject({ tags: { status: '404', route: 'GET /decks.json' } });
  });

  it('lets an error of another kind through', () => {
    const hostile = {
      version: 1,
      get decks(): never {
        throw new TypeError('hostile getter');
      },
    };
    expect(() => selectDecksLoad({ status: 'arrived', body: hostile })).toThrow(TypeError);
  });
});

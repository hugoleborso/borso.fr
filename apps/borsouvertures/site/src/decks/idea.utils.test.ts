import { describe, expect, it } from 'vitest';
import { listIdeaSourceUrls, selectDeckName, selectIdeaText } from './idea.utils';

const IDEA = { positionKey: '8/8/8/8/8/8/8/K6k w - -', en: 'English text.', fr: 'Texte français.' };

// @FollowsBlueprint test-pure-unit
describe('selectIdeaText', () => {
  it('shows French to a French interface, whatever the region', () => {
    expect(selectIdeaText(IDEA, 'fr')).toBe('Texte français.');
    expect(selectIdeaText(IDEA, 'fr-CA')).toBe('Texte français.');
    expect(selectIdeaText(IDEA, 'FR')).toBe('Texte français.');
  });

  it('shows English to every other interface', () => {
    expect(selectIdeaText(IDEA, 'en')).toBe('English text.');
    expect(selectIdeaText(IDEA, 'en-GB')).toBe('English text.');
    expect(selectIdeaText(IDEA, 'de')).toBe('English text.');
  });
});

describe('selectDeckName', () => {
  it('uses the catalogue text, and the key when the catalogue has none', () => {
    expect(selectDeckName('Albin Countergambit', 'decks.names.albin')).toBe('Albin Countergambit');
    expect(selectDeckName(undefined, 'decks.names.albin')).toBe('decks.names.albin');
    expect(selectDeckName({ nested: 'x' }, 'decks.names.albin')).toBe('decks.names.albin');
  });
});

describe('listIdeaSourceUrls', () => {
  it('names each source once, in the order the ideas show it', () => {
    const albin = 'https://en.wikipedia.org/wiki/Albin_Countergambit';
    const vienna = 'https://en.wikipedia.org/wiki/Vienna_Game';
    expect(
      listIdeaSourceUrls([
        { ...IDEA, sourceUrl: albin },
        null,
        IDEA,
        { ...IDEA, sourceUrl: vienna },
        { ...IDEA, sourceUrl: albin },
      ]),
    ).toEqual([albin, vienna]);
  });

  it('names no source when no idea carries one', () => {
    expect(listIdeaSourceUrls([IDEA, null])).toEqual([]);
  });
});

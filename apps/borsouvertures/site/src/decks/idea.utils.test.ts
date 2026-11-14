import { describe, expect, it } from 'vitest';
import { selectDeckName, selectIdeaText } from './idea.utils';

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

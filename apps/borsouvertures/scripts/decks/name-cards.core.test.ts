import { describe, expect, it } from 'vitest';
import { EXAMPLE_NAME_CARD } from '../../site/src/decks/deck.test-utils';
import { NAME_CARD_OPENINGS as OPENINGS } from './deck-build.test-utils';
import { buildNameCards, hashSeededText } from './name-cards.core';

const FIVE_NAMES = ['Vienna Game', 'Italian Game', 'Ruy Lopez', 'Scotch Game', 'Sicilian Defense'];

function buildFrom(names: unknown, openings: unknown = OPENINGS) {
  return buildNameCards({ nameList: { names }, openings });
}

// @FollowsBlueprint test-pure-unit
describe('buildNameCards', () => {
  it('shows the position at the end of the shortest line with the name', () => {
    const build = buildFrom(FIVE_NAMES);
    expect(build.problems).toEqual([]);
    expect(build.cards[0]).toEqual(EXAMPLE_NAME_CARD);
  });

  it('breaks a tie between two lines of one length by their UCI moves', () => {
    const [scotch] = buildFrom(['Scotch Game', ...FIVE_NAMES.slice(0, 3)]).cards;
    expect(scotch?.movesSan).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'd4']);
  });

  it('offers four distinct names in a seeded order, the right one once', () => {
    expect(buildFrom(FIVE_NAMES).cards.map((card) => [card.openingName, card.choices])).toEqual([
      ['Vienna Game', ['Sicilian Defense', 'Vienna Game', 'Scotch Game', 'Ruy Lopez']],
      ['Italian Game', ['Ruy Lopez', 'Italian Game', 'Vienna Game', 'Scotch Game']],
      ['Ruy Lopez', ['Italian Game', 'Sicilian Defense', 'Vienna Game', 'Ruy Lopez']],
      ['Scotch Game', ['Italian Game', 'Sicilian Defense', 'Ruy Lopez', 'Scotch Game']],
      ['Sicilian Defense', ['Sicilian Defense', 'Italian Game', 'Scotch Game', 'Vienna Game']],
    ]);
  });

  it('hashes a text under a seed the same way on every build', () => {
    expect(hashSeededText('Vienna Game', 'Ruy Lopez')).toBe(
      hashSeededText('Vienna Game', 'Ruy Lopez'),
    );
    expect(hashSeededText('', '')).toBe(252_472_541);
    expect(hashSeededText('a', 'b')).not.toBe(hashSeededText('b', 'a'));
  });

  it('refuses a name listed twice, a name no line carries and a position two names share', () => {
    const build = buildFrom([...FIVE_NAMES, 'Vienna Game', 'Nowhere', 'Sicilian Twin']);
    expect(build.cards.map((card) => card.openingName)).toEqual(FIVE_NAMES);
    expect(build.problems).toEqual([
      'name-cards.json: "Vienna Game" is listed twice',
      'name-cards.json: "Nowhere" is the name of no line of openings.json',
      'name-cards.json: "Sicilian Twin" shows the same position as "Sicilian Defense"',
    ]);
  });

  it('refuses a list of fewer than four distinct names', () => {
    expect(buildFrom(['Vienna Game', 'Ruy Lopez', 'Ruy Lopez', 'Scotch Game']).problems).toEqual([
      'name-cards.json: "Vienna Game" needs 4 names to choose from, the list holds 3',
      'name-cards.json: "Ruy Lopez" needs 4 names to choose from, the list holds 3',
      'name-cards.json: "Ruy Lopez" needs 4 names to choose from, the list holds 3',
      'name-cards.json: "Scotch Game" needs 4 names to choose from, the list holds 3',
    ]);
  });

  it.each([
    ['no record', null],
    ['a list', [FIVE_NAMES]],
    ['names that are no list', { names: 'Vienna Game' }],
    ['an empty name', { names: ['Vienna Game', ''] }],
    ['a name that is no text', { names: [3] }],
    ['a name that is a list', { names: [['Vienna Game']] }],
    ['a function that carries names', Object.assign(() => undefined, { names: ['Vienna Game'] })],
  ])('refuses a name list that is %s', (_label, nameList) => {
    expect(buildNameCards({ nameList, openings: OPENINGS })).toEqual({
      cards: [],
      problems: ['name-cards.json must hold { "names": [...] } with opening names'],
    });
  });

  it('refuses an openings dataset of another shape', () => {
    expect(buildFrom(FIVE_NAMES, { openings: [] })).toEqual({
      cards: [],
      problems: ['openings.json does not have the shape the name cards read'],
    });
  });
});

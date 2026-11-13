import { describe, expect, it } from 'vitest';
import { EXAMPLE_DECK } from './deck-build.test-utils';
import { DEFAULT_PLIES_PER_LINE, parseDeckSource } from './deck-source.core';

function listProblems(deck: unknown): string[] {
  const parse = parseDeckSource(deck);
  return parse.ok ? [] : parse.problems;
}

// @FollowsBlueprint test-pure-unit
describe('parseDeckSource', () => {
  it('reads a deck and fills the two optional fields', () => {
    const { pliesPerLine: _pliesPerLine, ...withoutPlies } = EXAMPLE_DECK;
    expect(parseDeckSource(withoutPlies)).toEqual({
      ok: true,
      deck: { ...withoutPlies, pliesPerLine: DEFAULT_PLIES_PER_LINE, engineExceptions: [] },
    });
    expect(DEFAULT_PLIES_PER_LINE).toEqual({ minimum: 12, maximum: 20 });
  });

  it('keeps the plies, the exceptions and the trap filter a deck states', () => {
    const exception = {
      movesSan: ['d4', 'd5', 'c4', 'e5'],
      reason: '  A sound gambit known to theory.  ',
    };
    const parse = parseDeckSource({
      ...EXAMPLE_DECK,
      side: 'white',
      pliesPerLine: { minimum: 8, maximum: 8 },
      engineExceptions: [exception],
      trapFilter: { openingTags: ['Albin_Countergambit'] },
    });
    expect(parse).toEqual({
      ok: true,
      deck: {
        ...EXAMPLE_DECK,
        side: 'white',
        pliesPerLine: { minimum: 8, maximum: 8 },
        engineExceptions: [
          { movesSan: ['d4', 'd5', 'c4', 'e5'], reason: 'A sound gambit known to theory.' },
        ],
        trapFilter: { openingTags: ['Albin_Countergambit'] },
      },
    });
  });

  it('refuses a value that is no object', () => {
    expect(listProblems(null)).toEqual(['deck.json must hold an object']);
    expect(listProblems([EXAMPLE_DECK])).toEqual(['deck.json must hold an object']);
    expect(listProblems('deck')).toEqual(['deck.json must hold an object']);
  });

  it.each([
    [{ id: 'Albin' }, '"id" must be lower-case words joined by hyphens'],
    [{ id: 'albin--gambit' }, '"id" must be lower-case words joined by hyphens'],
    [{ id: '' }, '"id" must be lower-case words joined by hyphens'],
    [{ id: 7 }, '"id" must be lower-case words joined by hyphens'],
    [{ order: 0 }, '"order" must be a positive integer'],
    [{ order: 1.5 }, '"order" must be a positive integer'],
    [{ order: '1' }, '"order" must be a positive integer'],
    [{ nameKey: '' }, '"nameKey" must be a catalogue key'],
    [{ nameKey: 4 }, '"nameKey" must be a catalogue key'],
    [{ side: 'both' }, '"side" must be "white" or "black"'],
    [{ lines: [] }, '"lines" must hold at least one line'],
    [{ lines: 'd4 d5' }, '"lines" must hold at least one line'],
    [{ lines: ['d4 d5'] }, 'line 1 must be an object'],
    [{ lines: [{ name: 'ab', movesSan: ['d4'] }] }, 'line 1: "name" must have 3 to 60 characters'],
    [
      { lines: [{ name: 'a'.repeat(61), movesSan: ['d4'] }] },
      'line 1: "name" must have 3 to 60 characters',
    ],
    [{ lines: [{ name: 7, movesSan: ['d4'] }] }, 'line 1: "name" must have 3 to 60 characters'],
    [{ lines: [{ name: 'Main', movesSan: [] }] }, 'line 1: "movesSan" must be a list of moves'],
    [
      { lines: [{ name: 'Main', movesSan: ['d4', 5] }] },
      'line 1: "movesSan" must be a list of moves',
    ],
    [{ lines: [{ name: 'Main', movesSan: 'd4' }] }, 'line 1: "movesSan" must be a list of moves'],
    [
      {
        lines: [
          { name: 'Main', movesSan: ['d4'] },
          { name: 'Main', movesSan: ['e4'] },
          { name: 'Main', movesSan: ['c4'] },
        ],
      },
      'the line name "Main" is used twice',
    ],
    [
      { pliesPerLine: { minimum: 9, maximum: 8 } },
      '"pliesPerLine" must hold a positive "minimum" no greater than its "maximum"',
    ],
    [
      { pliesPerLine: { minimum: 0, maximum: 8 } },
      '"pliesPerLine" must hold a positive "minimum" no greater than its "maximum"',
    ],
    [
      { pliesPerLine: { minimum: 8 } },
      '"pliesPerLine" must hold a positive "minimum" no greater than its "maximum"',
    ],
    [
      { pliesPerLine: 12 },
      '"pliesPerLine" must hold a positive "minimum" no greater than its "maximum"',
    ],
    [{ engineExceptions: {} }, '"engineExceptions" must be a list'],
    [
      { engineExceptions: [{ reason: 'A sound gambit known to theory.' }] },
      'engine exception 1: "movesSan" must be a list of moves',
    ],
    [{ engineExceptions: ['e5'] }, 'engine exception 1: "movesSan" must be a list of moves'],
    [
      { engineExceptions: [{ movesSan: ['d4', 'd5'], reason: '' }] },
      'engine exception 1 (d4 d5): "reason" must give the chess reason in at least 20 characters',
    ],
    [
      {
        engineExceptions: [
          { movesSan: ['d4', 'd5'], reason: `${' '.repeat(10)}nineteen characters` },
        ],
      },
      'engine exception 1 (d4 d5): "reason" must give the chess reason in at least 20 characters',
    ],
    [
      { engineExceptions: [{ movesSan: ['d4', 'd5'] }] },
      'engine exception 1 (d4 d5): "reason" must give the chess reason in at least 20 characters',
    ],
    [{ trapFilter: { openingTags: [] } }, '"trapFilter.openingTags" must be a list of tags'],
    [{ trapFilter: 'Albin' }, '"trapFilter.openingTags" must be a list of tags'],
  ])('refuses %j', (change, problem) => {
    expect(listProblems({ ...EXAMPLE_DECK, ...change })).toEqual([problem]);
  });

  it('accepts a name of 3 and of 60 characters and a reason of 20', () => {
    expect(
      listProblems({
        ...EXAMPLE_DECK,
        lines: [
          { name: 'abc', movesSan: ['d4'] },
          { name: 'a'.repeat(60), movesSan: ['e4'] },
        ],
        engineExceptions: [{ movesSan: ['d4'], reason: 'twenty characters ok' }],
      }),
    ).toEqual([]);
  });

  it('reports every problem of a deck at once, in field order', () => {
    expect(
      listProblems({
        id: 'X',
        order: -1,
        nameKey: null,
        side: 'red',
        lines: [{ name: 'ab', movesSan: [] }],
        pliesPerLine: 3,
        engineExceptions: 3,
        trapFilter: 3,
      }),
    ).toEqual([
      '"id" must be lower-case words joined by hyphens',
      '"order" must be a positive integer',
      '"nameKey" must be a catalogue key',
      '"side" must be "white" or "black"',
      'line 1: "name" must have 3 to 60 characters',
      'line 1: "movesSan" must be a list of moves',
      '"pliesPerLine" must hold a positive "minimum" no greater than its "maximum"',
      '"engineExceptions" must be a list',
      '"trapFilter.openingTags" must be a list of tags',
    ]);
  });

  it('numbers the second line and the second exception', () => {
    expect(
      listProblems({
        ...EXAMPLE_DECK,
        lines: [{ name: 'Main', movesSan: ['d4'] }, 'second'],
        engineExceptions: [{ movesSan: ['d4'], reason: 'twenty characters ok' }, 'second'],
      }),
    ).toEqual([
      'line 2 must be an object',
      'engine exception 2: "movesSan" must be a list of moves',
    ]);
  });
});

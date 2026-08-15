import { describe, expect, it } from 'vitest';
import {
  buildBaseline,
  countDivergentFiles,
  countSuffixes,
  listCaseStyleDivergences,
  listDivergences,
  listHookNamingDivergences,
  listLayerMarkerDivergences,
  listRatchetFailures,
  listStaleBaselineKeys,
  readCaseStyle,
  readNameStem,
  readNameSuffix,
  type FileFact,
} from './conventions.core';

function buildFact(path: string, overrides: Partial<FileFact> = {}): FileFact {
  const basename = path.split('/').at(-1) ?? path;
  return { path, layer: 'utils', basename, exportsHook: false, ...overrides };
}

describe('readNameStem', () => {
  it('drops every suffix', () => {
    expect(readNameStem('songs.queries.ts')).toBe('songs');
  });

  it('returns a name that carries no dot unchanged', () => {
    expect(readNameStem('Button')).toBe('Button');
  });
});

describe('readNameSuffix', () => {
  it('reads the dotted suffix', () => {
    expect(readNameSuffix('songs.queries.ts')).toBe('queries');
  });

  it('reads no suffix from a plain module', () => {
    expect(readNameSuffix('viewport.ts')).toBeNull();
  });
});

describe('readCaseStyle', () => {
  /** `books` and `self-punch` are one convention, not two. */
  it.each([
    ['books', 'kebab'],
    ['self-punch', 'kebab'],
    ['bookArrows', 'camel'],
    ['SongCard', 'pascal'],
    ['12-travaux', 'kebab'],
    ['snake_case_name', 'other'],
  ])('reads %s as %s', (stem, expected) => {
    expect(readCaseStyle(stem)).toBe(expected);
  });
});

describe('listCaseStyleDivergences', () => {
  it('finds nothing when a layer agrees', () => {
    const facts = [buildFact('apps/a/x/one-thing.utils.ts'), buildFact('apps/a/x/two.utils.ts')];
    expect(listCaseStyleDivergences(facts)).toEqual([]);
  });

  it('reports a layer that uses two case styles, majority first', () => {
    const facts = [
      buildFact('apps/a/x/one-thing.utils.ts'),
      buildFact('apps/a/x/another-thing.utils.ts'),
      buildFact('apps/b/x/bookArrows.utils.ts'),
    ];
    const [divergence] = listCaseStyleDivergences(facts);
    expect(divergence?.key).toBe('case-style:utils.ts');
    expect(divergence?.variants.map((variant) => [variant.name, variant.count])).toEqual([
      ['kebab', 2],
      ['camel', 1],
    ]);
  });

  /** The question names the extension, because the answer differs by extension. */
  it('names the extension in the question it asks about components', () => {
    const facts = [
      buildFact('apps/a/x/SongCard.tsx', { layer: 'atom' }),
      buildFact('apps/a/x/song-card.tsx', { layer: 'atom' }),
    ];
    const [divergence] = listCaseStyleDivergences(facts);
    expect(divergence?.key).toBe('case-style:atom.tsx');
    expect(divergence?.question).toBe('How is the name of a atom.tsx file written?');
  });

  /** A component is PascalCase and a module is kebab-case, and both are right. */
  it('asks the question per extension, so a component does not fight a module', () => {
    const facts = [
      buildFact('apps/a/x/App.tsx', { layer: 'entrypoint' }),
      buildFact('apps/a/x/main.ts', { layer: 'entrypoint' }),
    ];
    expect(listCaseStyleDivergences(facts)).toEqual([]);
  });

  it('ignores files whose path gives them no layer', () => {
    const facts = [
      buildFact('apps/a/x/one.ts', { layer: 'unknown' }),
      buildFact('apps/a/x/twoThings.ts', { layer: 'unknown' }),
    ];
    expect(listCaseStyleDivergences(facts)).toEqual([]);
  });

  it('caps the examples it shows', () => {
    const facts = ['one', 'two', 'three', 'four'].map((name) =>
      buildFact(`apps/a/x/${name}.utils.ts`),
    );
    facts.push(buildFact('apps/b/x/bookArrows.utils.ts'));
    const [divergence] = listCaseStyleDivergences(facts);
    expect(divergence?.variants[0]?.examples).toEqual([
      'apps/a/x/alpha.utils.ts',
      'apps/a/x/bravo.utils.ts',
      'apps/a/x/mike.utils.ts',
    ]);
  });

  it('orders two questions by key, so the report is stable', () => {
    const facts = [
      buildFact('apps/a/x/one-thing.utils.ts'),
      buildFact('apps/a/x/bookArrows.utils.ts'),
      buildFact('apps/a/x/one-thing.core.ts', { layer: 'core' }),
      buildFact('apps/a/x/bookArrows.core.ts', { layer: 'core' }),
    ];
    expect(listCaseStyleDivergences(facts).map((divergence) => divergence.key)).toEqual([
      'case-style:core.ts',
      'case-style:utils.ts',
    ]);
  });

  it('orders two variants of equal size by name, so the report is stable', () => {
    const facts = [
      buildFact('apps/a/x/bookArrows.utils.ts'),
      buildFact('apps/a/x/one-thing.utils.ts'),
    ];
    const [divergence] = listCaseStyleDivergences(facts);
    expect(divergence?.variants.map((variant) => variant.name)).toEqual(['camel', 'kebab']);
  });
});

describe('listHookNamingDivergences', () => {
  it('finds nothing when every hook module is spelled the same way', () => {
    const facts = [
      buildFact('apps/a/x/online-status.hook.ts', { exportsHook: true, layer: 'hook' }),
      buildFact('apps/a/x/nav-badges.hook.ts', { exportsHook: true, layer: 'hook' }),
    ];
    expect(listHookNamingDivergences(facts)).toEqual([]);
  });

  it('reports the three spellings a hook module can carry', () => {
    const facts = [
      buildFact('apps/a/x/online-status.hook.ts', { exportsHook: true }),
      buildFact('apps/a/x/usePaginatedList.ts', { exportsHook: true }),
      buildFact('apps/a/x/viewport.ts', { exportsHook: true }),
      buildFact('apps/a/x/not-a-hook.ts'),
    ];
    const [divergence] = listHookNamingDivergences(facts);
    expect(divergence?.key).toBe('role-marker:hook');
    expect(divergence?.variants.map((variant) => variant.name).sort()).toEqual([
      '<name>.hook.ts',
      'no marker in the name',
      'use<Name>.ts',
    ]);
  });

  it('finds nothing when no module exports a hook', () => {
    expect(listHookNamingDivergences([buildFact('apps/a/x/plain.ts')])).toEqual([]);
  });
});

describe('countSuffixes', () => {
  it('counts each suffix and orders by how many files carry it', () => {
    const facts = [
      buildFact('apps/a/x/one.utils.ts'),
      buildFact('apps/a/x/two.utils.ts'),
      buildFact('apps/a/x/three.core.ts'),
      buildFact('apps/a/x/plain.ts'),
    ];
    expect(countSuffixes(facts).map((variant) => [variant.name, variant.count])).toEqual([
      ['utils', 2],
      ['core', 1],
    ]);
  });
});

describe('listLayerMarkerDivergences', () => {
  it('counts the files whose name says no layer, per application', () => {
    const facts = [
      buildFact('apps/pragma/api/src/songs/songs.service.ts'),
      buildFact('apps/pragma/api/src/songs/tonality.core.ts'),
      buildFact('apps/pragma/site/src/clock-store.ts', { layer: 'unknown' }),
      buildFact('apps/borso-fr/site/src/home-page.ts', { layer: 'unknown' }),
    ];
    const divergences = listLayerMarkerDivergences(facts);
    expect(divergences.map((divergence) => divergence.key)).toEqual([
      'layer-marker:pragma',
      'layer-marker:borso-fr',
    ]);
    expect(divergences.map((divergence) => divergence.question)).toEqual([
      'Does a file in pragma say which layer it is in?',
      'Does a file in borso-fr say which layer it is in?',
    ]);
    expect(divergences.map(countDivergentFiles)).toEqual([1, 1]);
  });

  it('names the two answers so the report says which one is the defect', () => {
    const facts = [
      buildFact('apps/a/site/src/one.utils.ts'),
      buildFact('apps/a/site/src/two.utils.ts'),
      buildFact('apps/a/site/src/three.ts', { layer: 'unknown' }),
    ];
    const [divergence] = listLayerMarkerDivergences(facts);
    expect(divergence?.variants.map((variant) => variant.name)).toEqual([
      'the suffix names the layer',
      'nothing in the name says',
    ]);
    expect(divergence?.correctVariant).toBe('the suffix names the layer');
  });

  it('ignores a bare `apps` path, which names no application', () => {
    expect(listLayerMarkerDivergences([buildFact('apps', { layer: 'unknown' })])).toEqual([]);
  });

  it('asks nothing of an application where every file names its layer', () => {
    expect(
      listLayerMarkerDivergences([buildFact('apps/pragma/api/src/songs/songs.service.ts')]),
    ).toEqual([]);
  });

  it('ignores a path outside apps, which has no application to attribute it to', () => {
    expect(
      listLayerMarkerDivergences([buildFact('infra/cdk/src/index.ts', { layer: 'unknown' })]),
    ).toEqual([]);
  });

  it('counts the unlayered files even when they are the majority', () => {
    const facts = [
      buildFact('apps/a/site/src/one.ts', { layer: 'unknown' }),
      buildFact('apps/a/site/src/two.ts', { layer: 'unknown' }),
      buildFact('apps/a/site/src/three.utils.ts'),
    ];
    expect(listLayerMarkerDivergences(facts).map(countDivergentFiles)).toEqual([2]);
  });
});

describe('listDivergences', () => {
  it('returns every kind, ordered by key', () => {
    const facts = [
      buildFact('apps/a/x/one-thing.utils.ts'),
      buildFact('apps/a/x/bookArrows.utils.ts'),
      buildFact('apps/a/x/online-status.hook.ts', { exportsHook: true }),
      buildFact('apps/a/x/viewport.ts', { exportsHook: true }),
      buildFact('apps/a/x/no-layer.ts', { layer: 'unknown' }),
    ];
    expect(listDivergences(facts).map((divergence) => divergence.key)).toEqual([
      'case-style:utils.ts',
      'layer-marker:a',
      'role-marker:hook',
    ]);
  });
});

describe('countDivergentFiles', () => {
  it('counts everything outside the majority spelling', () => {
    const divergence = {
      key: 'k',
      question: 'q',
      variants: [
        { name: 'kebab', count: 41, examples: [] },
        { name: 'camel', count: 12, examples: [] },
      ],
    };
    expect(countDivergentFiles(divergence)).toBe(12);
  });

  it('counts nothing for a divergence with no variants', () => {
    expect(countDivergentFiles({ key: 'k', question: 'q', variants: [] })).toBe(0);
  });

  it('counts everything but the documented answer, even when that answer leads', () => {
    const divergence = {
      key: 'k',
      question: 'q',
      variants: [
        { name: 'named', count: 54, examples: [] },
        { name: 'unnamed', count: 15, examples: [] },
      ],
      correctVariant: 'named',
    };
    expect(countDivergentFiles(divergence)).toBe(15);
  });

  it('counts everything but the documented answer when that answer trails', () => {
    const divergence = {
      key: 'k',
      question: 'q',
      variants: [
        { name: 'unnamed', count: 54, examples: [] },
        { name: 'named', count: 15, examples: [] },
      ],
      correctVariant: 'named',
    };
    expect(countDivergentFiles(divergence)).toBe(54);
  });

  it('counts every file when nothing spells the documented answer yet', () => {
    const divergence = {
      key: 'k',
      question: 'q',
      variants: [
        { name: 'one way', count: 54, examples: [] },
        { name: 'another', count: 15, examples: [] },
      ],
      correctVariant: 'the documented one',
    };
    expect(countDivergentFiles(divergence)).toBe(69);
  });
});

describe('buildBaseline', () => {
  it('records one count per question', () => {
    const divergences = [
      {
        key: 'case-style:utils.ts',
        question: 'q',
        variants: [
          { name: 'kebab', count: 2, examples: [] },
          { name: 'camel', count: 1, examples: [] },
        ],
      },
    ];
    expect(buildBaseline(divergences)).toEqual({ 'case-style:utils.ts': 1 });
  });
});

describe('listRatchetFailures', () => {
  it('allows a count that falls, which is the point of fixing one', () => {
    expect(listRatchetFailures({ a: 5 }, { a: 3 })).toEqual([]);
  });

  it('allows a count that holds', () => {
    expect(listRatchetFailures({ a: 5 }, { a: 5 })).toEqual([]);
  });

  it('fails a count that rises', () => {
    expect(listRatchetFailures({ a: 5 }, { a: 6 })).toEqual([{ key: 'a', was: 5, now: 6 }]);
  });

  it('fails a question that had one answer and now has two', () => {
    expect(listRatchetFailures({}, { fresh: 1 })).toEqual([{ key: 'fresh', was: 0, now: 1 }]);
  });

  it('reports failures in key order, so the message is stable', () => {
    const failures = listRatchetFailures({}, { zebra: 1, alpha: 1 });
    expect(failures.map((failure) => failure.key)).toEqual(['alpha', 'zebra']);
  });
});

describe('listStaleBaselineKeys', () => {
  it('names a baseline entry the tree no longer produces', () => {
    expect(listStaleBaselineKeys({ gone: 2, kept: 1 }, { kept: 1 })).toEqual(['gone']);
  });

  it('names them in key order, so the message is stable', () => {
    expect(listStaleBaselineKeys({ zebra: 2, alpha: 1, kept: 1 }, { kept: 1 })).toEqual([
      'alpha',
      'zebra',
    ]);
  });

  it('names nothing when the baseline matches the tree', () => {
    expect(listStaleBaselineKeys({ kept: 1 }, { kept: 1 })).toEqual([]);
  });
});

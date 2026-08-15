import { describe, expect, it } from 'vitest';
import {
  buildBaseline,
  countMinorityFiles,
  countSuffixes,
  findCaseStyleDivergences,
  findDivergences,
  findHookNamingDivergence,
  findRatchetFailures,
  findStaleBaselineKeys,
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

describe('findCaseStyleDivergences', () => {
  it('finds nothing when a layer agrees', () => {
    const facts = [buildFact('apps/a/x/one-thing.utils.ts'), buildFact('apps/a/x/two.utils.ts')];
    expect(findCaseStyleDivergences(facts)).toEqual([]);
  });

  it('reports a layer that uses two case styles, majority first', () => {
    const facts = [
      buildFact('apps/a/x/one-thing.utils.ts'),
      buildFact('apps/a/x/another-thing.utils.ts'),
      buildFact('apps/b/x/bookArrows.utils.ts'),
    ];
    const [divergence] = findCaseStyleDivergences(facts);
    expect(divergence?.key).toBe('case-style:utils.ts');
    expect(divergence?.variants.map((variant) => [variant.name, variant.count])).toEqual([
      ['kebab', 2],
      ['camel', 1],
    ]);
  });

  /** A component is PascalCase and a module is kebab-case, and both are right. */
  it('asks the question per extension, so a component does not fight a module', () => {
    const facts = [
      buildFact('apps/a/x/App.tsx', { layer: 'entrypoint' }),
      buildFact('apps/a/x/main.ts', { layer: 'entrypoint' }),
    ];
    expect(findCaseStyleDivergences(facts)).toEqual([]);
  });

  it('ignores files whose path gives them no layer', () => {
    const facts = [
      buildFact('apps/a/x/one.ts', { layer: 'unknown' }),
      buildFact('apps/a/x/twoThings.ts', { layer: 'unknown' }),
    ];
    expect(findCaseStyleDivergences(facts)).toEqual([]);
  });

  it('caps the examples it shows', () => {
    const facts = ['one', 'two', 'three', 'four'].map((name) =>
      buildFact(`apps/a/x/${name}.utils.ts`),
    );
    facts.push(buildFact('apps/b/x/bookArrows.utils.ts'));
    const [divergence] = findCaseStyleDivergences(facts);
    expect(divergence?.variants[0]?.examples).toHaveLength(3);
  });

  it('orders two questions by key, so the report is stable', () => {
    const facts = [
      buildFact('apps/a/x/one-thing.utils.ts'),
      buildFact('apps/a/x/bookArrows.utils.ts'),
      buildFact('apps/a/x/one-thing.core.ts', { layer: 'core' }),
      buildFact('apps/a/x/bookArrows.core.ts', { layer: 'core' }),
    ];
    expect(findCaseStyleDivergences(facts).map((divergence) => divergence.key)).toEqual([
      'case-style:core.ts',
      'case-style:utils.ts',
    ]);
  });

  it('orders two variants of equal size by name, so the report is stable', () => {
    const facts = [
      buildFact('apps/a/x/bookArrows.utils.ts'),
      buildFact('apps/a/x/one-thing.utils.ts'),
    ];
    const [divergence] = findCaseStyleDivergences(facts);
    expect(divergence?.variants.map((variant) => variant.name)).toEqual(['camel', 'kebab']);
  });
});

describe('findHookNamingDivergence', () => {
  it('finds nothing when every hook module is spelled the same way', () => {
    const facts = [
      buildFact('apps/a/x/online-status.hook.ts', { exportsHook: true, layer: 'hook' }),
      buildFact('apps/a/x/nav-badges.hook.ts', { exportsHook: true, layer: 'hook' }),
    ];
    expect(findHookNamingDivergence(facts)).toEqual([]);
  });

  it('reports the three spellings a hook module can carry', () => {
    const facts = [
      buildFact('apps/a/x/online-status.hook.ts', { exportsHook: true }),
      buildFact('apps/a/x/usePaginatedList.ts', { exportsHook: true }),
      buildFact('apps/a/x/viewport.ts', { exportsHook: true }),
      buildFact('apps/a/x/not-a-hook.ts'),
    ];
    const [divergence] = findHookNamingDivergence(facts);
    expect(divergence?.key).toBe('role-marker:hook');
    expect(divergence?.variants.map((variant) => variant.name).sort()).toEqual([
      '<name>.hook.ts',
      'no marker in the name',
      'use<Name>.ts',
    ]);
  });

  it('finds nothing when no module exports a hook', () => {
    expect(findHookNamingDivergence([buildFact('apps/a/x/plain.ts')])).toEqual([]);
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

describe('findDivergences', () => {
  it('returns both kinds, ordered by key', () => {
    const facts = [
      buildFact('apps/a/x/one-thing.utils.ts'),
      buildFact('apps/a/x/bookArrows.utils.ts'),
      buildFact('apps/a/x/online-status.hook.ts', { exportsHook: true }),
      buildFact('apps/a/x/viewport.ts', { exportsHook: true }),
    ];
    expect(findDivergences(facts).map((divergence) => divergence.key)).toEqual([
      'case-style:utils.ts',
      'role-marker:hook',
    ]);
  });
});

describe('countMinorityFiles', () => {
  it('counts everything outside the majority spelling', () => {
    const divergence = {
      key: 'k',
      question: 'q',
      variants: [
        { name: 'kebab', count: 41, examples: [] },
        { name: 'camel', count: 12, examples: [] },
      ],
    };
    expect(countMinorityFiles(divergence)).toBe(12);
  });

  it('counts nothing for a divergence with no variants', () => {
    expect(countMinorityFiles({ key: 'k', question: 'q', variants: [] })).toBe(0);
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

describe('findRatchetFailures', () => {
  it('allows a count that falls, which is the point of fixing one', () => {
    expect(findRatchetFailures({ a: 5 }, { a: 3 })).toEqual([]);
  });

  it('allows a count that holds', () => {
    expect(findRatchetFailures({ a: 5 }, { a: 5 })).toEqual([]);
  });

  it('fails a count that rises', () => {
    expect(findRatchetFailures({ a: 5 }, { a: 6 })).toEqual([{ key: 'a', was: 5, now: 6 }]);
  });

  it('fails a question that had one answer and now has two', () => {
    expect(findRatchetFailures({}, { fresh: 1 })).toEqual([{ key: 'fresh', was: 0, now: 1 }]);
  });

  it('reports failures in key order, so the message is stable', () => {
    const failures = findRatchetFailures({}, { zebra: 1, alpha: 1 });
    expect(failures.map((failure) => failure.key)).toEqual(['alpha', 'zebra']);
  });
});

describe('findStaleBaselineKeys', () => {
  it('names a baseline entry the tree no longer produces', () => {
    expect(findStaleBaselineKeys({ gone: 2, kept: 1 }, { kept: 1 })).toEqual(['gone']);
  });

  it('names nothing when the baseline matches the tree', () => {
    expect(findStaleBaselineKeys({ kept: 1 }, { kept: 1 })).toEqual([]);
  });
});

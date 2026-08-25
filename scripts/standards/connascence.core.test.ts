import { describe, expect, it } from 'vitest';
import {
  buildBaseline,
  listAlgorithmConnascence,
  listExecutionConnascence,
  listMeaningConnascence,
  listPositionConnascence,
  listRatchetFailures,
  listValueConnascence,
  localityOf,
  rankFindings,
  scoreOf,
  summariseByKind,
  summariseByWorkspace,
  type Finding,
  type SourceFile,
} from './connascence.core';

function file(path: string, container: string, context: string | null): SourceFile {
  return { path, workspace: 'apps/pragma', container, context, imports: [] };
}

const SONGS_CONTROLLER = file('apps/pragma/api/src/songs/songs.controller.ts', 'api', 'songs');
const SONGS_SERVICE = file('apps/pragma/api/src/songs/songs.service.ts', 'api', 'songs');
const BARS_SERVICE = file('apps/pragma/api/src/bars/bars.service.ts', 'api', 'bars');
const CATALOG_PAGE = file('apps/pragma/site/src/routes/CatalogPage.tsx', 'site', 'routes');

const INDEX: ReadonlyMap<string, SourceFile> = new Map(
  [SONGS_CONTROLLER, SONGS_SERVICE, BARS_SERVICE, CATALOG_PAGE].map((each) => [each.path, each]),
);

describe('localityOf', () => {
  it('is zero for one file', () => {
    expect(localityOf([SONGS_CONTROLLER.path], INDEX)).toBe(0);
  });

  it('is one inside a bounded context', () => {
    expect(localityOf([SONGS_CONTROLLER.path, SONGS_SERVICE.path], INDEX)).toBe(1);
  });

  it('is two across bounded contexts of one container', () => {
    expect(localityOf([SONGS_CONTROLLER.path, BARS_SERVICE.path], INDEX)).toBe(2);
  });

  it('is three across containers', () => {
    expect(localityOf([SONGS_CONTROLLER.path, CATALOG_PAGE.path], INDEX)).toBe(3);
  });

  it('ignores a path the index does not carry', () => {
    expect(localityOf(['apps/pragma/api/src/absent.ts', SONGS_CONTROLLER.path], INDEX)).toBe(0);
  });
});

describe('scoreOf', () => {
  it('multiplies strength by spread and by the locality weight', () => {
    expect(scoreOf('meaning', 3, 1)).toBe(12);
  });

  it('falls back to a weight of one for a locality it does not know', () => {
    expect(scoreOf('meaning', 3, 99)).toBe(6);
  });
});

describe('listMeaningConnascence', () => {
  it('reports a literal carried by two files and skips one carried by a single file', () => {
    const findings = listMeaningConnascence(
      [
        { path: SONGS_CONTROLLER.path, value: '"chordpro"', line: 4, named: false },
        { path: SONGS_SERVICE.path, value: '"chordpro"', line: 9, named: true },
        { path: SONGS_SERVICE.path, value: '"alone"', line: 11, named: false },
      ],
      INDEX,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.subject).toBe('"chordpro"');
    expect(findings[0]?.degree).toBe(2);
    expect(findings[0]?.occurrences.map((each) => each.detail)).toStrictEqual([
      'inline literal',
      'named constant',
    ]);
  });

  it('skips a literal repeated inside one file', () => {
    expect(
      listMeaningConnascence(
        [
          { path: SONGS_SERVICE.path, value: '"twice"', line: 1, named: false },
          { path: SONGS_SERVICE.path, value: '"twice"', line: 2, named: false },
        ],
        INDEX,
      ),
    ).toStrictEqual([]);
  });
});

describe('listAlgorithmConnascence', () => {
  it('reports a regular expression and a function body that two files share', () => {
    const findings = listAlgorithmConnascence(
      [
        { path: SONGS_CONTROLLER.path, source: '[a-z]+-[0-9]+', line: 3 },
        { path: BARS_SERVICE.path, source: '[a-z]+-[0-9]+', line: 7 },
        { path: BARS_SERVICE.path, source: 'only-here', line: 8 },
      ],
      [
        { path: SONGS_CONTROLLER.path, name: 'slugify', digest: 'aaaa', tokens: 50, line: 20 },
        { path: BARS_SERVICE.path, name: 'slugify', digest: 'aaaa', tokens: 50, line: 30 },
        { path: BARS_SERVICE.path, name: 'unique', digest: 'bbbb', tokens: 50, line: 40 },
      ],
      INDEX,
    );
    expect(findings.map((each) => each.subject)).toStrictEqual([
      '/[a-z]+-[0-9]+/',
      'body of slugify',
    ]);
  });

  it('names a shared body after the first declaration that carried the digest', () => {
    const findings = listAlgorithmConnascence(
      [],
      [
        { path: SONGS_CONTROLLER.path, name: 'toSlug', digest: 'cccc', tokens: 50, line: 1 },
        { path: BARS_SERVICE.path, name: 'slugOf', digest: 'cccc', tokens: 50, line: 2 },
      ],
      INDEX,
    );
    expect(findings[0]?.subject).toBe('body of toSlug');
  });
});

describe('listPositionConnascence', () => {
  it('reports a signature at or above the arity threshold and weighs its importers', () => {
    const findings = listPositionConnascence(
      [
        { path: SONGS_SERVICE.path, name: 'rankSongs', arity: 4, line: 12 },
        { path: SONGS_SERVICE.path, name: 'pair', arity: 2, line: 30 },
      ],
      new Map([[SONGS_SERVICE.path, [CATALOG_PAGE.path]]]),
      INDEX,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.degree).toBe(4);
    expect(findings[0]?.locality).toBe(3);
    expect(findings[0]?.score).toBe(96);
    expect(findings[0]?.occurrences[0]?.detail).toBe(
      '4 positional parameters, 1 importing file(s)',
    );
  });

  it('treats a signature nothing imports as local', () => {
    const findings = listPositionConnascence(
      [{ path: SONGS_SERVICE.path, name: 'rankSongs', arity: 3, line: 12 }],
      new Map(),
      INDEX,
    );
    expect(findings[0]?.locality).toBe(0);
  });
});

describe('listValueConnascence', () => {
  it('reports a file that re-enumerates every member of a union it does not import', () => {
    const findings = listValueConnascence(
      [
        {
          path: SONGS_SERVICE.path,
          name: 'ChartKind',
          members: ['"pdf"', '"image"'],
          line: 5,
        },
      ],
      new Map([
        [SONGS_SERVICE.path, new Set(['"pdf"', '"image"'])],
        [CATALOG_PAGE.path, new Set(['"pdf"', '"image"'])],
        [BARS_SERVICE.path, new Set(['"pdf"'])],
      ]),
      INDEX,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.degree).toBe(2);
    expect(findings[0]?.subject).toBe('ChartKind = "pdf" | "image"');
  });

  it('excuses a file that imports the union and reports nothing when no file echoes it', () => {
    const importer: SourceFile = {
      ...CATALOG_PAGE,
      imports: [SONGS_SERVICE.path],
    };
    const index = new Map(INDEX);
    index.set(importer.path, importer);
    expect(
      listValueConnascence(
        [{ path: SONGS_SERVICE.path, name: 'ChartKind', members: ['"pdf"', '"image"'], line: 5 }],
        new Map([
          [SONGS_SERVICE.path, new Set(['"pdf"', '"image"'])],
          [importer.path, new Set(['"pdf"', '"image"'])],
        ]),
        index,
      ),
    ).toStrictEqual([]);
  });

  it('ignores a path the index does not carry', () => {
    const findings = listValueConnascence(
      [{ path: SONGS_SERVICE.path, name: 'ChartKind', members: ['"pdf"'], line: 5 }],
      new Map([['apps/pragma/api/src/absent.ts', new Set(['"pdf"'])]]),
      INDEX,
    );
    expect(findings[0]?.degree).toBe(2);
  });
});

describe('listExecutionConnascence', () => {
  it('reports module state one export writes and another reads', () => {
    const findings = listExecutionConnascence(
      [
        {
          path: SONGS_SERVICE.path,
          name: 'cachedClient',
          writers: ['connect'],
          readers: ['query'],
          line: 3,
        },
        {
          path: BARS_SERVICE.path,
          name: 'unread',
          writers: ['connect'],
          readers: [],
          line: 4,
        },
      ],
      INDEX,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.subject).toBe(`cachedClient in ${SONGS_SERVICE.path}`);
    expect(findings[0]?.locality).toBe(0);
  });
});

describe('summaries, ranking and the baseline', () => {
  const findings = [
    ...listMeaningConnascence(
      [
        { path: SONGS_CONTROLLER.path, value: '"pdf"', line: 1, named: false },
        { path: CATALOG_PAGE.path, value: '"pdf"', line: 2, named: false },
      ],
      INDEX,
    ),
    ...listPositionConnascence(
      [{ path: SONGS_SERVICE.path, name: 'rankSongs', arity: 3, line: 1 }],
      new Map(),
      INDEX,
    ),
  ];

  it('totals every kind, including the ones with nothing to report', () => {
    const summary = summariseByKind(findings);
    expect(summary).toHaveLength(5);
    expect(summary.find((each) => each.kind === 'meaning')).toStrictEqual({
      kind: 'meaning',
      findings: 1,
      sites: 2,
      score: 24,
    });
    expect(summary.find((each) => each.kind === 'value')?.score).toBe(0);
  });

  it('totals a score per workspace and ignores an unknown path', () => {
    const orphan = [
      ...listMeaningConnascence(
        [
          { path: 'apps/pragma/api/src/absent.ts', value: '"x"', line: 1, named: false },
          { path: 'apps/pragma/api/src/other-absent.ts', value: '"x"', line: 1, named: false },
        ],
        INDEX,
      ),
    ];
    expect([...summariseByWorkspace([...findings, ...orphan], INDEX)]).toStrictEqual([
      ['apps/pragma', 32],
    ]);
  });

  it('ranks by score and then by subject', () => {
    const base: Finding = {
      kind: 'meaning',
      subject: '',
      occurrences: [],
      degree: 2,
      locality: 0,
      score: 0,
    };
    const ranked = rankFindings([
      { ...base, score: 5, subject: 'b' },
      { ...base, score: 5, subject: 'a' },
      { ...base, score: 9, subject: 'c' },
    ]);
    expect(ranked.map((each) => each.subject)).toStrictEqual(['c', 'a', 'b']);
  });

  it('counts one entry per kind and one per workspace', () => {
    expect(buildBaseline(findings, INDEX)).toStrictEqual({
      'connascence:meaning': 1,
      'connascence:position': 1,
      'connascence:algorithm': 0,
      'connascence:execution': 0,
      'connascence:value': 0,
      'connascence-score:apps/pragma': 32,
    });
  });

  it('fails only the counters that went up, treating an absent counter as zero', () => {
    expect(
      listRatchetFailures({ 'connascence:meaning': 4 }, { 'connascence:meaning': 5 }),
    ).toStrictEqual([{ key: 'connascence:meaning', was: 4, now: 5 }]);
    expect(
      listRatchetFailures({ 'connascence:meaning': 4 }, { 'connascence:meaning': 4 }),
    ).toStrictEqual([]);
    expect(listRatchetFailures({}, { 'connascence:value': 1 })).toStrictEqual([
      { key: 'connascence:value', was: 0, now: 1 },
    ]);
  });
});

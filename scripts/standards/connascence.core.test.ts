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
    expect(findings).toStrictEqual([
      {
        kind: 'meaning',
        subject: '"chordpro"',
        degree: 2,
        locality: 1,
        score: 6,
        occurrences: [
          { path: SONGS_CONTROLLER.path, line: 4, detail: 'inline literal' },
          { path: SONGS_SERVICE.path, line: 9, detail: 'named constant' },
        ],
      },
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
    expect(findings.map((each) => each.kind)).toStrictEqual(['algorithm', 'algorithm']);
    expect(findings[0]?.occurrences).toStrictEqual([
      { path: SONGS_CONTROLLER.path, line: 3, detail: 'regular expression' },
      { path: BARS_SERVICE.path, line: 7, detail: 'regular expression' },
    ]);
    expect(findings[1]?.occurrences).toStrictEqual([
      { path: SONGS_CONTROLLER.path, line: 20, detail: 'slugify' },
      { path: BARS_SERVICE.path, line: 30, detail: 'slugify' },
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
    expect(findings).toStrictEqual([
      {
        kind: 'position',
        subject: 'rankSongs/4',
        degree: 4,
        locality: 3,
        score: 96,
        occurrences: [
          {
            path: SONGS_SERVICE.path,
            line: 12,
            detail: '4 positional parameters, 1 importing file(s)',
          },
        ],
      },
    ]);
  });

  it('treats a signature nothing imports as local', () => {
    const findings = listPositionConnascence(
      [{ path: SONGS_SERVICE.path, name: 'rankSongs', arity: 3, line: 12 }],
      new Map(),
      INDEX,
    );
    expect(findings[0]?.locality).toBe(0);
    expect(findings[0]?.occurrences[0]?.detail).toBe(
      '3 positional parameters, 0 importing file(s)',
    );
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
    expect(findings).toStrictEqual([
      {
        kind: 'value',
        subject: 'ChartKind = "pdf" | "image"',
        degree: 2,
        locality: 3,
        score: 64,
        occurrences: [
          { path: SONGS_SERVICE.path, line: 5, detail: 'type ChartKind' },
          {
            path: CATALOG_PAGE.path,
            line: 0,
            detail: 're-enumerates every member of ChartKind',
          },
        ],
      },
    ]);
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
    expect(findings).toStrictEqual([
      {
        kind: 'execution',
        subject: `cachedClient in ${SONGS_SERVICE.path}`,
        degree: 2,
        locality: 0,
        score: 6,
        occurrences: [
          { path: SONGS_SERVICE.path, line: 3, detail: 'connect' },
          { path: SONGS_SERVICE.path, line: 3, detail: 'query' },
        ],
      },
    ]);
  });

  it('skips state nothing writes', () => {
    expect(
      listExecutionConnascence(
        [
          {
            path: SONGS_SERVICE.path,
            name: 'neverWritten',
            writers: [],
            readers: ['query'],
            line: 3,
          },
        ],
        INDEX,
      ),
    ).toStrictEqual([]);
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

  it('lists workspace counters in a stable order whatever order the findings arrived in', () => {
    const infra: SourceFile = {
      path: 'infra/cdk/src/constructs/static-site.ts',
      workspace: 'infra/cdk',
      container: 'src',
      context: 'constructs',
      imports: [],
    };
    const index = new Map(INDEX);
    index.set(infra.path, infra);
    const across = [
      ...listMeaningConnascence(
        [
          { path: infra.path, value: '"eu-west-3"', line: 1, named: false },
          { path: SONGS_SERVICE.path, value: '"eu-west-3"', line: 1, named: false },
        ],
        index,
      ),
      ...findings,
    ];
    expect(Object.keys(buildBaseline(across, index)).slice(-2)).toStrictEqual([
      'connascence-score:apps/pragma',
      'connascence-score:infra/cdk',
    ]);
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

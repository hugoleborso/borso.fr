import { describe, expect, it } from 'vitest';
import {
  localityOf,
  rankFindings,
  scoreOf,
  summariseByKind,
  summariseByWorkspace,
} from './scoring.core';
import { buildBaseline } from './gate.core';
import { listMeaningConnascence, listPositionConnascence } from './static-kinds.core';
import {
  BARS_SERVICE,
  CATALOG_PAGE,
  INDEX,
  SONGS_CONTROLLER,
  SONGS_SERVICE,
} from './connascence.fixtures';
import type { Finding, SourceFile } from './connascence.types';

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
    expect(summary.map((each) => each.kind)).toStrictEqual([
      'meaning',
      'position',
      'algorithm',
      'execution',
      'timing',
      'cache',
      'value',
    ]);
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
      'connascence:timing': 0,
      'connascence:cache': 0,
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
});

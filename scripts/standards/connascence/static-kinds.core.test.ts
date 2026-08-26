import { describe, expect, it } from 'vitest';
import {
  listAlgorithmConnascence,
  listMeaningConnascence,
  listPositionConnascence,
  listValueConnascence,
} from './static-kinds.core';
import {
  BARS_SERVICE,
  CATALOG_PAGE,
  INDEX,
  SONGS_CONTROLLER,
  SONGS_SERVICE,
} from './connascence.fixtures';
import type { SourceFile } from './connascence.types';

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
        {
          path: SONGS_CONTROLLER.path,
          name: 'slugify',
          digest: 'aaaa',
          tokens: 50,
          lines: 6,
          line: 20,
        },
        {
          path: BARS_SERVICE.path,
          name: 'slugify',
          digest: 'aaaa',
          tokens: 50,
          lines: 6,
          line: 30,
        },
        { path: BARS_SERVICE.path, name: 'unique', digest: 'bbbb', tokens: 50, lines: 6, line: 40 },
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
        {
          path: SONGS_CONTROLLER.path,
          name: 'toSlug',
          digest: 'cccc',
          tokens: 50,
          lines: 6,
          line: 1,
        },
        { path: BARS_SERVICE.path, name: 'slugOf', digest: 'cccc', tokens: 50, lines: 6, line: 2 },
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

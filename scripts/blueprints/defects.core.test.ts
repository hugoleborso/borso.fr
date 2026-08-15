import { describe, expect, it } from 'vitest';
import {
  countDefectsByBlueprint,
  readBlueprintAnnotations,
  rankBlueprintRisk,
  readBlueprintIds,
  readDantotsuReference,
  renderDefectReport,
  selectUnknownBlueprintReferences,
  type BlueprintAdoption,
  type DantotsuReference,
} from './defects.core';

function buildFrontMatter(body: string): string {
  return `---\ndate: 2026-08-15\nseverity: high\n${body}\n---\n\n# A title\n\nprose\n`;
}

describe('readBlueprintIds', () => {
  it('reads the identifiers a dantotsu names', () => {
    const markdown = buildFrontMatter('blueprints: [optimistic-mutation, query-module]');
    expect(readBlueprintIds(markdown)).toEqual(['optimistic-mutation', 'query-module']);
  });

  it('reads an identifier written in quotes', () => {
    expect(readBlueprintIds(buildFrontMatter("blueprints: ['query-module']"))).toEqual([
      'query-module',
    ]);
  });

  it('reads an empty list as naming nothing', () => {
    expect(readBlueprintIds(buildFrontMatter('blueprints: []'))).toEqual([]);
  });

  it('reads a dantotsu with no blueprints field as naming nothing', () => {
    expect(readBlueprintIds(buildFrontMatter('tags: [react]'))).toEqual([]);
  });

  it('reads a document with no front matter as naming nothing', () => {
    expect(readBlueprintIds('# Just a title\n\nprose\n')).toEqual([]);
  });

  it('ignores a blueprints line that is not in the front matter', () => {
    const markdown = `${buildFrontMatter('tags: [react]')}\nblueprints: [sneaky]\n`;
    expect(readBlueprintIds(markdown)).toEqual([]);
  });
});

describe('readDantotsuReference', () => {
  it('reads the title and the identifiers', () => {
    const reference = readDantotsuReference(
      'a-slug',
      buildFrontMatter('blueprints: [query-module]'),
    );
    expect(reference).toEqual({
      slug: 'a-slug',
      title: 'A title',
      blueprintIds: ['query-module'],
    });
  });

  it('falls back to the slug when the document has no title', () => {
    expect(readDantotsuReference('a-slug', 'no title here').title).toBe('a-slug');
  });
});

describe('selectUnknownBlueprintReferences', () => {
  const known = new Set(['query-module']);

  it('accepts a reference to a blueprint that exists', () => {
    const references: DantotsuReference[] = [
      { slug: 'a', title: 'A', blueprintIds: ['query-module'] },
    ];
    expect(selectUnknownBlueprintReferences(references, known)).toEqual([]);
  });

  it('reports a reference to a blueprint that has been renamed away', () => {
    const references: DantotsuReference[] = [{ slug: 'a', title: 'A', blueprintIds: ['gone'] }];
    expect(selectUnknownBlueprintReferences(references, known)).toEqual([
      'a names blueprint `gone`, which does not exist',
    ]);
  });
});

describe('countDefectsByBlueprint', () => {
  it('counts each blueprint once per dantotsu', () => {
    const references: DantotsuReference[] = [
      { slug: 'a', title: 'A', blueprintIds: ['query-module', 'query-module'] },
      { slug: 'b', title: 'B', blueprintIds: ['query-module'] },
      { slug: 'c', title: 'C', blueprintIds: ['atom-plain'] },
    ];
    expect(countDefectsByBlueprint(references)).toEqual([
      { blueprintId: 'query-module', dantotsuSlugs: ['a', 'b'] },
      { blueprintId: 'atom-plain', dantotsuSlugs: ['c'] },
    ]);
  });

  it('orders equal counts by identifier, so the page is stable', () => {
    const references: DantotsuReference[] = [
      { slug: 'a', title: 'A', blueprintIds: ['zebra', 'alpha'] },
    ];
    expect(countDefectsByBlueprint(references).map((entry) => entry.blueprintId)).toEqual([
      'alpha',
      'zebra',
    ]);
  });

  it('counts nothing when no dantotsu names a blueprint', () => {
    expect(countDefectsByBlueprint([{ slug: 'a', title: 'A', blueprintIds: [] }])).toEqual([]);
  });
});

describe('rankBlueprintRisk', () => {
  const adoptions: BlueprintAdoption[] = [
    { blueprintId: 'widely-copied', name: 'Widely Copied', followers: 40 },
    { blueprintId: 'barely-copied', name: 'Barely Copied', followers: 1 },
  ];

  /** One defect in a pattern forty files copy beats three in one nobody uses. */
  it('puts the most exposed pattern first, not the most defective', () => {
    const ranked = rankBlueprintRisk(adoptions, [
      { blueprintId: 'barely-copied', dantotsuSlugs: ['a', 'b', 'c'] },
      { blueprintId: 'widely-copied', dantotsuSlugs: ['d'] },
    ]);
    expect(ranked.map((risk) => risk.blueprintId)).toEqual(['widely-copied', 'barely-copied']);
  });

  it('reports a blueprint with a defect and no recorded followers', () => {
    const ranked = rankBlueprintRisk([], [{ blueprintId: 'orphan', dantotsuSlugs: ['a'] }]);
    expect(ranked).toEqual([
      { blueprintId: 'orphan', name: 'orphan', followers: 0, defects: 1, dantotsuSlugs: ['a'] },
    ]);
  });

  it('orders equal exposure by identifier, so the page is stable', () => {
    const ranked = rankBlueprintRisk(
      [
        { blueprintId: 'zebra', name: 'Zebra', followers: 2 },
        { blueprintId: 'alpha', name: 'Alpha', followers: 2 },
      ],
      [
        { blueprintId: 'zebra', dantotsuSlugs: ['a'] },
        { blueprintId: 'alpha', dantotsuSlugs: ['b'] },
      ],
    );
    expect(ranked.map((risk) => risk.blueprintId)).toEqual(['alpha', 'zebra']);
  });
});

describe('renderDefectReport', () => {
  it('says plainly when nothing implicates a pattern', () => {
    expect(renderDefectReport([], 78)).toContain('No dantotsu currently implicates a blueprint.');
  });

  it('counts the dantotsus it read', () => {
    expect(renderDefectReport([], 78)).toContain('Read from 78 dantotsu(s).');
  });

  it('links each defect back to the dantotsu that recorded it', () => {
    const rendered = renderDefectReport(
      [
        {
          blueprintId: 'query-module',
          name: 'Query Module',
          followers: 6,
          defects: 1,
          dantotsuSlugs: ['a-stale-read'],
        },
      ],
      78,
    );
    expect(rendered).toContain('| `query-module` — Query Module | 6 | 1 |');
    expect(rendered).toContain('[a-stale-read](../dantotsus/a-stale-read.md)');
  });
});

describe('readBlueprintAnnotations', () => {
  it('reads a single annotation with its name and usage', () => {
    const source = [
      '/**',
      ' * @Blueprint controller-dispatch',
      ' * @BlueprintName Controller Dispatch',
      ' * @BlueprintUsage Use for a Hono route that validates and delegates.',
      ' */',
      'export const route = 1;',
    ].join('\n');
    expect(readBlueprintAnnotations(source)).toEqual([
      {
        id: 'controller-dispatch',
        name: 'Controller Dispatch',
        usage: 'Use for a Hono route that validates and delegates.',
      },
    ]);
  });

  /** `songs.queries.ts` declares two, and reading only the first lost one. */
  it('reads both annotations when one file declares two', () => {
    const source = [
      '/** @Blueprint query-module',
      ' * @BlueprintName Query Module',
      ' */',
      'export const list = 1;',
      '/** @Blueprint query-optimistic-mutation',
      ' * @BlueprintName Optimistic Mutation',
      ' */',
      'export const write = 2;',
    ].join('\n');
    expect(readBlueprintAnnotations(source).map((entry) => entry.id)).toEqual([
      'query-module',
      'query-optimistic-mutation',
    ]);
  });

  it('does not let the second annotation borrow the first one name', () => {
    const source = [
      '/** @Blueprint first',
      ' * @BlueprintName First Name',
      ' */',
      '/** @Blueprint second */',
    ].join('\n');
    const read = readBlueprintAnnotations(source);
    expect(read[1]).toEqual({ id: 'second', name: 'second', usage: '' });
  });

  it('falls back to the identifier when no name is given', () => {
    expect(readBlueprintAnnotations('/** @Blueprint lonely */')).toEqual([
      { id: 'lonely', name: 'lonely', usage: '' },
    ]);
  });

  it('reads a file with no annotation as declaring nothing', () => {
    expect(readBlueprintAnnotations('export const nothing = 1;')).toEqual([]);
  });

  it('ignores a marker with no identifier after it', () => {
    expect(readBlueprintAnnotations('/** @Blueprint \n */')).toEqual([]);
  });
});

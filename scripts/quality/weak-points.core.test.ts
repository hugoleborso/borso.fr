import { describe, expect, it } from 'vitest';
import { readDantotsuDocument } from './dantotsu-record.core';
import {
  countWeeklyOccurrences,
  groupRecurrences,
  placeOnProductMap,
  readDefectDot,
  readEngagedWeakPoints,
  selectStation,
  selectUnresolvedReferences,
  startOfWeek,
  type DefectDot,
} from './weak-points.core';

function buildDot(slug: string, overrides: Partial<DefectDot> = {}): DefectDot {
  return {
    slug,
    title: slug,
    date: '2026-10-07',
    zone: 'CLAUDE.md',
    weakPoint: null,
    recurs: [],
    ...overrides,
  };
}

describe('readDefectDot', () => {
  it('reads the date, the zone, the weak point and the recurrences', () => {
    const document = readDantotsuDocument(
      'a-slug',
      "---\ndate: 2026-10-07\nzone: 'CLAUDE.md'\nweak-point: 'gate-measures-nothing'\nrecurs: [earlier]\n---\n# A title\n",
    );
    expect(readDefectDot(document)).toEqual({
      slug: 'a-slug',
      title: 'A title',
      date: '2026-10-07',
      zone: 'CLAUDE.md',
      weakPoint: 'gate-measures-nothing',
      recurs: ['earlier'],
    });
  });

  it('reads no weak point and no recurrence as empty', () => {
    const dot = readDefectDot(
      readDantotsuDocument('s', '---\ndate: 2026-10-07\nzone: CLAUDE.md\n---\n'),
    );
    expect(dot?.weakPoint).toBeNull();
    expect(dot?.recurs).toEqual([]);
  });

  it('places nothing for an entry with no date or no zone', () => {
    expect(readDefectDot(readDantotsuDocument('s', '---\nzone: CLAUDE.md\n---\n'))).toBeNull();
    expect(readDefectDot(readDantotsuDocument('s', '---\ndate: 2026-10-07\n---\n'))).toBeNull();
  });
});

describe('readEngagedWeakPoints', () => {
  const markdown = `# Engaged

| Id | Weak point | Map | Engaged on | Countermeasure |
| --- | --- | --- | --- | --- |
| \`gate-measures-nothing\` | A gate measures nothing | factory | 2026-10-10 | Plant a defect |
| \`too-short\` | only | two |
not a row

## Closed

| \`old-one\` | An old weak point | product | 2026-01-01 | Done |
`;

  it('reads each row whose first cell is an id, and marks the rows under Closed', () => {
    expect(readEngagedWeakPoints(markdown)).toEqual([
      {
        id: 'gate-measures-nothing',
        title: 'A gate measures nothing',
        map: 'factory',
        engagedOn: '2026-10-10',
        countermeasure: 'Plant a defect',
        isClosed: false,
      },
      {
        id: 'old-one',
        title: 'An old weak point',
        map: 'product',
        engagedOn: '2026-01-01',
        countermeasure: 'Done',
        isClosed: true,
      },
    ]);
  });
});

describe('selectStation', () => {
  it.each([
    ['plugins/borso-harness/skills/specification', 'spec'],
    ['plugins/borso-harness/skills/technical-conception', 'plan'],
    ['docs/adr', 'plan'],
    ['plugins/borso-harness/skills/implementation', 'implementation'],
    ['plugins/borso-harness/agents/technical-validator.md', 'validation'],
    ['scripts/argent.sh', 'validation'],
    ['.github/workflows/deploy.yml', 'deploy'],
    ['scripts/preflight-cloudfront-aliases.sh', 'deploy'],
    ['.github/workflows/ci.yml', 'ci'],
    ['.husky/pre-push', 'gates'],
    ['eslint-rules/no-comments.js', 'gates'],
    ['stryker.shared.js', 'gates'],
    ['plugins/borso-harness/hooks/pretool-no-broad-kill.sh', 'hooks'],
    ['plugins/borso-harness/skills/open-pr', 'skills'],
    ['CLAUDE.md', 'harness'],
  ])('puts %s on the %s station', (zone, station) => {
    expect(selectStation(zone)).toBe(station);
  });
});

function inferLayer(path: string): string {
  return path.endsWith('.core.ts') ? 'core' : 'unknown';
}

describe('placeOnProductMap', () => {
  it('places a file by application and inferred layer', () => {
    expect(placeOnProductMap('apps/pragma/api/src/songs/a.core.ts', inferLayer)).toEqual({
      row: 'apps/pragma',
      column: 'core',
    });
  });

  it('places a test path in the test column, before reading its layer', () => {
    expect(placeOnProductMap('infra/cdk/test/unit/a.core.ts', inferLayer)).toEqual({
      row: 'infra/cdk',
      column: 'test',
    });
    expect(placeOnProductMap('apps/pragma/site/src/a.test.ts', inferLayer)).toEqual({
      row: 'apps/pragma',
      column: 'test',
    });
  });

  it('falls back to the project folder, then to the workspace', () => {
    expect(placeOnProductMap('apps/pragma/site/src', inferLayer)).toEqual({
      row: 'apps/pragma',
      column: 'site',
    });
    expect(placeOnProductMap('apps/pragma/package.json', inferLayer)).toEqual({
      row: 'apps/pragma',
      column: 'workspace',
    });
    expect(placeOnProductMap('apps/pragma', inferLayer)).toEqual({
      row: 'apps/pragma',
      column: 'workspace',
    });
  });

  it('answers null for a path outside apps and infra', () => {
    expect(placeOnProductMap('scripts/check-a.sh', inferLayer)).toBeNull();
    expect(placeOnProductMap('docs/apps/x', inferLayer)).toBeNull();
  });
});

describe('startOfWeek', () => {
  it.each([
    ['2026-10-05', '2026-10-05'],
    ['2026-10-07', '2026-10-05'],
    ['2026-10-11', '2026-10-05'],
    ['2026-10-12', '2026-10-12'],
    ['1970-01-01', '1969-12-29'],
    ['1969-12-28', '1969-12-22'],
  ])('starts the week of %s on Monday %s', (date, monday) => {
    expect(startOfWeek(date)).toBe(monday);
  });
});

describe('countWeeklyOccurrences', () => {
  it('counts each week from the first occurrence to the week of now, zeros included', () => {
    const dots = [
      buildDot('a', { date: '2026-09-23', weakPoint: 'gate' }),
      buildDot('b', { date: '2026-09-21', weakPoint: 'gate' }),
      buildDot('c', { date: '2026-10-06', weakPoint: 'gate' }),
      buildDot('d', { date: '2026-10-06', weakPoint: 'other' }),
    ];
    expect(countWeeklyOccurrences(dots, 'gate', '2026-10-13')).toEqual([
      { weekStart: '2026-09-21', count: 2 },
      { weekStart: '2026-09-28', count: 0 },
      { weekStart: '2026-10-05', count: 1 },
      { weekStart: '2026-10-12', count: 0 },
    ]);
  });

  it('counts nothing for a weak point no entry names', () => {
    expect(countWeeklyOccurrences([buildDot('a')], 'gate', '2026-10-13')).toEqual([]);
  });
});

describe('groupRecurrences', () => {
  it('joins entries linked through recurs into one group, oldest first', () => {
    const dots = [
      buildDot('third', { date: '2026-10-03', recurs: ['second'] }),
      buildDot('first', { date: '2026-10-01' }),
      buildDot('second', { date: '2026-10-02', recurs: ['first'] }),
      buildDot('pair-b', { date: '2026-09-02', recurs: ['pair-a'] }),
      buildDot('pair-a', { date: '2026-09-01' }),
      buildDot('alone', { date: '2026-09-01' }),
      buildDot('dangling', { date: '2026-09-05', recurs: ['ghost'] }),
    ];
    expect(groupRecurrences(dots)).toEqual([
      { slugs: ['first', 'second', 'third'], firstDate: '2026-10-01', lastDate: '2026-10-03' },
      { slugs: ['pair-a', 'pair-b'], firstDate: '2026-09-01', lastDate: '2026-09-02' },
    ]);
  });

  it('orders groups of the same size by their first date, and merges a link made twice', () => {
    const dots = [
      buildDot('late-b', { date: '2026-10-02', recurs: ['late-a'] }),
      buildDot('late-a', { date: '2026-10-01', recurs: ['late-b'] }),
      buildDot('early-b', { date: '2026-09-02', recurs: ['early-a'] }),
      buildDot('early-a', { date: '2026-09-01' }),
    ];
    expect(groupRecurrences(dots).map((group) => group.slugs)).toEqual([
      ['early-a', 'early-b'],
      ['late-a', 'late-b'],
    ]);
  });

  it('answers no group when no entry recurs', () => {
    expect(groupRecurrences([buildDot('a')])).toEqual([]);
  });
});

describe('selectUnresolvedReferences', () => {
  it('names a zone that is no path and a weak point that is not listed', () => {
    const dots = [
      buildDot('ok', { zone: 'CLAUDE.md', weakPoint: 'gate' }),
      buildDot('lost', { zone: 'gone/path' }),
      buildDot('unlisted', { weakPoint: 'nothing' }),
    ];
    const engaged = readEngagedWeakPoints('| `gate` | A | factory | 2026-10-10 | B |\n');
    expect(selectUnresolvedReferences(dots, new Set(['CLAUDE.md']), engaged)).toEqual([
      'lost: zone gone/path names no path in the repository',
      'unlisted: weak-point nothing is not listed in docs/quality/weak-points.md',
    ]);
  });
});

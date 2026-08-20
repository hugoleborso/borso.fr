import { describe, expect, it } from 'vitest';
import {
  rankHotspots,
  rankLayerGaps,
  readWeaknesses,
  renderHotspotReport,
  type FileHistory,
} from './hotspots.core';

function buildHistory(overrides: Partial<FileHistory> = {}): FileHistory {
  return {
    path: 'apps/pragma/api/src/songs/songs.service.ts',
    commits: 4,
    layer: 'service',
    followsAPattern: true,
    ...overrides,
  };
}

function buildWeakFiles(count: number): readonly FileHistory[] {
  return Array.from({ length: count }, (_, index) =>
    buildHistory({
      path: `file-${String(index)}.ts`,
      commits: index + 1,
      followsAPattern: false,
    }),
  );
}

const HEAD_REVISION = 'abc1234';

function readRows(rendered: string, opensWith: string): readonly string[] {
  return rendered.split('\n').filter((line) => line.startsWith(opensWith));
}

describe('readWeaknesses', () => {
  it('finds nothing weak about a file that follows a pattern and sits in a named layer', () => {
    expect(readWeaknesses(buildHistory())).toEqual([]);
  });

  it('names a file that follows no pattern', () => {
    expect(readWeaknesses(buildHistory({ followsAPattern: false }))).toEqual([
      'follows no recorded pattern',
    ]);
  });

  it('names a file whose path does not say what it is', () => {
    expect(readWeaknesses(buildHistory({ layer: 'unknown' }))).toEqual([
      'the path does not say what the file is',
    ]);
  });

  it('names both when both hold', () => {
    expect(readWeaknesses(buildHistory({ layer: 'unknown', followsAPattern: false }))).toEqual([
      'follows no recorded pattern',
      'the path does not say what the file is',
    ]);
  });
});

describe('rankHotspots', () => {
  it('leaves out a file that changes constantly and follows a pattern', () => {
    expect(rankHotspots([buildHistory({ commits: 99 })])).toEqual([]);
  });

  it('leaves out a weak file nobody touches', () => {
    expect(rankHotspots([buildHistory({ commits: 0, followsAPattern: false })])).toEqual([]);
  });

  it('keeps a file scoring one, which is the lowest score that appears', () => {
    expect(rankHotspots([buildHistory({ commits: 1, followsAPattern: false })])).toEqual([
      {
        path: 'apps/pragma/api/src/songs/songs.service.ts',
        commits: 1,
        layer: 'service',
        weaknesses: ['follows no recorded pattern'],
        risk: 1,
      },
    ]);
  });

  it('scores risk as commits times the number of weaknesses', () => {
    const [hotspot] = rankHotspots([
      buildHistory({ commits: 7, layer: 'unknown', followsAPattern: false }),
    ]);
    expect(hotspot?.risk).toBe(14);
  });

  it('puts the riskiest first', () => {
    const ranked = rankHotspots([
      buildHistory({ path: 'a.ts', commits: 2, followsAPattern: false }),
      buildHistory({ path: 'b.ts', commits: 9, followsAPattern: false }),
    ]);
    expect(ranked.map((hotspot) => hotspot.path)).toEqual(['b.ts', 'a.ts']);
  });

  it('orders equal risk by path, so the page is stable', () => {
    const ranked = rankHotspots([
      buildHistory({ path: 'zebra.ts', commits: 3, followsAPattern: false }),
      buildHistory({ path: 'alpha.ts', commits: 3, followsAPattern: false }),
    ]);
    expect(ranked.map((hotspot) => hotspot.path)).toEqual(['alpha.ts', 'zebra.ts']);
  });
});

describe('rankLayerGaps', () => {
  it('counts only the files that follow nothing', () => {
    const gaps = rankLayerGaps([
      buildHistory({ layer: 'config', commits: 5, followsAPattern: false }),
      buildHistory({ layer: 'config', commits: 3, followsAPattern: false }),
      buildHistory({ layer: 'config', commits: 40, followsAPattern: true }),
    ]);
    expect(gaps).toEqual([{ layer: 'config', unpatternedFiles: 2, churn: 8 }]);
  });

  it('orders by the churn on unpatterned files, not by how many there are', () => {
    const gaps = rankLayerGaps([
      buildHistory({ layer: 'alpha', commits: 1, followsAPattern: false }),
      buildHistory({ layer: 'alpha', commits: 1, followsAPattern: false }),
      buildHistory({ layer: 'alpha', commits: 1, followsAPattern: false }),
      buildHistory({ layer: 'zebra', commits: 20, followsAPattern: false }),
    ]);
    expect(gaps.map((gap) => gap.layer)).toEqual(['zebra', 'alpha']);
  });

  it('orders equal churn by layer name, so the page is stable', () => {
    const gaps = rankLayerGaps([
      buildHistory({ layer: 'zebra', commits: 2, followsAPattern: false }),
      buildHistory({ layer: 'alpha', commits: 2, followsAPattern: false }),
    ]);
    expect(gaps.map((gap) => gap.layer)).toEqual(['alpha', 'zebra']);
  });

  it('finds no gap when every file follows a pattern', () => {
    expect(rankLayerGaps([buildHistory()])).toEqual([]);
  });
});

describe('renderHotspotReport', () => {
  it('renders the whole page for a file that scores', () => {
    const rendered = renderHotspotReport(
      [buildHistory({ path: 'a.ts', commits: 3, layer: 'unknown', followsAPattern: false })],
      400,
      HEAD_REVISION,
    );
    expect(rendered.split('\n')).toEqual([
      '<!-- Generated by scripts/standards/hotspots.ts. Do not edit by hand. -->',
      '',
      '# Hotspots',
      '',
      'Where the next defect is most likely to come from.',
      '',
      'Every other gate here reads the code as it stands. None of them can see',
      'that one file was edited in a fifth of the recent commits and follows no',
      'recorded pattern, while another has not been touched since it was written.',
      'Those two carry very different risk and no static check tells them apart.',
      '',
      'Risk is how often a file changes, times how many things are weak about it.',
      'A file that changes constantly and follows a blueprint scores zero and does',
      'not appear, because the pattern is doing its job. So does a file that',
      'follows nothing and nobody touches.',
      '',
      'This is a report, not a gate, and there is no freshness check on it either.',
      'The input is the history, so the page changes on every commit whether or',
      'not any source moved; a staleness gate would fail every commit for a reason',
      'nobody could act on. It records the commit it was read at instead.',
      '',
      'Read at `abc1234`, from the last 400 commit(s) over 1 tracked source file(s).',
      '',
      '## The files',
      '',
      '| File | Commits | Layer | Weak because | Risk |',
      '| --- | --- | --- | --- | --- |',
      '| `a.ts` | 3 | unknown | follows no recorded pattern; the path does not say what the file is | 6 |',
      '',
      '## The next blueprint worth writing',
      '',
      'Layers holding files that follow no pattern, ordered by how much work is',
      'happening in them. A pattern pays where people are already writing without',
      'one.',
      '',
      '| Layer | Files following nothing | Their commits |',
      '| --- | --- | --- |',
      '| unknown | 1 | 3 |',
      '',
    ]);
  });

  it('renders the whole page, and neither table, when nothing scores', () => {
    const rendered = renderHotspotReport([buildHistory()], 400, HEAD_REVISION);
    expect(rendered.split('\n')).toEqual([
      '<!-- Generated by scripts/standards/hotspots.ts. Do not edit by hand. -->',
      '',
      '# Hotspots',
      '',
      'Where the next defect is most likely to come from.',
      '',
      'Every other gate here reads the code as it stands. None of them can see',
      'that one file was edited in a fifth of the recent commits and follows no',
      'recorded pattern, while another has not been touched since it was written.',
      'Those two carry very different risk and no static check tells them apart.',
      '',
      'Risk is how often a file changes, times how many things are weak about it.',
      'A file that changes constantly and follows a blueprint scores zero and does',
      'not appear, because the pattern is doing its job. So does a file that',
      'follows nothing and nobody touches.',
      '',
      'This is a report, not a gate, and there is no freshness check on it either.',
      'The input is the history, so the page changes on every commit whether or',
      'not any source moved; a staleness gate would fail every commit for a reason',
      'nobody could act on. It records the commit it was read at instead.',
      '',
      'Read at `abc1234`, from the last 400 commit(s) over 1 tracked source file(s).',
      '',
      'Every file that changes often follows a recorded pattern.',
      '',
    ]);
  });

  it('names the commit the history was read at', () => {
    const rendered = renderHotspotReport([buildHistory()], 12, 'deadbee');
    expect(rendered).toContain('Read at `deadbee`, from the last 12 commit(s) over 1 tracked');
  });

  it('shows twenty five files and says how many more scored', () => {
    const rendered = renderHotspotReport(buildWeakFiles(30), 400, HEAD_REVISION);
    const rows = readRows(rendered, '| `file-');
    expect(rows).toHaveLength(25);
    expect(rows[0]).toBe('| `file-29.ts` | 30 | service | follows no recorded pattern | 30 |');

    const lastRow = '| `file-5.ts` | 6 | service | follows no recorded pattern | 6 |';
    expect(rows[24]).toBe(lastRow);
    const lines = rendered.split('\n');
    expect(lines.slice(lines.indexOf(lastRow) + 1, lines.indexOf(lastRow) + 4)).toEqual([
      '',
      '5 more file(s) score above zero and are not shown.',
      '',
    ]);
  });

  it('says nothing about files left out when exactly twenty five score', () => {
    const rendered = renderHotspotReport(buildWeakFiles(25), 400, HEAD_REVISION);
    expect(readRows(rendered, '| `file-')).toHaveLength(25);
    expect(rendered).not.toContain('more file(s) score above zero');
  });

  it('shows ten layers in the blueprint table', () => {
    const histories = Array.from({ length: 12 }, (_, index) =>
      buildHistory({
        path: `file-${String(index)}.ts`,
        layer: `layer-${String(index).padStart(2, '0')}`,
        commits: 12 - index,
        followsAPattern: false,
      }),
    );
    const rendered = renderHotspotReport(histories, 400, HEAD_REVISION);
    const rows = readRows(rendered, '| layer-');
    expect(rows).toHaveLength(10);
    expect(rows[0]).toBe('| layer-00 | 1 | 12 |');
    expect(rows[9]).toBe('| layer-09 | 1 | 3 |');
  });

  it('leaves out the blueprint section when every file follows one', () => {
    const rendered = renderHotspotReport([buildHistory()], 400, HEAD_REVISION);
    expect(rendered).not.toContain('## The next blueprint worth writing');
  });
});

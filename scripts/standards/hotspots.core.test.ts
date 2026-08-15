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
    expect(readWeaknesses(buildHistory({ layer: 'unknown', followsAPattern: false }))).toHaveLength(
      2,
    );
  });
});

describe('rankHotspots', () => {
  /** The pattern is doing its job; churn alone is not risk. */
  it('leaves out a file that changes constantly and follows a pattern', () => {
    expect(rankHotspots([buildHistory({ commits: 99 })])).toEqual([]);
  });

  /** Nobody is there to get it wrong. */
  it('leaves out a weak file nobody touches', () => {
    expect(rankHotspots([buildHistory({ commits: 0, followsAPattern: false })])).toEqual([]);
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

  /** A pattern pays where work is happening, not where files are merely many. */
  it('orders by the churn on unpatterned files, not by how many there are', () => {
    const gaps = rankLayerGaps([
      buildHistory({ layer: 'quiet', commits: 1, followsAPattern: false }),
      buildHistory({ layer: 'quiet', commits: 1, followsAPattern: false }),
      buildHistory({ layer: 'quiet', commits: 1, followsAPattern: false }),
      buildHistory({ layer: 'busy', commits: 20, followsAPattern: false }),
    ]);
    expect(gaps.map((gap) => gap.layer)).toEqual(['busy', 'quiet']);
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
  it('says so plainly when nothing scores', () => {
    const rendered = renderHotspotReport([buildHistory({ commits: 50 })], 400);
    expect(rendered).toContain('Every file that changes often follows a recorded pattern.');
  });

  it('reports what it read', () => {
    expect(renderHotspotReport([buildHistory()], 400)).toContain(
      'Read from the last 400 commit(s) over 1 tracked source file(s).',
    );
  });

  it('puts a hotspot in the table with its reasons', () => {
    const rendered = renderHotspotReport(
      [buildHistory({ path: 'a.ts', commits: 3, layer: 'unknown', followsAPattern: false })],
      400,
    );
    expect(rendered).toContain('| `a.ts` | 3 | unknown |');
    expect(rendered).toContain(
      'follows no recorded pattern; the path does not say what the file is',
    );
  });

  it('says how many it left out of the table', () => {
    const histories = Array.from({ length: 30 }, (_, index) =>
      buildHistory({
        path: `file-${String(index)}.ts`,
        commits: index + 1,
        followsAPattern: false,
      }),
    );
    expect(renderHotspotReport(histories, 400)).toContain(
      '5 more file(s) score above zero and are not shown.',
    );
  });

  it('lists the layer worth a blueprint next', () => {
    const rendered = renderHotspotReport(
      [buildHistory({ layer: 'config', commits: 42, followsAPattern: false })],
      400,
    );
    expect(rendered).toContain('## The next blueprint worth writing');
    expect(rendered).toContain('| config | 1 | 42 |');
  });

  it('leaves out the blueprint section when every file follows one', () => {
    const rendered = renderHotspotReport([buildHistory()], 400);
    expect(rendered).not.toContain('## The next blueprint worth writing');
  });
});

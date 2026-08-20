import { describe, expect, it } from 'vitest';
import {
  buildReachability,
  isConnected,
  partitionByConnection,
  rankCoupledPairs,
  renderCouplingReport,
  type Commit,
  type CoupledPair,
  type CouplingOptions,
} from './coupling.core';

const OPTIONS: CouplingOptions = { maximumCommitBreadth: 10, minimumSharedCommits: 2 };
const HEAD_REVISION = 'abc1234';

function repeat(commit: Commit, times: number): readonly Commit[] {
  return Array.from({ length: times }, () => commit);
}

function buildManyPairs(count: number): readonly CoupledPair[] {
  return Array.from({ length: count }, (_, index) =>
    buildPair({ left: `file-${String(index)}.ts` }),
  );
}

function buildPair(overrides: Partial<CoupledPair> = {}): CoupledPair {
  return {
    left: 'a.ts',
    right: 'b.ts',
    shared: 3,
    leftRevisions: 4,
    rightRevisions: 4,
    degree: 0.6,
    ...overrides,
  };
}

describe('rankCoupledPairs', () => {
  it('finds nothing in a history where every commit touches one file', () => {
    expect(rankCoupledPairs(repeat(['a.ts'], 5), OPTIONS)).toEqual([]);
  });

  it('leaves out a pair that changed together once', () => {
    expect(rankCoupledPairs([['a.ts', 'b.ts']], OPTIONS)).toEqual([]);
  });

  it('scores a pair that only ever changes together at one', () => {
    expect(rankCoupledPairs(repeat(['a.ts', 'b.ts'], 3), OPTIONS)).toEqual([
      { left: 'a.ts', right: 'b.ts', shared: 3, leftRevisions: 3, rightRevisions: 3, degree: 1 },
    ]);
  });

  it('divides by the commits touching either file, not by the shared ones', () => {
    const commits = [...repeat(['a.ts', 'b.ts'], 2), ['a.ts'], ['a.ts'], ['b.ts'], ['b.ts']];
    const [pair] = rankCoupledPairs(commits, OPTIONS);
    expect(pair?.degree).toBe(2 / 6);
  });

  it('counts each side of a pair separately', () => {
    const commits = [...repeat(['a.ts', 'b.ts'], 2), ['a.ts'], ['a.ts']];
    const [pair] = rankCoupledPairs(commits, OPTIONS);
    expect(pair).toMatchObject({ leftRevisions: 4, rightRevisions: 2 });
  });

  it('names the pair in path order however the commit listed them', () => {
    const [pair] = rankCoupledPairs(repeat(['z.ts', 'a.ts'], 2), OPTIONS);
    expect(pair).toMatchObject({ left: 'a.ts', right: 'z.ts' });
  });

  it('leaves out a file paired with its own test', () => {
    expect(rankCoupledPairs(repeat(['a.core.ts', 'a.core.test.ts'], 5), OPTIONS)).toEqual([]);
  });

  it('leaves out a component paired with its own test', () => {
    expect(rankCoupledPairs(repeat(['Card.tsx', 'Card.test.tsx'], 5), OPTIONS)).toEqual([]);
  });

  it('keeps a file paired with another file’s test', () => {
    expect(rankCoupledPairs(repeat(['a.core.ts', 'b.core.test.ts'], 3), OPTIONS)).toHaveLength(1);
  });

  it('counts a file that belongs to more than one pair', () => {
    const ranked = rankCoupledPairs(repeat(['a.ts', 'b.ts', 'c.ts'], 3), OPTIONS);
    expect(ranked).toHaveLength(3);
    expect(ranked.map((pair) => [pair.leftRevisions, pair.rightRevisions])).toEqual([
      [3, 3],
      [3, 3],
      [3, 3],
    ]);
  });

  it('ignores a commit broader than the limit', () => {
    const sweep = ['a.ts', 'b.ts', 'c.ts'];
    const narrow: CouplingOptions = { maximumCommitBreadth: 2, minimumSharedCommits: 2 };
    expect(rankCoupledPairs(repeat(sweep, 9), narrow)).toEqual([]);
  });

  it('counts a broad commit as a revision even though it couples nothing', () => {
    const commits = [...repeat(['a.ts', 'b.ts'], 3), ['a.ts', 'b.ts', 'c.ts', 'd.ts']];
    const narrow: CouplingOptions = { maximumCommitBreadth: 2, minimumSharedCommits: 2 };
    const [pair] = rankCoupledPairs(commits, narrow);
    expect(pair).toMatchObject({ shared: 3, leftRevisions: 4, rightRevisions: 4 });
  });

  it('puts the strongest degree first', () => {
    const commits = [
      ...repeat(['a.ts', 'b.ts'], 2),
      ...repeat(['c.ts', 'd.ts'], 2),
      ['c.ts'],
      ['d.ts'],
    ];
    const ranked = rankCoupledPairs(commits, OPTIONS);
    expect(ranked.map((pair) => pair.left)).toEqual(['a.ts', 'c.ts']);
  });

  it('breaks an equal degree by how many commits the pair shares', () => {
    const commits = [...repeat(['a.ts', 'b.ts'], 2), ...repeat(['y.ts', 'z.ts'], 5)];
    const ranked = rankCoupledPairs(commits, OPTIONS);
    expect(ranked.map((pair) => pair.left)).toEqual(['y.ts', 'a.ts']);
  });

  it('breaks an equal degree and count by the first path, so the page is stable', () => {
    const commits = [...repeat(['z.ts', 'zz.ts'], 2), ...repeat(['a.ts', 'aa.ts'], 2)];
    const ranked = rankCoupledPairs(commits, OPTIONS);
    expect(ranked.map((pair) => pair.left)).toEqual(['a.ts', 'z.ts']);
  });

  it('breaks a shared first path by the second one', () => {
    const commits = [...repeat(['a.ts', 'z.ts'], 2), ...repeat(['a.ts', 'b.ts'], 2)];
    const ranked = rankCoupledPairs(commits, OPTIONS);
    expect(ranked.map((pair) => pair.right)).toEqual(['b.ts', 'z.ts']);
  });
});

describe('buildReachability', () => {
  const files = [
    { path: 'a.ts', imports: ['b.ts'] },
    { path: 'b.ts', imports: ['c.ts'] },
    { path: 'c.ts', imports: [] },
    { path: 'lonely.ts', imports: [] },
  ];

  it('reaches through two hops', () => {
    expect([...(buildReachability(files).get('a.ts') ?? [])].sort()).toEqual(['b.ts', 'c.ts']);
  });

  it('reaches nothing from a file that imports nothing', () => {
    expect(buildReachability(files).get('lonely.ts')?.size).toBe(0);
  });

  it('terminates on a cycle', () => {
    const cyclic = [
      { path: 'a.ts', imports: ['b.ts'] },
      { path: 'b.ts', imports: ['a.ts'] },
    ];
    expect([...(buildReachability(cyclic).get('a.ts') ?? [])].sort()).toEqual(['a.ts', 'b.ts']);
  });

  it('reaches an import the graph does not describe and stops there', () => {
    const reaching = [{ path: 'a.ts', imports: ['node_modules/x.ts'] }];
    expect([...(buildReachability(reaching).get('a.ts') ?? [])]).toEqual(['node_modules/x.ts']);
  });
});

describe('isConnected', () => {
  const reachable = buildReachability([
    { path: 'a.ts', imports: ['b.ts'] },
    { path: 'b.ts', imports: [] },
    { path: 'far.ts', imports: [] },
  ]);

  it('connects an importer to what it imports', () => {
    expect(isConnected(reachable, 'a.ts', 'b.ts')).toBe(true);
  });

  it('connects in the other direction too, because coupling has no direction', () => {
    expect(isConnected(reachable, 'b.ts', 'a.ts')).toBe(true);
  });

  it('does not connect two files with no path between them', () => {
    expect(isConnected(reachable, 'a.ts', 'far.ts')).toBe(false);
  });

  it('does not connect a file the graph has never heard of', () => {
    expect(isConnected(reachable, 'unknown.ts', 'a.ts')).toBe(false);
  });

  it('does not connect when the second file is the one the graph has not heard of', () => {
    expect(isConnected(reachable, 'a.ts', 'unknown.ts')).toBe(false);
  });
});

describe('partitionByConnection', () => {
  const reachable = buildReachability([
    { path: 'a.ts', imports: ['b.ts'] },
    { path: 'b.ts', imports: [] },
    { path: 'far.ts', imports: [] },
  ]);

  it('calls a pair with an import path between them connected', () => {
    const pair = buildPair({ left: 'a.ts', right: 'b.ts' });
    expect(partitionByConnection([pair], reachable)).toEqual({
      hidden: [],
      connected: [pair],
      uncovered: [],
    });
  });

  it('calls a pair the graph describes and does not connect hidden', () => {
    const pair = buildPair({ left: 'a.ts', right: 'far.ts' });
    expect(partitionByConnection([pair], reachable).hidden).toEqual([pair]);
  });

  it('leaves out a pair whose left file the graph does not describe', () => {
    const pair = buildPair({ left: 'deleted.ts', right: 'a.ts' });
    expect(partitionByConnection([pair], reachable).uncovered).toEqual([pair]);
  });

  it('leaves out a pair whose right file the graph does not describe', () => {
    const pair = buildPair({ left: 'a.ts', right: 'deleted.ts' });
    expect(partitionByConnection([pair], reachable).uncovered).toEqual([pair]);
  });
});

describe('renderCouplingReport', () => {
  it('renders the whole page for one hidden pair and no connected one', () => {
    const rendered = renderCouplingReport({
      hidden: [buildPair()],
      connected: [],
      uncovered: [],
      commitWindow: 400,
      headRevision: HEAD_REVISION,
    });
    expect(rendered.split('\n')).toEqual([
      '<!-- Generated by scripts/standards/temporal-coupling.ts. Do not edit by hand. -->',
      '',
      '# Temporal coupling',
      '',
      'Files that change together, and whether anything connects them.',
      '',
      'The module graph says what depends on what. This says what actually moves',
      'together, which is not the same thing and is not derivable from the code as',
      'it stands. A pair that always co-changes with no import path between them in',
      'either direction is a dependency somebody carries in their head: real,',
      'load-bearing, and invisible to every other gate here.',
      '',
      'Degree is shared commits over commits touching either file, so one busy file',
      'cannot inflate it. A file and its own test are left out, because they',
      'co-change by design. Commits touching many files are left out too, because a',
      'rename sweep couples everything it touches with everything else.',
      '',
      'This is a report, not a gate. The input is the history, so it changes on',
      'every commit whether or not any source moved, and a freshness check on it',
      'would fail every commit for a reason nobody could act on.',
      '',
      'Read at `abc1234`, from the last 400 commit(s).',
      '',
      '0 pair(s) are left out because the module graph does not',
      'describe one of the two files: deleted, renamed, or in a workspace the graph',
      'does not model. Nothing can be said about a connection that never existed.',
      '',
      '## Coupled, and nothing connects them',
      '',
      'Each row is a pair worth one question: should one of them import the other,',
      'should a third thing own what they share, or should they stop moving',
      'together.',
      '',
      '| File | Changes with | Degree | Shared | Their commits |',
      '| --- | --- | --- | --- | --- |',
      '| `a.ts` | `b.ts` | 60% | 3 | 4 / 4 |',
      '',
      '## Coupled, and connected',
      '',
      'No pair with an import path between them changes together often.',
      '',
    ]);
  });

  it('renders the whole tail for a page with nothing hidden and one connected pair', () => {
    const rendered = renderCouplingReport({
      hidden: [],
      connected: [buildPair({ left: 'x.ts', right: 'y.ts', degree: 1 })],
      uncovered: [buildPair()],
      commitWindow: 12,
      headRevision: 'deadbee',
    });
    const lines = rendered.split('\n');
    expect(lines.slice(lines.indexOf('Read at `deadbee`, from the last 12 commit(s).'))).toEqual([
      'Read at `deadbee`, from the last 12 commit(s).',
      '',
      '1 pair(s) are left out because the module graph does not',
      'describe one of the two files: deleted, renamed, or in a workspace the graph',
      'does not model. Nothing can be said about a connection that never existed.',
      '',
      '## Coupled, and nothing connects them',
      '',
      'Every pair that changes together has an import path between them.',
      '',
      '## Coupled, and connected',
      '',
      'Expected, and here for contrast: this is what coupling looks like when the',
      'graph already admits to it.',
      '',
      '| File | Changes with | Degree | Shared | Their commits |',
      '| --- | --- | --- | --- | --- |',
      '| `x.ts` | `y.ts` | 100% | 3 | 4 / 4 |',
      '',
    ]);
  });

  it('shows twenty five hidden pairs and says how many more there are', () => {
    const rendered = renderCouplingReport({
      hidden: buildManyPairs(30),
      connected: buildManyPairs(30),
      uncovered: [],
      commitWindow: 400,
      headRevision: HEAD_REVISION,
    });
    const lines = rendered.split('\n');
    expect(lines.filter((line) => line.startsWith('| `file-'))).toHaveLength(50);

    const lastHiddenRow = '| `file-24.ts` | `b.ts` | 60% | 3 | 4 / 4 |';
    expect(lines.slice(lines.indexOf(lastHiddenRow) + 1, lines.indexOf(lastHiddenRow) + 4)).toEqual(
      ['', '5 more unconnected pair(s) score above the threshold and are not shown.', ''],
    );
  });

  it('says nothing about pairs left out when exactly twenty five are hidden', () => {
    const rendered = renderCouplingReport({
      hidden: buildManyPairs(25),
      connected: [],
      uncovered: [],
      commitWindow: 400,
      headRevision: HEAD_REVISION,
    });
    expect(rendered).not.toContain('more unconnected pair(s)');
  });
});

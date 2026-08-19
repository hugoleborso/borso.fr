/**
 * Finds files that change together and are not connected in the module graph.
 *
 * Every other gate in this repository reads the code as it stands. The module
 * graph says what depends on what, and a lint rule can hold that shape. None of
 * them can see that two files nothing connects have been edited in the same
 * commit eleven times out of twelve, which is a dependency that exists in the
 * team's head and nowhere a tool can check.
 *
 * The interesting output is therefore not the coupling. It is the set
 * difference: coupled, and unreachable from each other in either direction.
 */

/** A commit, as the set of tracked source paths it touched. */
export type Commit = readonly string[];

export interface CouplingOptions {
  /**
   * Commits touching more than this say nothing about coupling. A bulk rename
   * or a formatting sweep couples every file it touches with every other, and
   * this repository does those often enough to drown the signal.
   */
  readonly maximumCommitBreadth: number;
  /** Below this a pair is a coincidence rather than a habit. */
  readonly minimumSharedCommits: number;
}

export interface CoupledPair {
  readonly left: string;
  readonly right: string;
  readonly shared: number;
  readonly leftRevisions: number;
  readonly rightRevisions: number;
  /** Shared commits over commits touching either, so one busy file cannot inflate it. */
  readonly degree: number;
}

const PAIR_SEPARATOR = ' ';
const PERCENT = 100;
const TEST_SUFFIX_PATTERN = /[.]test([.]tsx?)$/;

function withoutTestSuffix(path: string): string {
  return path.replace(TEST_SUFFIX_PATTERN, '$1');
}

function isTestSibling(left: string, right: string): boolean {
  return withoutTestSuffix(left) === withoutTestSuffix(right);
}

/** A pair being counted, before it is frozen into a `CoupledPair`. */
interface PairTally {
  readonly left: string;
  readonly right: string;
  shared: number;
  leftRevisions: number;
  rightRevisions: number;
}

function tallySharedCommits(
  commits: readonly Commit[],
  maximumCommitBreadth: number,
): ReadonlyMap<string, PairTally> {
  const tallies = new Map<string, PairTally>();
  for (const commit of commits) {
    if (commit.length > maximumCommitBreadth) continue;
    const paths = [...commit].sort();
    for (const [index, left] of paths.entries()) {
      for (const right of paths.slice(index + 1)) {
        const key = `${left}${PAIR_SEPARATOR}${right}`;
        const found = tallies.get(key);
        if (found === undefined) {
          tallies.set(key, { left, right, shared: 1, leftRevisions: 0, rightRevisions: 0 });
        } else {
          found.shared += 1;
        }
      }
    }
  }
  return tallies;
}

/**
 * How often each file in a pair changed at all, counted onto the pair itself.
 *
 * Counting per file into a second map and reading it back would mean a lookup
 * that cannot miss and a fallback nothing can reach. Walking from the pair to
 * the commits keeps every branch here one the history can take.
 */
function countRevisionsOntoPairs(
  commits: readonly Commit[],
  tallies: ReadonlyMap<string, PairTally>,
): void {
  const talliesByPath = new Map<string, PairTally[]>();
  for (const tally of tallies.values()) {
    for (const path of [tally.left, tally.right]) {
      const found = talliesByPath.get(path);
      if (found === undefined) talliesByPath.set(path, [tally]);
      else found.push(tally);
    }
  }

  for (const commit of commits) {
    for (const path of commit) {
      for (const tally of talliesByPath.get(path) ?? []) {
        if (tally.left === path) tally.leftRevisions += 1;
        else tally.rightRevisions += 1;
      }
    }
  }
}

/**
 * Every pair that changes together often enough to mean something, strongest
 * first. A file and its own test are left out, because they co-change by design
 * and would otherwise fill the whole ranking.
 */
export function rankCoupledPairs(
  commits: readonly Commit[],
  options: CouplingOptions,
): readonly CoupledPair[] {
  const tallies = tallySharedCommits(commits, options.maximumCommitBreadth);
  countRevisionsOntoPairs(commits, tallies);

  return [...tallies.values()]
    .filter((tally) => tally.shared >= options.minimumSharedCommits)
    .filter((tally) => !isTestSibling(tally.left, tally.right))
    .map((tally) => ({
      left: tally.left,
      right: tally.right,
      shared: tally.shared,
      leftRevisions: tally.leftRevisions,
      rightRevisions: tally.rightRevisions,
      degree: tally.shared / (tally.leftRevisions + tally.rightRevisions - tally.shared),
    }))
    .sort(
      (first, second) =>
        second.degree - first.degree ||
        second.shared - first.shared ||
        first.left.localeCompare(second.left) ||
        first.right.localeCompare(second.right),
    );
}

export interface GraphFile {
  readonly path: string;
  readonly imports: readonly string[];
}

/**
 * Which files each file can reach by following imports, at any depth.
 *
 * Depth is the point. A rule that reads one import statement cannot see that
 * a site module reaches an api module through two hops of a shared helper, and
 * a pair connected that way is not hidden coupling.
 */
export function buildReachability(files: readonly GraphFile[]): ReadonlyMap<string, Set<string>> {
  const importsByPath = new Map(files.map((file) => [file.path, file.imports]));
  const reachable = new Map<string, Set<string>>();

  for (const file of files) {
    const found = new Set<string>();
    let frontier: readonly string[] = file.imports;
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const path of frontier) {
        if (found.has(path)) continue;
        found.add(path);
        next.push(...(importsByPath.get(path) ?? []));
      }
      frontier = next;
    }
    reachable.set(file.path, found);
  }
  return reachable;
}

export function isConnected(
  reachable: ReadonlyMap<string, Set<string>>,
  left: string,
  right: string,
): boolean {
  return reachable.get(left)?.has(right) === true || reachable.get(right)?.has(left) === true;
}

export interface PartitionedPairs {
  readonly hidden: readonly CoupledPair[];
  readonly connected: readonly CoupledPair[];
  /**
   * Pairs the graph cannot speak for, because one of the two files is not in
   * it: a file the branch deleted or renamed, or one in a workspace the graph
   * does not model. Calling those unconnected would be the report's loudest
   * false positive, since the graph never had an edge to lose.
   */
  readonly uncovered: readonly CoupledPair[];
}

export function partitionByConnection(
  pairs: readonly CoupledPair[],
  reachable: ReadonlyMap<string, Set<string>>,
): PartitionedPairs {
  const hidden: CoupledPair[] = [];
  const connected: CoupledPair[] = [];
  const uncovered: CoupledPair[] = [];
  for (const pair of pairs) {
    if (!reachable.has(pair.left) || !reachable.has(pair.right)) uncovered.push(pair);
    else if (isConnected(reachable, pair.left, pair.right)) connected.push(pair);
    else hidden.push(pair);
  }
  return { hidden, connected, uncovered };
}

function formatDegree(degree: number): string {
  return `${String(Math.round(degree * PERCENT))}%`;
}

function renderPairRows(pairs: readonly CoupledPair[]): readonly string[] {
  return pairs.map(
    (pair) =>
      `| \`${pair.left}\` | \`${pair.right}\` | ${formatDegree(pair.degree)} | ${String(pair.shared)} | ${String(pair.leftRevisions)} / ${String(pair.rightRevisions)} |`,
  );
}

const REPORT_LIMIT = 25;

export interface CouplingReport extends PartitionedPairs {
  readonly commitWindow: number;
  readonly headRevision: string;
}

export function renderCouplingReport(report: CouplingReport): string {
  const lines = [
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
    `Read at \`${report.headRevision}\`, from the last ${String(report.commitWindow)} commit(s).`,
    '',
    `${String(report.uncovered.length)} pair(s) are left out because the module graph does not`,
    'describe one of the two files: deleted, renamed, or in a workspace the graph',
    'does not model. Nothing can be said about a connection that never existed.',
    '',
  ];

  const hidden = report.hidden.slice(0, REPORT_LIMIT);
  lines.push('## Coupled, and nothing connects them', '');
  if (hidden.length === 0) {
    lines.push('Every pair that changes together has an import path between them.', '');
  } else {
    lines.push(
      'Each row is a pair worth one question: should one of them import the other,',
      'should a third thing own what they share, or should they stop moving',
      'together.',
      '',
      '| File | Changes with | Degree | Shared | Their commits |',
      '| --- | --- | --- | --- | --- |',
      ...renderPairRows(hidden),
      '',
    );
    if (report.hidden.length > hidden.length) {
      lines.push(
        `${String(report.hidden.length - hidden.length)} more unconnected pair(s) score above the threshold and are not shown.`,
        '',
      );
    }
  }

  const connected = report.connected.slice(0, REPORT_LIMIT);
  lines.push('## Coupled, and connected', '');
  if (connected.length === 0) {
    lines.push('No pair with an import path between them changes together often.', '');
  } else {
    lines.push(
      'Expected, and here for contrast: this is what coupling looks like when the',
      'graph already admits to it.',
      '',
      '| File | Changes with | Degree | Shared | Their commits |',
      '| --- | --- | --- | --- | --- |',
      ...renderPairRows(connected),
      '',
    );
  }

  return lines.join('\n');
}

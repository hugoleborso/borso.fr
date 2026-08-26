import {
  buildFinding,
  distinctPaths,
  localityOf,
  MINIMUM_FILES_FOR_SHARED_SUBJECT,
  scoreOf,
} from './scoring.core';
import type {
  CacheTouchSite,
  Finding,
  MutableStateSite,
  OrphanCacheKey,
  QueryReadSite,
  SourceFile,
  TemporalSite,
} from './connascence.types';

export function listExecutionConnascence(
  states: readonly MutableStateSite[],
  index: ReadonlyMap<string, SourceFile>,
): readonly Finding[] {
  return states
    .filter((state) => state.writers.length > 0 && state.readers.length > 0)
    .map((state) =>
      buildFinding(
        'execution',
        `${state.name} in ${state.path}`,
        [...state.writers, ...state.readers].map((holder) => ({
          path: state.path,
          line: state.line,
          detail: holder,
        })),
        index,
      ),
    );
}

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

export function describeDuration(milliseconds: number): string {
  const seconds = milliseconds / MILLISECONDS_PER_SECOND;
  if (seconds < 1) return `${String(milliseconds)} ms`;
  if (seconds < SECONDS_PER_MINUTE) return `${String(seconds)} s`;
  const minutes = seconds / SECONDS_PER_MINUTE;
  if (minutes < MINUTES_PER_HOUR) return `${String(minutes)} min`;
  return `${String(minutes / MINUTES_PER_HOUR)} h`;
}

const UNIT_WORDS = new Set([
  'MS',
  'MILLISECOND',
  'MILLISECONDS',
  'SEC',
  'SECS',
  'SECOND',
  'SECONDS',
  'MINUTE',
  'MINUTES',
  'HOUR',
  'HOURS',
  'DAY',
  'DAYS',
]);

const GENERIC_WORDS = new Set([
  'MAX',
  'MAXIMUM',
  'MIN',
  'MINIMUM',
  'DEFAULT',
  'VALUE',
  'TIME',
  'NUMBER',
  'THE',
  'A',
]);

const WORD_BOUNDARY = /[^A-Za-z0-9]+|(?<=[a-z0-9])(?=[A-Z])/;
const VALUE_SEPARATOR = /[=(:]/;

export function domainWordsOf(expression: string): ReadonlySet<string> {
  const separator = expression.search(VALUE_SEPARATOR);
  const name = separator === -1 ? expression : expression.slice(0, separator);
  return new Set(
    name
      .split(WORD_BOUNDARY)
      .map((word) => word.toUpperCase())
      .filter((word) => word.length > 0 && !UNIT_WORDS.has(word) && !GENERIC_WORDS.has(word)),
  );
}

function haveAWordInCommon(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  for (const word of left) {
    if (right.has(word)) return true;
  }
  return false;
}

interface Cluster<Item> {
  readonly words: ReadonlySet<string>;
  readonly items: readonly Item[];
}

export function clusterBySharedWord<Item>(
  items: readonly Item[],
  wordsOf: (item: Item) => ReadonlySet<string>,
): readonly (readonly Item[])[] {
  let clusters: Cluster<Item>[] = [];
  for (const item of items) {
    const words = wordsOf(item);
    const joined = clusters.filter((cluster) => haveAWordInCommon(cluster.words, words));
    const separate = clusters.filter((cluster) => !haveAWordInCommon(cluster.words, words));
    clusters = [
      ...separate,
      {
        words: new Set([...words, ...joined.flatMap((cluster) => [...cluster.words])]),
        items: [...joined.flatMap((cluster) => cluster.items), item],
      },
    ];
  }
  return clusters.map((cluster) => cluster.items);
}

export function listTimingConnascence(
  temporal: readonly TemporalSite[],
  index: ReadonlyMap<string, SourceFile>,
): readonly Finding[] {
  const byDuration = new Map<number, TemporalSite[]>();
  for (const site of temporal) {
    byDuration.set(site.milliseconds, [...(byDuration.get(site.milliseconds) ?? []), site]);
  }
  const findings: Finding[] = [];
  for (const [milliseconds, sites] of byDuration) {
    for (const cluster of clusterBySharedWord(sites, (site) => domainWordsOf(site.expression))) {
      const occurrences = cluster.map((site) => ({
        path: site.path,
        line: site.line,
        detail: site.expression,
      }));
      if (distinctPaths(occurrences) < MINIMUM_FILES_FOR_SHARED_SUBJECT) continue;
      findings.push(buildFinding('timing', describeDuration(milliseconds), occurrences, index));
    }
  }
  return findings;
}

export function listCacheFreshnessConnascence(
  serverDirectives: readonly TemporalSite[],
  clientFreshness: readonly TemporalSite[],
  index: ReadonlyMap<string, SourceFile>,
): readonly Finding[] {
  if (serverDirectives.length === 0 || clientFreshness.length === 0) return [];
  const occurrences = [...serverDirectives, ...clientFreshness].map((site) => ({
    path: site.path,
    line: site.line,
    detail: `${site.expression} — ${describeDuration(site.milliseconds)}`,
  }));
  return [
    buildFinding(
      'cache',
      'server freshness and client refetch must be chosen together',
      occurrences,
      index,
    ),
  ];
}

const MINIMUM_CACHE_FAN_OUT = 2;

export function listCacheFanOutConnascence(
  touches: readonly CacheTouchSite[],
  index: ReadonlyMap<string, SourceFile>,
  declarationOf: ReadonlyMap<string, string>,
): readonly Finding[] {
  const byOwner = new Map<string, { first: CacheTouchSite; roots: Set<string> }>();
  for (const touch of touches) {
    const owner = `${touch.path}#${touch.owner}`;
    const bucket = byOwner.get(owner) ?? { first: touch, roots: new Set<string>() };
    bucket.roots.add(touch.root);
    byOwner.set(owner, bucket);
  }
  const findings: Finding[] = [];
  for (const [owner, bucket] of byOwner) {
    const roots = [...bucket.roots].sort();
    if (roots.length < MINIMUM_CACHE_FAN_OUT) continue;
    const first = bucket.first;
    const occurrences = roots.map((root) => ({
      path: declarationOf.get(root) ?? first.path,
      line: 0,
      detail: root,
    }));
    const locality = localityOf(
      [first.path, ...occurrences.map((occurrence) => occurrence.path)],
      index,
    );
    findings.push({
      kind: 'cache',
      subject: `${first.owner} touches ${String(roots.length)} caches`,
      occurrences: [{ path: first.path, line: first.line, detail: owner }, ...occurrences],
      degree: roots.length,
      locality,
      score: scoreOf('cache', roots.length, locality),
    });
  }
  return findings;
}

export function listOrphanCacheKeys(
  touches: readonly CacheTouchSite[],
  reads: readonly QueryReadSite[],
): readonly OrphanCacheKey[] {
  const read = new Set(reads.map((each) => each.root));
  return touches
    .filter((touch) => !read.has(touch.root))
    .map((touch) => ({
      root: touch.root,
      path: touch.path,
      line: touch.line,
      method: touch.method,
    }));
}

export function highestCacheFanOut(touches: readonly CacheTouchSite[]): number {
  const byOwner = new Map<string, Set<string>>();
  for (const touch of touches) {
    const owner = `${touch.path}#${touch.owner}`;
    byOwner.set(owner, (byOwner.get(owner) ?? new Set()).add(touch.root));
  }
  return [...byOwner.values()].reduce((highest, roots) => Math.max(highest, roots.size), 0);
}

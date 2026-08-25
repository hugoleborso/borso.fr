export type ConnascenceKind =
  'meaning' | 'position' | 'algorithm' | 'execution' | 'timing' | 'cache' | 'value';

export interface SourceFile {
  readonly path: string;
  readonly workspace: string;
  readonly container: string;
  readonly context: string | null;
  readonly imports: readonly string[];
}

export interface LiteralSite {
  readonly path: string;
  readonly value: string;
  readonly line: number;
  readonly named: boolean;
}

export interface RegexSite {
  readonly path: string;
  readonly source: string;
  readonly line: number;
}

export interface BodySite {
  readonly path: string;
  readonly name: string;
  readonly digest: string;
  readonly tokens: number;
  readonly lines: number;
  readonly line: number;
}

export interface TemporalSite {
  readonly path: string;
  readonly line: number;
  readonly milliseconds: number;
  readonly expression: string;
}

export interface CacheTouchSite {
  readonly path: string;
  readonly line: number;
  readonly owner: string;
  readonly root: string;
  readonly method: string;
}

export interface QueryReadSite {
  readonly path: string;
  readonly root: string;
}

export interface SignatureSite {
  readonly path: string;
  readonly name: string;
  readonly arity: number;
  readonly line: number;
}

export interface UnionSite {
  readonly path: string;
  readonly name: string;
  readonly members: readonly string[];
  readonly line: number;
}

export interface MutableStateSite {
  readonly path: string;
  readonly name: string;
  readonly writers: readonly string[];
  readonly readers: readonly string[];
  readonly line: number;
}

export interface Occurrence {
  readonly path: string;
  readonly line: number;
  readonly detail: string;
}

export interface Finding {
  readonly kind: ConnascenceKind;
  readonly subject: string;
  readonly occurrences: readonly Occurrence[];
  readonly degree: number;
  readonly locality: number;
  readonly score: number;
}

export const STRENGTH_RANK: Readonly<Record<ConnascenceKind, number>> = {
  meaning: 3,
  position: 4,
  algorithm: 5,
  execution: 6,
  timing: 7,
  cache: 7,
  value: 8,
};

export const EVERY_KIND: readonly ConnascenceKind[] = [
  'meaning',
  'position',
  'algorithm',
  'execution',
  'timing',
  'cache',
  'value',
];

export const LOCALITY_WEIGHT: readonly number[] = [1, 2, 4, 8];

export const LOCALITY_NAME: readonly string[] = [
  'same file',
  'same bounded context',
  'same container',
  'same workspace',
];

const SAME_FILE = 0;
const SAME_CONTEXT = 1;
const SAME_CONTAINER = 2;
const SAME_WORKSPACE = 3;

function distanceBetween(left: SourceFile, right: SourceFile): number {
  if (left.path === right.path) return SAME_FILE;
  if (left.container !== right.container) return SAME_WORKSPACE;
  if (left.context !== right.context) return SAME_CONTAINER;
  return SAME_CONTEXT;
}

export function localityOf(
  paths: readonly string[],
  index: ReadonlyMap<string, SourceFile>,
): number {
  const known = paths.flatMap((path) => {
    const file = index.get(path);
    return file === undefined ? [] : [file];
  });
  let widest = SAME_FILE;
  for (const left of known) {
    for (const right of known) {
      widest = Math.max(widest, distanceBetween(left, right));
    }
  }
  return widest;
}

export function scoreOf(kind: ConnascenceKind, degree: number, locality: number): number {
  const spread = degree - 1;
  return STRENGTH_RANK[kind] * spread * (LOCALITY_WEIGHT[locality] ?? 1);
}

function buildFinding(
  kind: ConnascenceKind,
  subject: string,
  occurrences: readonly Occurrence[],
  index: ReadonlyMap<string, SourceFile>,
): Finding {
  const degree = occurrences.length;
  const locality = localityOf(
    occurrences.map((occurrence) => occurrence.path),
    index,
  );
  return { kind, subject, occurrences, degree, locality, score: scoreOf(kind, degree, locality) };
}

function distinctPaths(occurrences: readonly Occurrence[]): number {
  return new Set(occurrences.map((occurrence) => occurrence.path)).size;
}

const MINIMUM_FILES_FOR_SHARED_SUBJECT = 2;

export function listMeaningConnascence(
  literals: readonly LiteralSite[],
  index: ReadonlyMap<string, SourceFile>,
): readonly Finding[] {
  const byValue = new Map<string, Occurrence[]>();
  for (const literal of literals) {
    const bucket = byValue.get(literal.value) ?? [];
    bucket.push({
      path: literal.path,
      line: literal.line,
      detail: literal.named ? 'named constant' : 'inline literal',
    });
    byValue.set(literal.value, bucket);
  }
  const findings: Finding[] = [];
  for (const [value, occurrences] of byValue) {
    if (distinctPaths(occurrences) < MINIMUM_FILES_FOR_SHARED_SUBJECT) continue;
    findings.push(buildFinding('meaning', value, occurrences, index));
  }
  return findings;
}

interface SharedBody {
  readonly name: string;
  readonly occurrences: Occurrence[];
}

export function listAlgorithmConnascence(
  regexes: readonly RegexSite[],
  bodies: readonly BodySite[],
  index: ReadonlyMap<string, SourceFile>,
): readonly Finding[] {
  const byRegex = new Map<string, Occurrence[]>();
  for (const regex of regexes) {
    const bucket = byRegex.get(regex.source) ?? [];
    bucket.push({ path: regex.path, line: regex.line, detail: 'regular expression' });
    byRegex.set(regex.source, bucket);
  }
  const byDigest = new Map<string, SharedBody>();
  for (const body of bodies) {
    const bucket = byDigest.get(body.digest) ?? { name: body.name, occurrences: [] };
    bucket.occurrences.push({ path: body.path, line: body.line, detail: body.name });
    byDigest.set(body.digest, bucket);
  }
  const findings: Finding[] = [];
  for (const [source, occurrences] of byRegex) {
    if (distinctPaths(occurrences) < MINIMUM_FILES_FOR_SHARED_SUBJECT) continue;
    findings.push(buildFinding('algorithm', `/${source}/`, occurrences, index));
  }
  for (const shared of byDigest.values()) {
    if (distinctPaths(shared.occurrences) < MINIMUM_FILES_FOR_SHARED_SUBJECT) continue;
    findings.push(buildFinding('algorithm', `body of ${shared.name}`, shared.occurrences, index));
  }
  return findings;
}

export const POSITIONAL_ARITY_THRESHOLD = 3;

export function listPositionConnascence(
  signatures: readonly SignatureSite[],
  importersOf: ReadonlyMap<string, readonly string[]>,
  index: ReadonlyMap<string, SourceFile>,
): readonly Finding[] {
  const findings: Finding[] = [];
  for (const signature of signatures) {
    if (signature.arity < POSITIONAL_ARITY_THRESHOLD) continue;
    const callers = importersOf.get(signature.path) ?? [];
    const locality = localityOf([signature.path, ...callers], index);
    findings.push({
      kind: 'position',
      subject: `${signature.name}/${String(signature.arity)}`,
      occurrences: [
        {
          path: signature.path,
          line: signature.line,
          detail: `${String(signature.arity)} positional parameters, ${String(callers.length)} importing file(s)`,
        },
      ],
      degree: signature.arity,
      locality,
      score: scoreOf('position', signature.arity, locality),
    });
  }
  return findings;
}

export function listValueConnascence(
  unions: readonly UnionSite[],
  literalsByPath: ReadonlyMap<string, ReadonlySet<string>>,
  index: ReadonlyMap<string, SourceFile>,
): readonly Finding[] {
  const findings: Finding[] = [];
  for (const union of unions) {
    const echoes: Occurrence[] = [
      { path: union.path, line: union.line, detail: `type ${union.name}` },
    ];
    for (const [path, values] of literalsByPath) {
      if (path === union.path) continue;
      const file = index.get(path);
      if (file !== undefined && file.imports.includes(union.path)) continue;
      if (union.members.every((member) => values.has(member))) {
        echoes.push({ path, line: 0, detail: `re-enumerates every member of ${union.name}` });
      }
    }
    if (echoes.length < MINIMUM_FILES_FOR_SHARED_SUBJECT) continue;
    findings.push(
      buildFinding('value', `${union.name} = ${union.members.join(' | ')}`, echoes, index),
    );
  }
  return findings;
}

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

export interface KindSummary {
  readonly kind: ConnascenceKind;
  readonly findings: number;
  readonly sites: number;
  readonly score: number;
}

export function summariseByKind(findings: readonly Finding[]): readonly KindSummary[] {
  return EVERY_KIND.map((kind) => {
    const matching = findings.filter((finding) => finding.kind === kind);
    return {
      kind,
      findings: matching.length,
      sites: matching.reduce((total, finding) => total + finding.degree, 0),
      score: matching.reduce((total, finding) => total + finding.score, 0),
    };
  });
}

export function summariseByWorkspace(
  findings: readonly Finding[],
  index: ReadonlyMap<string, SourceFile>,
): ReadonlyMap<string, number> {
  const totals = new Map<string, number>();
  for (const finding of findings) {
    for (const workspace of workspacesOf(finding, index)) {
      totals.set(workspace, (totals.get(workspace) ?? 0) + finding.score);
    }
  }
  return totals;
}

function workspacesOf(finding: Finding, index: ReadonlyMap<string, SourceFile>): Set<string> {
  const workspaces = new Set<string>();
  for (const occurrence of finding.occurrences) {
    const file = index.get(occurrence.path);
    if (file !== undefined) workspaces.add(file.workspace);
  }
  return workspaces;
}

export function rankFindings(findings: readonly Finding[]): readonly Finding[] {
  return [...findings].sort(
    (left, right) => right.score - left.score || left.subject.localeCompare(right.subject),
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

export interface OrphanCacheKey {
  readonly root: string;
  readonly path: string;
  readonly line: number;
  readonly method: string;
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

export interface Metrics {
  readonly duplicatedLinePercent: number;
  readonly maximumArity: number;
  readonly maximumCacheFanOut: number;
  readonly orphanCacheKeys: number;
  readonly maximumTimingDegree: number;
}

const PERCENT = 100;
const PERCENT_PRECISION = 100;

function highestDegree(findings: readonly Finding[], kind: ConnascenceKind): number {
  return findings
    .filter((finding) => finding.kind === kind)
    .reduce((highest, finding) => Math.max(highest, finding.degree), 0);
}

export function highestCacheFanOut(touches: readonly CacheTouchSite[]): number {
  const byOwner = new Map<string, Set<string>>();
  for (const touch of touches) {
    const owner = `${touch.path}#${touch.owner}`;
    byOwner.set(owner, (byOwner.get(owner) ?? new Set()).add(touch.root));
  }
  return [...byOwner.values()].reduce((highest, roots) => Math.max(highest, roots.size), 0);
}

export function buildMetrics(
  findings: readonly Finding[],
  bodies: readonly BodySite[],
  orphans: readonly OrphanCacheKey[],
  touches: readonly CacheTouchSite[],
  measuredLines: number,
): Metrics {
  const byDigest = new Map<string, { lines: number; paths: Set<string>; copies: number }>();
  for (const body of bodies) {
    const clones = byDigest.get(body.digest) ?? {
      lines: body.lines,
      paths: new Set<string>(),
      copies: 0,
    };
    clones.paths.add(body.path);
    byDigest.set(body.digest, { ...clones, copies: clones.copies + 1 });
  }
  let redundantLines = 0;
  for (const clones of byDigest.values()) {
    if (clones.paths.size < MINIMUM_FILES_FOR_SHARED_SUBJECT) continue;
    redundantLines += clones.lines * (clones.copies - 1);
  }
  return {
    duplicatedLinePercent:
      Math.round((redundantLines / Math.max(measuredLines, 1)) * PERCENT * PERCENT_PRECISION) /
      PERCENT_PRECISION,
    maximumArity: highestDegree(findings, 'position'),
    maximumCacheFanOut: highestCacheFanOut(touches),
    orphanCacheKeys: orphans.length,
    maximumTimingDegree: highestDegree(findings, 'timing'),
  };
}

export interface Ceiling {
  readonly limit: number;
  readonly anchor: string;
}

export type Ceilings = Readonly<Record<string, Ceiling>>;

export interface CeilingFailure {
  readonly metric: string;
  readonly measured: number;
  readonly limit: number;
  readonly anchor: string;
}

export function listCeilingFailures(
  metrics: Metrics,
  ceilings: Ceilings,
): readonly CeilingFailure[] {
  return Object.entries(metrics)
    .flatMap(([metric, measured]) => {
      const ceiling = ceilings[metric];
      if (ceiling === undefined || measured <= ceiling.limit) return [];
      return [{ metric, measured, limit: ceiling.limit, anchor: ceiling.anchor }];
    })
    .sort((left, right) => left.metric.localeCompare(right.metric));
}

export type Baseline = Readonly<Record<string, number>>;

export function buildBaseline(
  findings: readonly Finding[],
  index: ReadonlyMap<string, SourceFile>,
): Baseline {
  const counts: Record<string, number> = {};
  for (const summary of summariseByKind(findings)) {
    counts[`connascence:${summary.kind}`] = summary.findings;
  }
  for (const [workspace, score] of [...summariseByWorkspace(findings, index)].sort()) {
    counts[`connascence-score:${workspace}`] = score;
  }
  return counts;
}

export interface RatchetFailure {
  readonly key: string;
  readonly was: number;
  readonly now: number;
}

export function allowanceFor(was: number, tolerance: number): number {
  return Math.floor(was * tolerance);
}

export function listRatchetFailures(
  baseline: Baseline,
  current: Baseline,
  tolerance: number,
): readonly RatchetFailure[] {
  return Object.entries(current)
    .map(([key, now]) => ({ key, was: baseline[key] ?? 0, now }))
    .filter((entry) => entry.now > entry.was + allowanceFor(entry.was, tolerance));
}

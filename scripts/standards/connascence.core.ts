export type ConnascenceKind = 'meaning' | 'position' | 'algorithm' | 'execution' | 'value';

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
  readonly line: number;
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
  value: 8,
};

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
      const distance = distanceBetween(left, right);
      if (distance > widest) widest = distance;
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
  const kinds: ConnascenceKind[] = ['meaning', 'position', 'algorithm', 'execution', 'value'];
  return kinds.map((kind) => {
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

export function listRatchetFailures(
  baseline: Baseline,
  current: Baseline,
): readonly RatchetFailure[] {
  return Object.entries(current)
    .filter(([key, now]) => now > (baseline[key] ?? 0))
    .map(([key, now]) => ({ key, was: baseline[key] ?? 0, now }));
}

import type {
  ConnascenceKind,
  Finding,
  KindSummary,
  Occurrence,
  SourceFile,
} from './connascence.types';

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

export function buildFinding(
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

export function distinctPaths(occurrences: readonly Occurrence[]): number {
  return new Set(occurrences.map((occurrence) => occurrence.path)).size;
}

export const MINIMUM_FILES_FOR_SHARED_SUBJECT = 2;

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

import {
  MINIMUM_FILES_FOR_SHARED_SUBJECT,
  summariseByKind,
  summariseByWorkspace,
} from './scoring.core';
import { highestCacheFanOut } from './timing-kinds.core';
import type {
  Baseline,
  BodySite,
  Ceilings,
  CeilingFailure,
  ConnascenceKind,
  Finding,
  Metrics,
  OrphanCacheKey,
  RatchetFailure,
  SourceFile,
  CacheTouchSite,
} from './connascence.types';

const PERCENT = 100;
const PERCENT_PRECISION = 100;

function highestDegree(findings: readonly Finding[], kind: ConnascenceKind): number {
  return findings
    .filter((finding) => finding.kind === kind)
    .reduce((highest, finding) => Math.max(highest, finding.degree), 0);
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

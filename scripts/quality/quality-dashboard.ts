#!/usr/bin/env tsx

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { inferLayer } from '../../.claude/skills/blueprint/blueprint-utils.js';
import { REPOSITORY_ROOT, readDantotsuCorpus } from './dantotsu-corpus';
import {
  FRONT_END_APPS,
  FULL_STACK_APPS,
  RANGES,
  buildBugReportIndicators,
  buildGatewayIndicators,
  buildSecurityIndicators,
  buildSentryIndicators,
  buildSentryIssueIndicators,
  isEverySourceUnavailable,
  listBuckets,
  listUnavailableSources,
  placeBugReports,
  readTargets,
  type Indicator,
  type RangeSpec,
  type SentryReading,
  type SentrySnapshot,
  type SourceResult,
} from './quality-dashboard.core';
import {
  buildBucketRows,
  buildDefectRows,
  buildIndicatorRows,
  buildWeakPointRows,
  buildWeakPointWeekRows,
} from './quality-datasets.core';
import { readAudit, readGateway, readHttpApis, readSnapshotFile } from './quality-sources.adapter';
import type { PlacedDot } from './weak-points-page.core';
import {
  countWeeklyOccurrences,
  placeOnProductMap,
  readDefectDot,
  readEngagedWeakPoints,
  selectStation,
  type DefectDot,
} from './weak-points.core';

const QUALITY_DIRECTORY = join(REPOSITORY_ROOT, 'docs', 'quality');
const ENGAGED_PATH = join(QUALITY_DIRECTORY, 'weak-points.md');
const TARGETS_PATH = join(QUALITY_DIRECTORY, 'targets.md');
const DEFAULT_OUTPUT_PATH = join(QUALITY_DIRECTORY, 'datasets');
const ISO_DATE_LENGTH = 10;
const FACTORY_COLUMN = 'defects';
const APPS = [...FULL_STACK_APPS, ...FRONT_END_APPS];
const JSON_INDENT = 2;
const REPOSITORY_RANGE = 'repository';

function placeDot(dot: DefectDot): PlacedDot {
  const product = placeOnProductMap(dot.zone, inferLayer);
  if (product !== null) return { dot, map: 'product', ...product };
  return { dot, map: 'factory', row: selectStation(dot.zone), column: FACTORY_COLUMN };
}

function selectSentry(
  sentry: SourceResult<SentrySnapshot>,
  range: RangeSpec,
): SourceResult<SentryReading> {
  if (sentry.kind === 'unavailable') return sentry;
  return { kind: 'ok', value: sentry.value[range.id] };
}

function main(): void {
  const { values } = parseArgs({
    options: { snapshot: { type: 'string' }, output: { type: 'string' } },
  });
  const snapshot = readSnapshotFile(values.snapshot);
  if (snapshot.kind === 'unavailable') {
    process.stderr.write(
      `The snapshot ${values.snapshot ?? ''} could not be read: ${snapshot.reason}\n`,
    );
    process.exitCode = 1;
    return;
  }
  const outputPath = resolve(values.output ?? DEFAULT_OUTPUT_PATH);
  const clock = new Date();
  const now = clock.toISOString().slice(0, ISO_DATE_LENGTH);
  const apis = readHttpApis();
  const readings = RANGES.map((range) => ({ range, gateway: readGateway(apis, clock, range) }));
  const audit = readAudit();
  const { sentry, sentryIssues, bugReports, dependabot, secretScanning } = snapshot.value;
  const sources = new Map<string, SourceResult<unknown>>([
    ['CloudWatch', readings[0]?.gateway ?? apis],
    ['pnpm audit', audit],
    ['Sentry', sentry],
    ['Sentry issues', sentryIssues],
    ['pragma bug reports', bugReports],
    ['Dependabot', dependabot],
    ['Secret scanning', secretScanning],
  ]);
  const unavailableSources = listUnavailableSources(sources);
  for (const source of unavailableSources) process.stderr.write(`  unavailable: ${source}\n`);
  if (isEverySourceUnavailable(sources)) {
    process.stderr.write('\nEvery source failed, so no dataset was written.\n');
    process.exitCode = 1;
    return;
  }
  const targets = existsSync(TARGETS_PATH) ? readTargets(readFileSync(TARGETS_PATH, 'utf8')) : [];
  const dantotsuDots = readDantotsuCorpus()
    .map(readDefectDot)
    .filter((dot): dot is DefectDot => dot !== null);
  const dots = [
    ...dantotsuDots,
    ...(bugReports.kind === 'ok' ? placeBugReports(bugReports.value) : []),
  ];
  const engaged = readEngagedWeakPoints(readFileSync(ENGAGED_PATH, 'utf8'));
  const weeklyCounts = new Map(
    engaged.map((weakPoint) => [
      weakPoint.id,
      countWeeklyOccurrences(dantotsuDots, weakPoint.id, now),
    ]),
  );
  const perRange = readings.map(({ range, gateway }) => {
    const buckets = listBuckets(range, clock);
    const indicators: readonly Indicator[] = [
      ...buildGatewayIndicators(gateway, APPS, range, buckets),
      ...buildSentryIndicators(selectSentry(sentry, range), APPS, buckets),
      ...buildSentryIssueIndicators(sentryIssues, APPS),
      ...buildBugReportIndicators(bugReports, APPS, range, buckets),
    ];
    return { range, indicators };
  });

  mkdirSync(outputPath, { recursive: true });
  const datasets = new Map<string, readonly unknown[]>([
    [
      'indicators',
      perRange.flatMap(({ range, indicators }) =>
        buildIndicatorRows(range.id, indicators, targets),
      ),
    ],
    ['buckets', perRange.flatMap(({ range, indicators }) => buildBucketRows(range.id, indicators))],
    [
      'security',
      buildIndicatorRows(
        REPOSITORY_RANGE,
        buildSecurityIndicators({ dependabot, audit, secretScanning }),
        targets,
      ),
    ],
    ['weak_points', buildWeakPointRows(engaged, weeklyCounts)],
    ['weak_point_weeks', buildWeakPointWeekRows(engaged, weeklyCounts)],
    ['defects', buildDefectRows(dots.map(placeDot))],
  ]);
  for (const [name, rows] of datasets) {
    writeFileSync(
      join(outputPath, `${name}.json`),
      JSON.stringify(rows, null, JSON_INDENT),
      'utf8',
    );
  }
  process.stdout.write(
    `Wrote ${String(datasets.size)} dataset(s) to ${outputPath} (${String(sources.size - unavailableSources.length)} of ${String(sources.size)} sources read, ${String(dots.length)} defects).\n`,
  );
}

main();

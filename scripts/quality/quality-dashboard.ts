#!/usr/bin/env tsx

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inferLayer } from '../../.claude/skills/blueprint/blueprint-utils.js';
import { REPOSITORY_ROOT, readDantotsuCorpus } from './dantotsu-corpus';
import { renderDashboardPage } from './quality-dashboard-page.core';
import {
  FRONT_END_APPS,
  FULL_STACK_APPS,
  buildBugReportIndicators,
  buildGatewayIndicators,
  buildSecurityIndicators,
  buildSentryIndicators,
  isEverySourceUnavailable,
  listUnavailableSources,
  placeBugReports,
  readTargets,
  type SourceResult,
} from './quality-dashboard.core';
import {
  readAudit,
  readDependabot,
  readGateway,
  readPragmaBugReports,
  readSecretScanning,
  readSentry,
} from './quality-sources.adapter';
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
const OUTPUT_PATH = join(QUALITY_DIRECTORY, 'dashboard.html');
const ISO_DATE_LENGTH = 10;
const FACTORY_COLUMN = 'defects';
const APPS = [...FULL_STACK_APPS, ...FRONT_END_APPS];

function placeDot(dot: DefectDot): PlacedDot {
  const product = placeOnProductMap(dot.zone, inferLayer);
  if (product !== null) return { dot, map: 'product', ...product };
  return { dot, map: 'factory', row: selectStation(dot.zone), column: FACTORY_COLUMN };
}

async function main(): Promise<void> {
  const clock = new Date();
  const now = clock.toISOString().slice(0, ISO_DATE_LENGTH);
  const [gateway, sentry, dependabot, audit, secretScanning, bugReports] = await Promise.all([
    readGateway(clock),
    readSentry(clock),
    readDependabot(),
    readAudit(),
    readSecretScanning(),
    readPragmaBugReports(),
  ]);
  const sources = new Map<string, SourceResult<unknown>>([
    ['CloudWatch', gateway],
    ['Sentry', sentry],
    ['Dependabot', dependabot],
    ['pnpm audit', audit],
    ['Secret scanning', secretScanning],
    ['pragma bug reports', bugReports],
  ]);
  const unavailableSources = listUnavailableSources(sources);
  for (const source of unavailableSources) process.stderr.write(`  unavailable: ${source}\n`);
  if (isEverySourceUnavailable(sources)) {
    process.stderr.write('\nEvery source failed, so the last published dashboard is kept.\n');
    process.exitCode = 1;
    return;
  }
  const dantotsuDots = readDantotsuCorpus()
    .map(readDefectDot)
    .filter((dot): dot is DefectDot => dot !== null);
  const dots = [
    ...dantotsuDots,
    ...(bugReports.kind === 'ok' ? placeBugReports(bugReports.value) : []),
  ];
  const engaged = readEngagedWeakPoints(readFileSync(ENGAGED_PATH, 'utf8'));
  mkdirSync(QUALITY_DIRECTORY, { recursive: true });
  writeFileSync(
    OUTPUT_PATH,
    renderDashboardPage({
      now,
      indicators: [
        ...buildSecurityIndicators({ dependabot, audit, secretScanning }, now),
        ...buildGatewayIndicators(gateway, APPS, now),
        ...buildSentryIndicators(sentry, APPS, now),
        ...buildBugReportIndicators(bugReports, APPS, now),
      ],
      targets: existsSync(TARGETS_PATH) ? readTargets(readFileSync(TARGETS_PATH, 'utf8')) : [],
      unavailableSources,
      placed: dots.map(placeDot),
      engaged,
      weeklyCounts: new Map(
        engaged.map((weakPoint) => [
          weakPoint.id,
          countWeeklyOccurrences(dantotsuDots, weakPoint.id, now),
        ]),
      ),
    }),
    'utf8',
  );
  process.stdout.write(
    `Wrote docs/quality/dashboard.html (${String(sources.size - unavailableSources.length)} of ${String(sources.size)} sources read, ${String(dots.length)} dots).\n`,
  );
}

await main();

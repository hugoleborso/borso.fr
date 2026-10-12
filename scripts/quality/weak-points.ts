#!/usr/bin/env tsx

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inferLayer } from '../../.claude/skills/blueprint/blueprint-utils.js';
import { REPOSITORY_ROOT, readTrackedPaths, readDantotsuCorpus } from './dantotsu-corpus';
import { renderWeakPointPage, type PlacedDot } from './weak-points-page.core';
import {
  countWeeklyOccurrences,
  groupRecurrences,
  placeOnProductMap,
  readDefectDot,
  readEngagedWeakPoints,
  selectStation,
  selectUnresolvedReferences,
  type DefectDot,
} from './weak-points.core';

const QUALITY_DIRECTORY = join(REPOSITORY_ROOT, 'docs', 'quality');
const ENGAGED_PATH = join(QUALITY_DIRECTORY, 'weak-points.md');
const OUTPUT_PATH = join(QUALITY_DIRECTORY, 'weak-points.html');
const ISO_DATE_LENGTH = 10;
const FACTORY_COLUMN = 'defects';

function placeDot(dot: DefectDot): PlacedDot {
  const product = placeOnProductMap(dot.zone, inferLayer);
  if (product !== null) return { dot, map: 'product', ...product };
  return { dot, map: 'factory', row: selectStation(dot.zone), column: FACTORY_COLUMN };
}

function main(): void {
  const now = new Date().toISOString().slice(0, ISO_DATE_LENGTH);
  const dots = readDantotsuCorpus()
    .map(readDefectDot)
    .filter((dot): dot is DefectDot => dot !== null);
  const engaged = readEngagedWeakPoints(readFileSync(ENGAGED_PATH, 'utf8'));
  const weeklyCounts = new Map(
    engaged.map((weakPoint) => [weakPoint.id, countWeeklyOccurrences(dots, weakPoint.id, now)]),
  );
  mkdirSync(QUALITY_DIRECTORY, { recursive: true });
  writeFileSync(
    OUTPUT_PATH,
    renderWeakPointPage({
      now,
      placed: dots.map(placeDot),
      engaged,
      weeklyCounts,
      recurrences: groupRecurrences(dots),
    }),
    'utf8',
  );
  const problems = selectUnresolvedReferences(dots, readTrackedPaths(), engaged);
  for (const problem of problems) process.stderr.write(`  ${problem}\n`);
  if (problems.length > 0) {
    process.stderr.write(
      '\nA zone places a defect on the map and a weak point counts it; one that names ' +
        'nothing drops the dot without a word. Point the zone at the path where the ' +
        'defect lived, or list the weak point in docs/quality/weak-points.md.\n',
    );
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `Wrote docs/quality/weak-points.html (${String(dots.length)} dots, ${String(engaged.filter((weakPoint) => !weakPoint.isClosed).length)} engaged weak point(s)).\n`,
  );
}

main();

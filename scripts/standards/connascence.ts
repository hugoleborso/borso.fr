#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { extract } from './connascence/extract';
import {
  allowanceFor,
  buildBaseline,
  buildMetrics,
  listCeilingFailures,
  listRatchetFailures,
  listRatchetSlack,
} from './connascence/gate.core';
import { renderReport, type Measured } from './connascence/report';
import { rankFindings } from './connascence/scoring.core';
import {
  BASELINE_PATH,
  CEILINGS_PATH,
  identify,
  listSourceFiles,
  RATCHET_TOLERANCE,
  readJsonObject,
  REPORT_PATH,
  REPOSITORY_ROOT,
  VOCABULARY_PATH,
} from './connascence/source-facts';
import {
  listAlgorithmConnascence,
  listMeaningConnascence,
  listPositionConnascence,
  listValueConnascence,
} from './connascence/static-kinds.core';
import { CLIENT_FRESHNESS, SERVER_DIRECTIVE } from './connascence/temporal-facts';
import {
  listCacheFanOutConnascence,
  listCacheFreshnessConnascence,
  listExecutionConnascence,
  listOrphanCacheKeys,
  listTimingConnascence,
} from './connascence/timing-kinds.core';
import type {
  Baseline,
  BodySite,
  CacheTouchSite,
  Ceilings,
  LiteralSite,
  MutableStateSite,
  QueryReadSite,
  RegexSite,
  SignatureSite,
  SourceFile,
  TemporalSite,
  UnionSite,
} from './connascence/connascence.types';

interface WorkspaceSites {
  temporal: TemporalSite[];
  cacheTouches: CacheTouchSite[];
  queryReads: QueryReadSite[];
  literals: LiteralSite[];
  regexes: RegexSite[];
  bodies: BodySite[];
  signatures: SignatureSite[];
  unions: UnionSite[];
  states: MutableStateSite[];
  literalsByPath: Map<string, ReadonlySet<string>>;
}

function emptySites(): WorkspaceSites {
  return {
    temporal: [],
    cacheTouches: [],
    queryReads: [],
    literals: [],
    regexes: [],
    bodies: [],
    signatures: [],
    unions: [],
    states: [],
    literalsByPath: new Map(),
  };
}

function readVocabulary(): ReadonlySet<string> {
  return new Set(Object.keys(readJsonObject(VOCABULARY_PATH)));
}

function readNumbers(path: string): Baseline {
  const counts: Record<string, number> = {};
  for (const [key, value] of Object.entries(readJsonObject(path))) {
    if (typeof value === 'number') counts[key] = value;
  }
  return counts;
}

function readCeilings(): Ceilings {
  const ceilings: Record<string, { limit: number; anchor: string }> = {};
  for (const [metric, value] of Object.entries(readJsonObject(CEILINGS_PATH))) {
    if (typeof value !== 'object' || value === null) continue;
    const limit: unknown = Reflect.get(value, 'limit');
    const anchor: unknown = Reflect.get(value, 'anchor');
    if (typeof limit === 'number' && typeof anchor === 'string')
      ceilings[metric] = { limit, anchor };
  }
  return ceilings;
}

function measure(): Measured {
  const paths = listSourceFiles();
  const externalVocabulary = readVocabulary();
  const index = new Map<string, SourceFile>();
  const perWorkspace = new Map<string, WorkspaceSites>();
  const importersOf = new Map<string, string[]>();
  const declarationOf = new Map<string, string>();
  const everyBody: BodySite[] = [];
  const everyTouch: CacheTouchSite[] = [];
  let lineCount = 0;

  for (const path of paths) {
    const contents = readFileSync(join(REPOSITORY_ROOT, path), 'utf8');
    lineCount += contents.split('\n').length;
    const extracted = extract(path, contents, externalVocabulary);
    const identity = identify(path);
    index.set(path, { path, ...identity, imports: extracted.imports });
    const sites = perWorkspace.get(identity.workspace) ?? emptySites();
    sites.temporal.push(...extracted.temporal);
    sites.cacheTouches.push(...extracted.cacheTouches);
    sites.queryReads.push(...extracted.queryReads);
    sites.literals.push(...extracted.literals);
    sites.regexes.push(...extracted.regexes);
    sites.bodies.push(...extracted.bodies);
    sites.signatures.push(...extracted.signatures);
    sites.unions.push(...extracted.unions);
    sites.states.push(...extracted.states);
    sites.literalsByPath.set(path, new Set(extracted.literals.map((literal) => literal.value)));
    perWorkspace.set(identity.workspace, sites);
    for (const [root, declaredIn] of extracted.keyDeclarations) declarationOf.set(root, declaredIn);
    everyBody.push(...extracted.bodies);
    everyTouch.push(...extracted.cacheTouches);
    for (const target of extracted.imports) {
      importersOf.set(target, [...(importersOf.get(target) ?? []), path]);
    }
  }

  const workspaces = [...perWorkspace.values()];
  const findings = rankFindings(
    workspaces.flatMap((sites) => [
      ...listMeaningConnascence(sites.literals, index),
      ...listAlgorithmConnascence(sites.regexes, sites.bodies, index),
      ...listPositionConnascence(sites.signatures, importersOf, index),
      ...listTimingConnascence(sites.temporal, index),
      ...listCacheFanOutConnascence(sites.cacheTouches, index, declarationOf),
      ...listCacheFreshnessConnascence(
        sites.temporal.filter((site) => SERVER_DIRECTIVE.test(site.expression)),
        sites.temporal.filter((site) => CLIENT_FRESHNESS.test(site.expression)),
        index,
      ),
      ...listValueConnascence(sites.unions, sites.literalsByPath, index),
      ...listExecutionConnascence(sites.states, index),
    ]),
  );
  const orphans = workspaces.flatMap((sites) =>
    listOrphanCacheKeys(sites.cacheTouches, sites.queryReads),
  );
  return {
    findings,
    index,
    fileCount: paths.length,
    lineCount,
    metrics: buildMetrics(findings, everyBody, orphans, everyTouch, lineCount),
    orphans,
  };
}

const PERCENT = 100;

function main(): void {
  const measured = measure();
  const current = buildBaseline(measured.findings, measured.index);
  const ceilings = readCeilings();

  if (process.argv.includes('--json')) {
    console.log(
      JSON.stringify({ counts: current, metrics: measured.metrics, findings: measured.findings }),
    );
    return;
  }

  const rendered = renderReport(measured, ceilings);

  if (process.argv.includes('--accept')) {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
    writeFileSync(REPORT_PATH, rendered);
    console.log(`Baseline accepted: ${String(Object.keys(current).length)} counter(s).`);
    return;
  }

  writeFileSync(REPORT_PATH, rendered);
  const baseline = readNumbers(BASELINE_PATH);
  const failures = listRatchetFailures(baseline, current, RATCHET_TOLERANCE);
  const slack = listRatchetSlack(baseline, current);
  const exceeded = listCeilingFailures(measured.metrics, ceilings);

  if (process.argv.includes('--check')) {
    for (const exceedance of exceeded) {
      console.error(
        `  ${exceedance.metric}: ${String(exceedance.measured)} exceeds the ceiling of ${String(exceedance.limit)} (${exceedance.anchor}).`,
      );
    }
    for (const failure of failures) {
      console.error(
        `  ${failure.key}: was ${String(failure.was)}, now ${String(failure.now)}, allowance ${String(allowanceFor(failure.was, RATCHET_TOLERANCE))}.`,
      );
    }
    if (exceeded.length + failures.length > 0) {
      console.error('');
      console.error('  Name the shared literal, take an object instead of positional parameters,');
      console.error(
        '  export the duration both sides copied, or narrow what the mutation touches.',
      );
      console.error('  A ceiling is a decision, not a backlog: raising one takes an edit to');
      console.error('  connascence-ceilings.json with the anchor it now sits under.');
      console.error('  A ratchet counter accepts a new number with `--accept` in the same commit.');
      process.exitCode = 1;
      return;
    }
    for (const gained of slack) {
      console.log(
        `  ${gained.key}: ${String(gained.was)} -> ${String(gained.now)}. Run \`--accept\` to keep it.`,
      );
    }
    console.log(
      `Every ceiling holds and no counter rose beyond its ${String(RATCHET_TOLERANCE * PERCENT)}% allowance.`,
    );
    return;
  }

  console.log(
    `Wrote docs/standards/connascence.md: ${String(measured.findings.length)} finding(s) over ${String(measured.fileCount)} file(s).`,
  );
  for (const exceedance of exceeded) {
    console.log(
      `  ${exceedance.metric}: ${String(exceedance.measured)} > ${String(exceedance.limit)}`,
    );
  }
  for (const failure of failures) {
    console.log(`  ${failure.key}: ${String(failure.was)} -> ${String(failure.now)}`);
  }
}

main();

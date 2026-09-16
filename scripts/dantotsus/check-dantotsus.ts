import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  countByKind,
  driftAboveBaseline,
  hasEradicationReference,
  parseEntry,
  validateEntry,
  type Entry,
  type Finding,
} from './dantotsu.core';

const REPOSITORY_ROOT = process.cwd();
const ENTRIES_DIRECTORY = join(REPOSITORY_ROOT, 'docs', 'dantotsus');
const BASELINE_PATH = join(REPOSITORY_ROOT, 'docs', 'standards', 'convention-baseline.json');
const BASELINE_PREFIX = 'dantotsu:';
const REFERENCE_KIND = 'eradication-reference';
const SKIPPED = new Set(['README.md', '_template.md']);
const INDENT = 2;

function readEntries(): readonly Entry[] {
  return readdirSync(ENTRIES_DIRECTORY)
    .filter((name) => name.endsWith('.md') && !SKIPPED.has(name))
    .map((name) =>
      parseEntry(name.slice(0, -3), readFileSync(join(ENTRIES_DIRECTORY, name), 'utf8')),
    );
}

function readBaselineFile(): Record<string, number> {
  const parsed: unknown = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  const counts: Record<string, number> = {};
  if (typeof parsed !== 'object' || parsed === null) return counts;
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'number') counts[key] = value;
  }
  return counts;
}

function missingReference(entries: readonly Entry[]): readonly Finding[] {
  return entries
    .filter((entry) => {
      const eradication = entry.sections.get('Eradication');
      return eradication === undefined || !hasEradicationReference(eradication);
    })
    .map((entry) => ({
      entry: entry.name,
      kind: REFERENCE_KIND,
      problem: 'Eradication names no commit, so the reader cannot verify the fix landed',
    }));
}

const entries = readEntries();
const findings = [
  ...entries.flatMap((entry) => [...validateEntry(entry)]),
  ...missingReference(entries),
];
const counts = countByKind(findings);
const stored = readBaselineFile();

if (process.argv.includes('--accept')) {
  const kept = Object.fromEntries(
    Object.entries(stored).filter(([key]) => !key.startsWith(BASELINE_PREFIX)),
  );
  for (const [kind, counted] of counts) kept[`${BASELINE_PREFIX}${kind}`] = counted;
  const sorted = Object.keys(kept).sort();
  writeFileSync(BASELINE_PATH, `${JSON.stringify(kept, sorted, INDENT)}\n`);
  process.stderr.write(`[dantotsus] baseline accepted across ${String(counts.size)} class(es)\n`);
  process.exit(0);
}

if (process.argv.includes('--list')) {
  for (const finding of findings) {
    process.stdout.write(`${finding.kind}\t${finding.entry}\t${finding.problem}\n`);
  }
  process.exit(0);
}

const baseline = new Map(
  Object.entries(stored)
    .filter(([key]) => key.startsWith(BASELINE_PREFIX))
    .map(([key, value]) => [key.slice(BASELINE_PREFIX.length), value]),
);
const drift = driftAboveBaseline(counts, baseline);

for (const finding of drift) {
  process.stderr.write(`[dantotsus] ${finding.problem}\n`);
  for (const detail of findings.filter((candidate) => candidate.kind === finding.kind)) {
    process.stderr.write(`[dantotsus]   ${detail.entry}: ${detail.problem}\n`);
  }
}

if (drift.length > 0) {
  process.stderr.write(
    `[dantotsus] ${String(drift.length)} class(es) above their baseline. Fix the entry, or run --accept in the same commit as a rewrite that lowers another.\n`,
  );
  process.exit(1);
}

process.stderr.write(
  `[dantotsus] ${String(entries.length)} entries, ${String(findings.length)} finding(s), all at or under baseline\n`,
);

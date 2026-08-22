import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  isReviewablePath,
  readSealLedger,
  serialiseSealEntry,
  verifySeals,
  type ReviewableFile,
  type SealEntry,
} from './seal.core';

const REPOSITORY_ROOT = process.cwd();
const SEAL_LEDGER_PATH = join(REPOSITORY_ROOT, 'docs', 'standards', 'seals.jsonl');
const ENFORCEMENT_LEDGER_PATH = join(REPOSITORY_ROOT, 'docs', 'standards', 'enforcement-ledger.md');

const SEAL_LEDGER_HEADER = [
  '# Standards review seals, one JSON object per line.',
  '# Written by `scripts/standards/seal.ts record`, read by `… seal.ts verify`.',
  '# A line records the SHA-256 of file content a reviewer cleared against the',
  '# `reviewer` bullets in enforcement-ledger.md. See seal.core.ts for why the',
  '# content is sealed rather than the path.',
  '',
].join('\n');

function hashContent(contents: string): string {
  return createHash('sha256').update(contents).digest('hex');
}

function readEnforcementLedgerHash(): string {
  if (!existsSync(ENFORCEMENT_LEDGER_PATH)) return '';
  return hashContent(readFileSync(ENFORCEMENT_LEDGER_PATH, 'utf8'));
}

function readSealEntries(): ReturnType<typeof readSealLedger> {
  if (!existsSync(SEAL_LEDGER_PATH)) return [];
  return readSealLedger(readFileSync(SEAL_LEDGER_PATH, 'utf8'));
}

function readOption(name: string, fallback: string): string {
  const flagIndex = process.argv.indexOf(`--${name}`);
  if (flagIndex === -1) return fallback;
  return process.argv[flagIndex + 1] ?? fallback;
}

function recordSeal(): void {
  const paths = process.argv.slice(3).filter((argument) => !argument.startsWith('--'));
  const optionValues = new Set([
    readOption('reviewer', ''),
    readOption('note', ''),
    readOption('base', ''),
  ]);
  const filePaths = paths.filter((path) => !optionValues.has(path));
  if (filePaths.length === 0) {
    console.error('seal record: name at least one file to seal.');
    process.exitCode = 1;
    return;
  }

  const ledgerHash = readEnforcementLedgerHash();
  const reviewer = readOption('reviewer', 'standards-reviewer');
  const note = readOption('note', '');
  const sealedAt = new Date().toISOString();

  mkdirSync(dirname(SEAL_LEDGER_PATH), { recursive: true });

  const recorded = [...readSealEntries()];
  for (const path of filePaths) {
    if (!existsSync(path)) {
      console.error(`seal record: ${path} is not on disk.`);
      process.exitCode = 1;
      return;
    }
    const contentHash = hashContent(readFileSync(path, 'utf8'));
    recorded.push({ contentHash, path, ledgerHash, reviewer, sealedAt, note });
    console.log(`sealed ${path} (${contentHash.slice(0, 12)})`);
  }

  writeSealLedgerInPathOrder(recorded);
}

function writeSealLedgerInPathOrder(entries: readonly SealEntry[]): void {
  const ordered = [...entries].sort(
    (left, right) =>
      left.path.localeCompare(right.path) || left.sealedAt.localeCompare(right.sealedAt),
  );
  const lines = ordered.map((entry) => `${serialiseSealEntry(entry)}\n`).join('');
  writeFileSync(SEAL_LEDGER_PATH, `${SEAL_LEDGER_HEADER}${lines}`);
}

function listChangedFiles(base: string): readonly string[] {
  const mergeBase = execFileSync('git', ['merge-base', base, 'HEAD'], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
  }).trim();
  return execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD'], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((line) => line.length > 0);
}

function verify(): void {
  const base = readOption('base', 'origin/main');
  const reviewable: ReviewableFile[] = [];
  for (const path of listChangedFiles(base)) {
    if (!isReviewablePath(path) || !existsSync(path)) continue;
    reviewable.push({ path, contentHash: hashContent(readFileSync(path, 'utf8')) });
  }

  if (reviewable.length === 0) {
    console.log('No reviewable source changed against ' + base + '; nothing to seal.');
    return;
  }

  const verification = verifySeals(reviewable, readSealEntries(), readEnforcementLedgerHash());
  const failingPaths = new Set(verification.failures.map((failure) => failure.path));
  console.log(`Reviewable against ${base}: ${String(reviewable.length)} file(s).`);
  for (const file of reviewable) {
    if (failingPaths.has(file.path)) continue;
    console.log(`  ${file.path} — sealed`);
  }
  if (verification.failures.length === 0) {
    console.log(`${String(verification.sealedCount)} changed file(s) carry a current seal.`);
    return;
  }

  console.error('');
  console.error(
    `${String(verification.failures.length)} of ${String(reviewable.length)} changed file(s) are not cleared by the standards reviewer:`,
  );
  for (const failure of verification.failures) {
    console.error(`  ${failure.path} — ${failure.reason}`);
  }
  console.error('');
  console.error('Run the `/standards-review` skill, which reads the diff against the');
  console.error('`reviewer` bullets in docs/standards/enforcement-ledger.md and seals');
  console.error('what passes. A file edited after sealing needs sealing again.');
  process.exitCode = 1;
}

const command = process.argv[2];
if (command === 'record') recordSeal();
else if (command === 'verify') verify();
else {
  console.error('Usage: seal.ts record <path…> [--reviewer <name>] [--note <text>]');
  console.error('       seal.ts verify [--base <ref>]');
  process.exitCode = 1;
}

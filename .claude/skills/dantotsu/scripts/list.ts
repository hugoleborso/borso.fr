#!/usr/bin/env tsx

import { readDantotsuCorpus } from '../../../../scripts/quality/dantotsu-corpus.js';
import {
  readField,
  type DantotsuDocument,
} from '../../../../scripts/quality/dantotsu-record.core.js';

const COLUMNS = ['file', 'date', 'severity', 'level', 'tags', 'title'] as const;

type Row = Readonly<Record<(typeof COLUMNS)[number], string>>;

function toRow(document: DantotsuDocument): Row {
  return {
    file: `${document.slug}.md`,
    date: readField(document, 'date') ?? '',
    severity: readField(document, 'severity') ?? '',
    level: readField(document, 'eradication-level') ?? '',
    tags: readField(document, 'tags') ?? '',
    title: document.title,
  };
}

function sortKey(row: Row): string {
  return COLUMNS.map((column) => row[column]).join('\t');
}

function compareNewestFirst(first: Row, second: Row): number {
  if (first.date !== second.date) return first.date < second.date ? 1 : -1;
  return sortKey(first) < sortKey(second) ? 1 : -1;
}

function escapeJson(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

const format = process.argv[2] ?? 'table';
const rows = readDantotsuCorpus().map(toRow).toSorted(compareNewestFirst);

if (format === '--json') {
  for (const row of rows) {
    const fields = COLUMNS.map((column) => `"${column}":"${escapeJson(row[column])}"`);
    process.stdout.write(`{${fields.join(',')}}\n`);
  }
} else if (format === 'table') {
  process.stdout.write('| File | Date | Severity | Level | Tags | Title |\n');
  process.stdout.write('| --- | --- | --- | --- | --- | --- |\n');
  for (const row of rows) {
    process.stdout.write(
      `| \`${row.file}\` | ${row.date} | ${row.severity} | ${row.level} | ${row.tags} | ${row.title} |\n`,
    );
  }
} else {
  process.stderr.write(`Unknown format: ${format} (expected --json or no arg)\n`);
  process.exitCode = 2;
}

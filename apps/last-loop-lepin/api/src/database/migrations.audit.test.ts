/**
 * @vitest-environment node
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(HERE, 'migrations');

const AUDIT_COLUMNS_WITH_DEFAULT_NOW: ReadonlySet<string> = new Set([
  'editions.created_at',
  'loop_punches.created_at',
  'manual_dnfs.created_at',
  'auth_attempts.created_at',
]);

interface NowDefaultOccurrence {
  readonly tableName: string;
  readonly columnName: string;
  readonly file: string;
}

const CREATE_TABLE_PATTERN = /CREATE\s+TABLE\s+"?(\w+)"?\s*\(([\s\S]*?)\);/gi;
const COLUMN_LINE_PATTERN = /^\s*"?(\w+)"?\s+[\w()\s]+DEFAULT\s+now\(\)/i;

function scanFileForNowDefaults(
  filePath: string,
  fileName: string,
): readonly NowDefaultOccurrence[] {
  const occurrences: NowDefaultOccurrence[] = [];
  const content = readFileSync(filePath, 'utf8');
  for (const match of content.matchAll(CREATE_TABLE_PATTERN)) {
    const tableName = match[1] ?? '';
    const body = match[2] ?? '';
    const lines = body.split(/,\s*\n/);
    for (const rawLine of lines) {
      const lineMatch = COLUMN_LINE_PATTERN.exec(rawLine);
      if (lineMatch !== null) {
        const columnName = lineMatch[1] ?? '';
        occurrences.push({ tableName, columnName, file: fileName });
      }
    }
  }
  return occurrences;
}

/**
 * @Blueprint test-artifact-audit
 * @BlueprintName Test Artifact Audit
 * @BlueprintUsage Use for a check on a generated file that ships, so the assertion is made about the file rather than about the objects that produced it.
 * @BlueprintDescription Reads the `.sql` files the migration runner applies straight off disk and fails on any column carrying `DEFAULT now()` outside a named allow list, which also catches a migration edited by hand, something an assertion over the Drizzle table objects would miss.
 */
describe('migration SQL audit', () => {
  it('asserts no business column lands in prod with DEFAULT now()', () => {
    const sqlFiles = readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql'));
    expect(sqlFiles.length).toBeGreaterThan(0);

    const violations: NowDefaultOccurrence[] = [];
    for (const fileName of sqlFiles) {
      const filePath = join(MIGRATIONS_DIR, fileName);
      const occurrences = scanFileForNowDefaults(filePath, fileName);
      for (const occurrence of occurrences) {
        const fqn = `${occurrence.tableName}.${occurrence.columnName}`;
        if (!AUDIT_COLUMNS_WITH_DEFAULT_NOW.has(fqn)) {
          violations.push(occurrence);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

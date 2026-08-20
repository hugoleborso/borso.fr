import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(HERE, 'migrations');

const AUDIT_COLUMNS_WITH_DEFAULT_NOW: ReadonlySet<string> = new Set([
  'app_config.rotated_at',
  'song.created_at',
  'transition_comment.updated_at',
]);

interface NowDefaultOccurrence {
  readonly tableName: string;
  readonly columnName: string;
  readonly file: string;
}

const CREATE_TABLE_PATTERN =
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?\s*\(([\s\S]*?)\);/gi;
const COLUMN_LINE_PATTERN = /^\s*"?(\w+)"?\s+[\w()\s]+DEFAULT\s+now\(\)/i;
const ADD_COLUMN_PATTERN =
  /ALTER\s+TABLE\s+"?(\w+)"?\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?[\w()\s]*DEFAULT\s+now\(\)/gi;

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
  for (const match of content.matchAll(ADD_COLUMN_PATTERN)) {
    occurrences.push({ tableName: match[1] ?? '', columnName: match[2] ?? '', file: fileName });
  }
  return occurrences;
}

// @FollowsBlueprint test-artifact-audit
describe('migration SQL audit', () => {
  it('asserts no business column lands in prod with DEFAULT now()', () => {
    const sqlFiles = readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql'));
    expect(sqlFiles.length).toBeGreaterThan(0);

    const violations: NowDefaultOccurrence[] = [];
    for (const fileName of sqlFiles) {
      const filePath = join(MIGRATIONS_DIR, fileName);
      const occurrences = scanFileForNowDefaults(filePath, fileName);
      for (const occurrence of occurrences) {
        const fullyQualifiedColumn = `${occurrence.tableName}.${occurrence.columnName}`;
        if (!AUDIT_COLUMNS_WITH_DEFAULT_NOW.has(fullyQualifiedColumn)) {
          violations.push(occurrence);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('finds every whitelisted column, so a removed column does not leave a stale entry', () => {
    const found = new Set<string>();
    for (const fileName of readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql'))) {
      for (const occurrence of scanFileForNowDefaults(join(MIGRATIONS_DIR, fileName), fileName)) {
        found.add(`${occurrence.tableName}.${occurrence.columnName}`);
      }
    }

    expect([...AUDIT_COLUMNS_WITH_DEFAULT_NOW].filter((column) => !found.has(column))).toEqual([]);
  });
});

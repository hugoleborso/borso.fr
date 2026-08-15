/**
 * @vitest-environment node
 *
 * Reads every `.sql` file the migration runner applies and fails on any column
 * carrying `DEFAULT now()` outside the allow list. Asserting on the artefact
 * rather than on the Drizzle objects is what also catches SQL edited by hand.
 *
 * The allow list is empty because this application has no row-lifecycle
 * timestamp: `started_at` and `finished_at` are dates a reader chooses, so
 * either taking its value from the migration runner's clock at deploy time
 * would be wrong.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(HERE, 'migrations');

const AUDIT_COLUMNS_WITH_DEFAULT_NOW: ReadonlySet<string> = new Set<string>();

interface NowDefaultOccurrence {
  readonly tableName: string;
  readonly columnName: string;
  readonly file: string;
}

const CREATE_TABLE_PATTERN =
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?\s*\(([\s\S]*?)\);/gi;
const COLUMN_LINE_PATTERN = /^\s*"?(\w+)"?\s+[\w()\s]+DEFAULT\s+now\(\)/i;
/**
 * DSQL refuses `DEFAULT` on `ADD COLUMN`, so a migration written for it cannot
 * carry one. The scan covers the form anyway, because a statement that fails
 * only at deploy time is the one this test should name first.
 */
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
    for (const rawLine of body.split(/,\s*\n/)) {
      const lineMatch = COLUMN_LINE_PATTERN.exec(rawLine);
      if (lineMatch !== null) {
        occurrences.push({ tableName, columnName: lineMatch[1] ?? '', file: fileName });
      }
    }
  }
  for (const match of content.matchAll(ADD_COLUMN_PATTERN)) {
    occurrences.push({ tableName: match[1] ?? '', columnName: match[2] ?? '', file: fileName });
  }
  return occurrences;
}

function listMigrationFileNames(): readonly string[] {
  return readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql'));
}

// @FollowsBlueprint test-artifact-audit
describe('migration SQL audit', () => {
  it('asserts no business column lands in production with DEFAULT now()', () => {
    const sqlFiles = listMigrationFileNames();
    expect(sqlFiles.length).toBeGreaterThan(0);

    const violations: NowDefaultOccurrence[] = [];
    for (const fileName of sqlFiles) {
      for (const occurrence of scanFileForNowDefaults(join(MIGRATIONS_DIR, fileName), fileName)) {
        const fullyQualifiedColumn = `${occurrence.tableName}.${occurrence.columnName}`;
        if (!AUDIT_COLUMNS_WITH_DEFAULT_NOW.has(fullyQualifiedColumn)) {
          violations.push(occurrence);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('finds every allow-listed column, so a removed column leaves no stale entry', () => {
    const found = new Set<string>();
    for (const fileName of listMigrationFileNames()) {
      for (const occurrence of scanFileForNowDefaults(join(MIGRATIONS_DIR, fileName), fileName)) {
        found.add(`${occurrence.tableName}.${occurrence.columnName}`);
      }
    }

    expect([...AUDIT_COLUMNS_WITH_DEFAULT_NOW].filter((column) => !found.has(column))).toEqual([]);
  });
});

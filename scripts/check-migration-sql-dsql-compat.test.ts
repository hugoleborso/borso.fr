import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const GATE = resolve(import.meta.dirname, 'check-migration-sql-dsql-compat.sh');
const REFUSED_MIGRATION = `ALTER TABLE "song" ADD COLUMN "kind" text NOT NULL DEFAULT 'a';\n`;
const ACCEPTED_MIGRATION = `ALTER TABLE "song" ADD COLUMN "kind" text;\n`;
const STUB_NAME = '0099_stub.sql';

const scratchFolders: string[] = [];

function writeStub(body: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'migration-gate-'));
  scratchFolders.push(directory);
  writeFileSync(join(directory, STUB_NAME), body);
  return directory;
}

function runGate(directory: string, ...paths: string[]): number {
  try {
    execFileSync(GATE, paths, {
      cwd: directory,
      stdio: 'pipe',
      env: { ...process.env, KAIZEN_LOG_REFUSALS: '0' },
    });
    return 0;
  } catch (error) {
    if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
      return error.status;
    }
    throw error;
  }
}

afterEach(() => {
  for (const directory of scratchFolders.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('check-migration-sql-dsql-compat.sh', () => {
  it('reads a stub migration outside the migrations folder, by a path relative to the caller', () => {
    const directory = writeStub(REFUSED_MIGRATION);

    expect(runGate(directory, STUB_NAME)).toBe(1);
  });

  it('reads a stub migration given by its absolute path', () => {
    const directory = writeStub(REFUSED_MIGRATION);

    expect(runGate(tmpdir(), join(directory, STUB_NAME))).toBe(1);
  });

  it('accepts a plain ADD COLUMN', () => {
    const directory = writeStub(ACCEPTED_MIGRATION);

    expect(runGate(directory, STUB_NAME)).toBe(0);
  });
});

import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const PURE_FILE_SUFFIXES = ['core', 'utils'] as const;

export const GATED_FILE_SUFFIXES = [...PURE_FILE_SUFFIXES, 'adapter', 'schema'] as const;

function filesEndingIn(suffixes: readonly string[]): string {
  return `**/*.{${suffixes.join(',')}}.{ts,tsx}`;
}

export const PURE_FILES = filesEndingIn(PURE_FILE_SUFFIXES);

const GATED_FILES = filesEndingIn(GATED_FILE_SUFFIXES);

const TEXT_REPORT_WITH_FULL_ROWS: ['text', { skipFull: boolean }] = ['text', { skipFull: false }];

interface CoverageScope {
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
}

export function coverageGate({ include = [GATED_FILES], exclude = [] }: CoverageScope = {}) {
  return {
    provider: 'v8' as const,
    reporter: [TEXT_REPORT_WITH_FULL_ROWS],
    reportsDirectory: join(tmpdir(), 'vitest-coverage', String(process.pid)),
    include: [...include],
    exclude: [...exclude],
    thresholds: { perFile: true, statements: 100, branches: 100, functions: 100, lines: 100 },
  };
}

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const REPOSITORY_ROOT = process.cwd();
export const REPORT_PATH = join(REPOSITORY_ROOT, 'docs', 'standards', 'connascence.md');
export const BASELINE_PATH = join(
  REPOSITORY_ROOT,
  'docs',
  'standards',
  'connascence-baseline.json',
);
export const CEILINGS_PATH = join(
  REPOSITORY_ROOT,
  'docs',
  'standards',
  'connascence-ceilings.json',
);
export const VOCABULARY_PATH = join(
  REPOSITORY_ROOT,
  'docs',
  'standards',
  'connascence-vocabulary.json',
);
export const RATCHET_TOLERANCE = 0.02;

const SOURCE_PATH_PATTERN = /^(apps|infra)\/.*\.(ts|tsx)$/;
const TEST_PATH_PATTERN = /(^|\/)__test\/|[.](test|spec)[.]tsx?$/;
const DECLARATION_PATTERN = /[.]d[.]ts$/;
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];
const JAVASCRIPT_EXTENSION_PATTERN = /[.]js$/;
const FILE_EXTENSION_MARKER = '.';

export function listSourceFiles(): readonly string[] {
  return execFileSync('git', ['ls-files'], { cwd: REPOSITORY_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((path) => SOURCE_PATH_PATTERN.test(path))
    .filter((path) => !TEST_PATH_PATTERN.test(path))
    .filter((path) => !DECLARATION_PATTERN.test(path));
}

export interface Identity {
  readonly workspace: string;
  readonly container: string;
  readonly context: string | null;
}

export function identify(path: string): Identity {
  const segments = path.split('/');
  const sourceIndex = segments.indexOf('src');
  const rawContext = sourceIndex === -1 ? null : (segments[sourceIndex + 1] ?? null);
  return {
    workspace: `${segments[0] ?? ''}/${segments[1] ?? ''}`,
    container: segments[2] ?? 'root',
    context: rawContext !== null && rawContext.includes(FILE_EXTENSION_MARKER) ? null : rawContext,
  };
}

export function resolveRelativeImport(fromPath: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const base = resolve(dirname(join(REPOSITORY_ROOT, fromPath)), specifier).replace(
    JAVASCRIPT_EXTENSION_PATTERN,
    '',
  );
  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = `${base}${extension}`;
    if (existsSync(candidate)) return candidate.slice(REPOSITORY_ROOT.length + 1);
  }
  return null;
}

export function readJsonObject(path: string): Readonly<Record<string, unknown>> {
  if (!existsSync(path)) return {};
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
  return Object.fromEntries(Object.entries(parsed));
}

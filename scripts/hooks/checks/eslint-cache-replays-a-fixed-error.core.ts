// @FollowsBlueprint utils-pure-module
import { type Check, type HookInput, type HookWorld, PASS } from '../check.core.ts';

const TYPE_AWARE_ERROR_LINE =
  /^\s*[0-9]+:[0-9]+\s+error\s[\s\S]*@typescript-eslint\/(no-unsafe-argument|no-unsafe-assignment|no-unsafe-call|no-unsafe-member-access|no-unsafe-return|no-deprecated|no-floating-promises|no-misused-promises|restrict-template-expressions|no-unnecessary-condition)\s*$/u;

const ROOT_CACHE_PREFIX = '.eslintcache';
const NESTED_CACHE_PREFIX = 'node_modules/.cache/eslint';

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isUncachedLintCommand(command: string): boolean {
  const isLint = command.includes('eslint') || command.includes(' lint');
  const clearsCache = command.includes('.eslintcache') || command.includes('.cache/eslint');
  return isLint && !clearsCache;
}

function readOutputField(response: Readonly<Record<string, unknown>>, field: string): string {
  const value = response[field];
  return typeof value === 'string' ? value : '';
}

export function readToolOutput(input: HookInput): string {
  if (typeof input.error === 'string') return input.error;
  const response = input.tool_response;
  if (typeof response === 'string') return response;
  if (!isRecord(response)) return '';
  return ['stdout', 'stderr', 'output'].map((field) => readOutputField(response, field)).join('\n');
}

export function countTypeAwareErrors(output: string): number {
  return output.split('\n').filter((line) => TYPE_AWARE_ERROR_LINE.test(line)).length;
}

function readRepositoryRoot(input: HookInput, world: HookWorld): string | null {
  const location = input.cwd === undefined ? [] : ['-C', input.cwd];
  const result = world.run('git', [...location, 'rev-parse', '--show-toplevel']);
  return result.status === 0 ? result.stdout.replace(/\n+$/u, '') : null;
}

export function selectCaches(root: string, foundPaths: string): string[] {
  return foundPaths
    .split('\n')
    .filter((path) => path.startsWith(`${root}/`))
    .map((path) => path.slice(root.length + 1))
    .filter((path) => path.startsWith(ROOT_CACHE_PREFIX) || path.startsWith(NESTED_CACHE_PREFIX))
    .toSorted();
}

function listCaches(root: string, world: HookWorld): string[] {
  const { stdout } = world.run('find', [
    root,
    `${root}/node_modules/.cache`,
    '-mindepth',
    '1',
    '-maxdepth',
    '1',
    '(',
    '-name',
    `${ROOT_CACHE_PREFIX}*`,
    '-o',
    '-name',
    'eslint*',
    ')',
  ]);
  return selectCaches(root, stdout);
}

export function describeCacheReplay(
  count: number,
  root: string,
  caches: readonly string[],
): string {
  const cacheList = caches.map((cache) => `${cache} `).join('');
  return `[eslint-cache] that run reported ${count} type-aware error(s), and an ESLint cache exists: ${cacheList}

Type-aware rules read the whole type graph; --cache-strategy content keys on
each file's own bytes. So when the types a file DEPENDS ON change — another
workspace, a bumped dependency, a fixed signature elsewhere — the file itself
is unchanged, the cache hits, and the error that is already fixed is replayed.
Re-running reproduces it exactly, which is what makes it read as a real error.

Before treating these as real, settle it in one command:

  (cd "${root}" && rm -rf ${cacheList}) && pnpm run lint

If they survive that, they are real. See
https://github.com/hugoleborso/borso.fr/blob/main/docs/knowledge/eslint-content-cache-replays-a-stale-type-aware-error.md.`;
}

export const eslintCacheReplaysAFixedError: Check = {
  name: 'eslint-cache-replays-a-fixed-error',
  tools: /^Bash$/u,
  run: (input, world) => {
    const command = input.tool_input?.['command'];
    if (typeof command !== 'string' || !isUncachedLintCommand(command)) return PASS;
    const count = countTypeAwareErrors(readToolOutput(input));
    if (count === 0) return PASS;
    const root = readRepositoryRoot(input, world);
    if (root === null) return PASS;
    const caches = listCaches(root, world);
    if (caches.length === 0) return PASS;
    return { kind: 'context', text: describeCacheReplay(count, root, caches) };
  },
};

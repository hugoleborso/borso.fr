import {
  isReadMethod,
  isWrittenRoot,
  WRITTEN_API_ROOTS,
  type WrittenApiRoot,
  type WrittenRoot,
} from '@domain/stale-scope.core';

const PATH_SEPARATOR = '/';
const ROUTE_SEPARATOR = ' ';
const API_SEGMENT = 'api';

export const SILENT_WRITE_PATHS: readonly (readonly string[])[] = [
  ['api', 'admin'],
  ['api', 'assistant-grants'],
  ['api', 'auth'],
  ['api', 'me', 'passkeys'],
  ['api', 'me', 'password'],
  ['api', 'notifications'],
  ['api', 'oauth'],
  ['api', 'takes', 'sign'],
  ['api', 'uploads'],
  ['api', '__test'],
  ['mcp'],
  ['oauth'],
];

function splitPath(path: string): readonly string[] {
  return path.split(PATH_SEPARATOR).filter((segment) => segment.length > 0);
}

function isPrefixOf(prefix: readonly string[], segments: readonly string[]): boolean {
  return prefix.every((expected, index) => expected === segments[index]);
}

// @FollowsBlueprint core-decision
export function isSilentWrite(path: string): boolean {
  const segments = splitPath(path);
  return SILENT_WRITE_PATHS.some((silent) => isPrefixOf(silent, segments));
}

function readWrittenApiRoot(segments: readonly string[]): WrittenApiRoot | null {
  if (segments[0] !== API_SEGMENT) return null;
  const root = segments[1];
  return WRITTEN_API_ROOTS.find((written) => written === root) ?? null;
}

export function selectWrittenRoot(method: string, path: string): WrittenApiRoot | null {
  if (isReadMethod(method) || isSilentWrite(path)) return null;
  return readWrittenApiRoot(splitPath(path));
}

function selectRouteWrittenRoot(route: string): WrittenApiRoot | null {
  const separatorIndex = route.indexOf(ROUTE_SEPARATOR);
  if (separatorIndex === -1) return null;
  return selectWrittenRoot(route.slice(0, separatorIndex), route.slice(separatorIndex + 1));
}

export function mergeWrittenRoots(
  remembered: readonly WrittenRoot[],
  added: readonly WrittenRoot[],
): readonly WrittenRoot[] {
  return [...new Set([...remembered, ...added])];
}

export function selectToolWrittenRoots(tool: {
  readonly routes: readonly string[];
}): readonly WrittenApiRoot[] {
  return [...new Set(tool.routes.flatMap((route) => selectRouteWrittenRoot(route) ?? []))];
}

export function readWrittenRoots(value: unknown): readonly WrittenRoot[] {
  return Array.isArray(value) ? value.filter(isWrittenRoot) : [];
}

const SUCCESS_STATUS_FLOOR = 200;
const SUCCESS_STATUS_CEILING = 299;

export interface AnsweredWrite {
  readonly method: string;
  readonly path: string;
  readonly status: number;
  readonly rememberedRoots: readonly WrittenRoot[];
}

export function selectAnnouncedWrittenRoots(write: AnsweredWrite): readonly WrittenRoot[] {
  const isSuccessful =
    write.status >= SUCCESS_STATUS_FLOOR && write.status <= SUCCESS_STATUS_CEILING;
  if (!isSuccessful) return [];
  if (write.rememberedRoots.length > 0) return write.rememberedRoots;
  const root = selectWrittenRoot(write.method, write.path);
  return root === null ? [] : [root];
}

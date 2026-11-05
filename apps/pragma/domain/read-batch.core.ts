import type { PragmaRequestHeader } from './request-headers.core';

export const READ_BATCH_PATH = '/api/read-batch';
export const MOST_READS_PER_BATCH = 10;
export const MOST_READS_IN_FLIGHT = 2;

const API_PATH_PREFIX = '/api/';
const PATH_SEPARATOR = '/';
const PATH_RESOLUTION_BASE = 'http://read-batch.invalid';
const QUERY_OR_FRAGMENT_START = /[?#]/;
const NOT_FOUND = -1;

export interface BatchedRead {
  readonly path: string;
  readonly headers: Readonly<Partial<Record<PragmaRequestHeader, string>>>;
}

export interface ReadBatch {
  readonly reads: readonly BatchedRead[];
}

export interface BatchedAnswer {
  readonly status: number;
  readonly contentType: string | null;
  readonly body: string;
}

export interface ReadBatchAnswer {
  readonly answers: readonly BatchedAnswer[];
}

function readRawPathname(path: string): string {
  const pathnameEnd = path.search(QUERY_OR_FRAGMENT_START);
  return pathnameEnd === NOT_FOUND ? path : path.slice(0, pathnameEnd);
}

function isReadBatchItself(pathname: string): boolean {
  return pathname === READ_BATCH_PATH || pathname.startsWith(`${READ_BATCH_PATH}${PATH_SEPARATOR}`);
}

// @FollowsBlueprint core-decision
export function isBatchableRead(path: string): boolean {
  if (!path.startsWith(API_PATH_PREFIX)) return false;
  const resolved = new URL(path, PATH_RESOLUTION_BASE);
  const rawPathname = readRawPathname(path);
  if (resolved.pathname !== rawPathname) return false;
  return !isReadBatchItself(rawPathname);
}

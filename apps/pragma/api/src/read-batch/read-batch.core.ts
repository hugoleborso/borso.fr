import type { BatchedAnswer, BatchedRead } from '@domain/read-batch.core';

const READ_METHOD = 'GET';
const OUTER_ONLY_HEADERS: readonly string[] = ['content-type', 'content-length'];

// @FollowsBlueprint core-projection
export function buildItemRequest(
  read: BatchedRead,
  outerUrl: string,
  outerHeaders: Headers,
): Request {
  const headers = new Headers(outerHeaders);
  for (const name of OUTER_ONLY_HEADERS) headers.delete(name);
  for (const [name, value] of Object.entries(read.headers)) headers.set(name, value);
  return new Request(new URL(read.path, outerUrl), { method: READ_METHOD, headers });
}

// @FollowsBlueprint core-projection
export function toBatchedAnswer(
  status: number,
  contentType: string | null,
  body: string,
): BatchedAnswer {
  return { status, contentType, body };
}

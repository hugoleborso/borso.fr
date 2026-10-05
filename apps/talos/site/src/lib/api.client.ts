import type { AppRouter } from '@api/app';
import { hc } from 'hono/client';

const RAW_API_BASE: unknown = import.meta.env.VITE_API_BASE;
const API_BASE: string =
  typeof RAW_API_BASE === 'string' && RAW_API_BASE.length > 0
    ? RAW_API_BASE.replace(/\/$/, '')
    : '';

export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// @FollowsBlueprint typed-api-client
export const api = hc<AppRouter>(API_BASE === '' ? '/' : API_BASE, {
  init: { credentials: 'include' },
});

export function isResponseSuccessful<TResponse extends { readonly ok: boolean }>(
  response: TResponse,
): response is Extract<TResponse, { readonly ok: true }> {
  return response.ok;
}

export async function readFailureBody(response: {
  readonly json: () => Promise<unknown>;
}): Promise<unknown> {
  return await response.json().catch(() => null);
}

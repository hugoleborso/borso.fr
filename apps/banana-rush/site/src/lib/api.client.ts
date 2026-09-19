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
  readonly code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

// @FollowsBlueprint typed-api-client
export const api = hc<AppRouter>(API_BASE === '' ? '/' : API_BASE);

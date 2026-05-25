/**
 * Typed Hono RPC client. End-to-end typed against the back-end's
 * `AppRouter` — request bodies, query params, route params, and JSON
 * responses are all inferred. Every call carries the session cookie
 * because the client is constructed with `credentials: 'include'`.
 *
 * Base URL resolution mirrors the previous hand-rolled client (see
 * docs/knowledge/preview-api-cross-origin.md):
 *  - `VITE_API_BASE` set → preview / cross-origin → calls go to the
 *    per-PR API hostname.
 *  - unset → local `pnpm dev` (Vite proxies /api → :3001) and prod
 *    (per-app CloudFront forwards /api/* same-origin).
 */

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

export const api = hc<AppRouter>(API_BASE === '' ? '/' : API_BASE, {
  init: { credentials: 'include' },
});


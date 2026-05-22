/**
 * Thin fetch wrapper for the pragma API. Every call:
 *  - sends `credentials: 'include'` so the session cookie travels.
 *  - threads `content-type: application/json` automatically when a body
 *    is provided.
 *  - throws a typed `ApiError` carrying the HTTP status + parsed body
 *    on non-2xx so React components can branch on `error.status` (e.g.
 *    redirect to /login on 401).
 *
 * Base URL resolution:
 *  - When `import.meta.env.VITE_API_BASE` is a non-empty string, every
 *    `/api/...` path is rewritten to `<VITE_API_BASE><path>` so previews
 *    hit the per-PR API hostname (`pragma-pr-<n>-api.preview.borso.fr`).
 *    Preview frontends are served by the shared previews CloudFront,
 *    which has no per-PR cache-behavior surface, so same-origin /api
 *    isn't an option there — see docs/knowledge/preview-api-cross-origin.md.
 *  - Otherwise the path is used as-is (relative), which covers:
 *      · local `pnpm dev` — Vite proxies /api to localhost:3001.
 *      · prod — the per-app CloudFront serves the bundle AND forwards
 *        /api/* to the API origin same-origin (PreviewableApp wiring).
 */

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

export interface ApiRequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly body?: unknown;
  readonly signal?: AbortSignal;
}

function resolveApiUrl(path: string): string {
  return API_BASE === '' ? path : `${API_BASE}${path}`;
}

export async function apiRequest(
  path: string,
  options: ApiRequestOptions = {},
): Promise<unknown> {
  const headers: Record<string, string> = {};
  const init: RequestInit = {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers,
  };
  if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }
  if (options.signal !== undefined) init.signal = options.signal;
  const response = await fetch(resolveApiUrl(path), init);
  const contentType = response.headers.get('content-type') ?? '';
  const body: unknown = contentType.includes('application/json')
    ? await response.json()
    : null;
  if (!response.ok) {
    throw new ApiError(response.status, `api ${response.status} on ${path}`, body);
  }
  return body;
}

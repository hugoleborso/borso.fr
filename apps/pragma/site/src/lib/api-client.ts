/**
 * Thin fetch wrapper for the pragma API. Every call:
 *  - sends `credentials: 'include'` so the session cookie travels.
 *  - threads `content-type: application/json` automatically when a body
 *    is provided.
 *  - throws a typed `ApiError` carrying the HTTP status + parsed body
 *    on non-2xx so React components can branch on `error.status` (e.g.
 *    redirect to /login on 401).
 *
 * The base URL is `''` at runtime (Vite proxies `/api` to the dev API).
 */

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
  const response = await fetch(path, init);
  const contentType = response.headers.get('content-type') ?? '';
  const body: unknown = contentType.includes('application/json')
    ? await response.json()
    : null;
  if (!response.ok) {
    throw new ApiError(response.status, `api ${response.status} on ${path}`, body);
  }
  return body;
}

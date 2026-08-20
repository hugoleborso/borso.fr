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

/**
 * @Blueprint typed-api-client
 * @BlueprintName Typed API Client
 * @BlueprintUsage Use for every call a front end makes to its own API. One client per application, built from the router type.
 * @BlueprintDescription Builds the client as `hc<AppRouter>`, so route paths, parameters, request bodies and JSON responses are all read off the back end's router type and a renamed field becomes a compile error in the component that reads it. The base URL is resolved once from the build environment rather than written as a relative `/api` string, because the front end and the API sit on different origins in preview, and `credentials: 'include'` is set here so no caller has to remember the session cookie.
 */
export const api = hc<AppRouter>(API_BASE === '' ? '/' : API_BASE, {
  init: { credentials: 'include' },
});

export function isResponseSuccessful(response: { readonly ok: boolean }): boolean {
  return response.ok;
}

/**
 * The typed Hono client. Request bodies, route parameters, query parameters,
 * and JSON responses are all inferred from the API's `AppType`, so a renamed
 * field on the back end becomes a type error in the component that reads it.
 *
 * Every call carries the session cookie, because the client is built with
 * `credentials: 'include'`.
 */

import type { AppType } from '@api/app';
import { hc } from 'hono/client';
import { composeApiOrigin, composeApiUrl, selectApiBase } from './api-base.utils';
import { readApiBaseSetting } from './environment';

export { ApiError } from './api-error';

const API_BASE = selectApiBase(readApiBaseSetting());

/**
 * Origin to prepend on a direct navigation link, e.g. an anchor pointing at a
 * CSV download. Empty in production, where CloudFront routes `/api/*` on the
 * same origin, and the preview API host name on a preview.
 */
export function apiUrl(pathname: string): string {
  return composeApiUrl(API_BASE, pathname);
}

// @FollowsBlueprint typed-api-client
export const api = hc<AppType>(composeApiOrigin(API_BASE), {
  init: { credentials: 'include' },
});

/**
 * Whether a response succeeded, read through a boolean parameter.
 *
 * A route that declares one success status gives the Hono client an `ok`
 * typed as the literal `true`, which makes the usual `if (!response.ok)`
 * guard look redundant to the type checker even though an unhandled 500
 * still reaches it at runtime. Reading the flag here keeps the guard.
 */
export function isResponseSuccessful(response: { readonly ok: boolean }): boolean {
  return response.ok;
}

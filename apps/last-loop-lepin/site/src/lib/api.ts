import type { AppType } from '@api/app';
import { hc } from 'hono/client';
import { composeApiOrigin, composeApiUrl, selectApiBase } from './api-base.utils';
import { readApiBaseSetting } from './environment';

export { ApiError } from './api-error';

const API_BASE = selectApiBase(readApiBaseSetting());

export function apiUrl(pathname: string): string {
  return composeApiUrl(API_BASE, pathname);
}

// @FollowsBlueprint typed-api-client
export const api = hc<AppType>(composeApiOrigin(API_BASE), {
  init: { credentials: 'include' },
});

export function isResponseSuccessful(response: { readonly ok: boolean }): boolean {
  return response.ok;
}

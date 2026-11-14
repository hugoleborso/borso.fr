import type { AppRouter } from '@api/app';
import { hc } from 'hono/client';
import { selectApiBase } from './api-base.core';

const API_BASE = selectApiBase(import.meta.env.VITE_API_BASE);

function fetchFromBrowser(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, init);
}

export function buildApiClient(fetchFunction: typeof fetch = fetchFromBrowser) {
  return hc<AppRouter>(API_BASE, { init: { credentials: 'include' }, fetch: fetchFunction });
}

export type ApiClient = ReturnType<typeof buildApiClient>;

// @FollowsBlueprint typed-api-client
export const api: ApiClient = buildApiClient();

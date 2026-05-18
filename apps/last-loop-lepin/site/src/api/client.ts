import { hc } from 'hono/client';
import type { AppType } from '@api/app';

export class ApiError extends Error {
  override readonly name = 'ApiError';
  constructor(public readonly status: number, public readonly body: unknown) {
    super(`API ${status}`);
  }
}

function readApiBase(): string {
  const env: Record<string, unknown> = import.meta.env;
  const raw = env.VITE_API_BASE;
  return typeof raw === 'string' ? raw.replace(/\/$/, '') : '';
}
const API_BASE = readApiBase();

const client = hc<AppType>(API_BASE === '' ? '/' : API_BASE, {
  init: { credentials: 'include' },
});

export const apiClient = {
  getCurrentEdition: async () => {
    const response = await client.api.editions.current.$get();
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
  listEditions: async () => {
    const response = await client.api.editions.$get();
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
  getStandings: async (editionSlug: string) => {
    const response = await client.api.standings[':editionSlug'].$get({ param: { editionSlug } });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
  getRunner: async (editionSlug: string, runnerSlug: string) => {
    const response = await client.api.editions[':editionSlug'].runners[':runnerSlug'].$get({
      param: { editionSlug, runnerSlug },
    });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
  listRunners: async (editionSlug: string) => {
    const response = await client.api.editions[':editionSlug'].runners.$get({
      param: { editionSlug },
    });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
  listRunnerPunches: async (editionSlug: string, runnerSlug: string) => {
    const response = await client.api.editions[':editionSlug'].runners[':runnerSlug'].punches.$get({
      param: { editionSlug, runnerSlug },
    });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
  adminLogin: async (pin: string) => {
    const response = await client.api.admin.auth.login.$post({ json: { pin } });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
  adminCreateEdition: async (input: {
    slug: string;
    displayName: string;
    startsAt: string;
    endsAt: string;
    intervalMinutes?: number;
    gpxXml: string;
  }) => {
    const response = await client.api.admin.editions.$post({ json: input });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
  adminReplaceEdition: async (
    slug: string,
    input: {
      displayName: string;
      startsAt: string;
      endsAt: string;
      intervalMinutes?: number;
      gpxXml?: string;
    },
  ) => {
    const response = await client.api.admin.editions[':slug'].$put({ param: { slug }, json: input });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
  adminDeleteEdition: async (slug: string) => {
    const response = await client.api.admin.editions[':slug'].$delete({ param: { slug } });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
  adminTransitionEditionStatus: async (slug: string, status: 'setup' | 'live' | 'finished') => {
    const response = await client.api.admin.editions[':slug'].status.$put({
      param: { slug },
      json: { status },
    });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
  adminCreateRunner: async (input: {
    editionSlug: string;
    slug: string;
    displayName: string;
    photoKey?: string | null;
    bib: number;
  }) => {
    const response = await client.api.admin.runners.$post({ json: input });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
  adminRegisterPunch: async (input: { editionSlug: string; runnerSlug: string }) => {
    const response = await client.api.admin.punches.$post({ json: input });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
  adminVoidPunch: async (id: string) => {
    const response = await client.api.admin.punches[':id'].$delete({ param: { id } });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
  adminRecordDnf: async (input: {
    editionSlug: string;
    runnerSlug: string;
    outAtLoop: number;
    reason: 'late' | 'manual';
  }) => {
    const response = await client.api.admin.dnfs.$post({ json: input });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
  adminCatchupPunch: async (input: { editionSlug: string; runnerSlug: string; loopIndex: number }) => {
    const response = await client.api.admin.punches.catchup.$post({ json: input });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
  adminPresignPhoto: async (input: {
    editionSlug: string;
    runnerSlug: string;
    contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  }) => {
    const response = await client.api.admin.media.presign.$post({ json: input });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
  selfPunch: async (input: {
    editionSlug: string;
    runnerSlug: string;
    clientLat: number | null;
    clientLng: number | null;
    clientAccuracyM: number | null;
  }) => {
    const response = await client.api['self-punches'].$post({ json: input });
    if (!response.ok) throw new ApiError(response.status, await response.json().catch(() => null));
    return response.json();
  },
};

/**
 * Typed fetch wrapper. Same-origin in prod (CloudFront routes /api/*
 * to the Lambda); in dev Vite proxies /api to the local Hono server.
 *
 * Every response is parsed through a Zod schema. The repo's type-assertion
 * plugin bans `as T`, so the narrowing has to happen at runtime — Zod
 * doubles as the trust boundary between server JSON and TS-typed front state.
 */

import { z } from 'zod';

class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: unknown) {
    super(`api error ${status}`);
  }
}

const latLngSchema = z.object({ lat: z.number(), lng: z.number() });

const raceEditionSchema = z.object({
  slug: z.string(),
  displayName: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  sunriseAt: z.string(),
  sunsetAt: z.string(),
  intervalMinutes: z.number(),
  gpx: z.object({
    distanceMeters: z.number(),
    elevationGainMeters: z.number(),
    trackJson: z.object({
      points: z.array(latLngSchema),
      pointTimeFractions: z.array(z.number()).optional(),
      pointElevations: z.array(z.number()).optional(),
    }),
    startLatLng: latLngSchema,
  }),
  status: z.enum(['setup', 'live', 'finished']),
});

const runnerSchema = z.object({
  editionSlug: z.string(),
  slug: z.string(),
  displayName: z.string(),
  photoKey: z.string().nullable(),
  // `photoUrl` is composed server-side from `photoKey` + `PHOTOS_CDN_HOST`.
  // `.default(null)` handles older server responses that omit the key —
  // they land as `null`, same as a runner without a photo. The runtime
  // accepts `string | null | undefined` from the wire; the output type
  // is `string | null` so the front doesn't have to defensively `?? null`
  // at every render site.
  photoUrl: z.string().url().nullable().default(null),
  bib: z.number().nullable(),
});

const runnerStatusSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('in-race'), lastLoop: z.number() }),
  z.object({
    kind: z.literal('dnf'),
    outAtLoop: z.number(),
    reason: z.enum(['late', 'manual']),
  }),
]);

const rankedRunnerSchema = z.object({
  runner: runnerSchema,
  rank: z.union([z.number(), z.literal('ex-aequo')]),
  status: runnerStatusSchema,
  lastLoopDurationMs: z.number().nullable(),
  lastFinishedAt: z.string().nullable(),
});

const standingsSchema = z.object({
  editionSlug: z.string(),
  computedAt: z.string(),
  raceEnded: z.boolean(),
  ranked: z.array(rankedRunnerSchema),
  // Absorb the deploy gap between server shipping the field and client
  // reading it: an older server response that omits the key parses to
  // `fastestLap: []`. The infer-to-`T | undefined` shape that bleeds out
  // of `z.object` is normalised to a guaranteed-array at the snapshot
  // construction site (see `useStandingsPoll.ts`).
  fastestLap: z
    .array(z.object({ runnerSlug: z.string(), durationMs: z.number() }))
    .optional(),
});

const editionEnvelopeSchema = z.object({ edition: raceEditionSchema });
const editionNullableEnvelopeSchema = z.object({ edition: raceEditionSchema.nullable() });
const editionsListEnvelopeSchema = z.object({ editions: z.array(raceEditionSchema) });
const runnerEnvelopeSchema = z.object({ runner: runnerSchema });
const runnersListEnvelopeSchema = z.object({ runners: z.array(runnerSchema) });
const punchSchema = z.object({
  id: z.string(),
  editionSlug: z.string(),
  runnerSlug: z.string(),
  loopIndex: z.number(),
  finishedAt: z.string(),
  correctedAt: z.string().nullable(),
  voidedAt: z.string().nullable(),
  source: z.enum(['admin', 'self']),
  clientLat: z.number().nullable(),
  clientLng: z.number().nullable(),
  clientAccuracyM: z.number().nullable(),
  distanceFromCenterM: z.number().nullable(),
  userAgent: z.string().nullable(),
});

const punchesListSchema = z.object({ punches: z.array(punchSchema) });
const standingsEnvelopeSchema = z.object({
  standings: standingsSchema,
  mostRecentCorrectionAt: z.string().nullable().optional(),
});
const loginResponseSchema = z.object({ expiresAt: z.string() });
const presignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  objectKey: z.string(),
  expiresAt: z.string(),
});
const passthroughSchema = z.unknown();

// `VITE_API_BASE` is baked in at build time. Empty/undefined → same-origin
// (dev: Vite proxies /api → local Hono; prod TBD). Cross-origin previews set
// it to the API custom domain (e.g. `https://<app>-pr-<n>-api.preview.borso.fr`).
function readApiBase(): string {
  const env: Record<string, unknown> = import.meta.env;
  const raw = env.VITE_API_BASE;
  return typeof raw === 'string' ? raw.replace(/\/$/, '') : '';
}
const API_BASE = readApiBase();

function resolveUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE}${path}`;
}

async function fetchUnknown(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(resolveUrl(path), {
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
    ...init,
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body);
  return body;
}

async function fetchJson<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  return schema.parse(await fetchUnknown(path, init));
}

export { ApiError };

export const apiClient = {
  getCurrentEdition: () => fetchJson('/api/editions/current', editionNullableEnvelopeSchema),
  listEditions: () => fetchJson('/api/editions', editionsListEnvelopeSchema),
  getStandings: (editionSlug: string) =>
    fetchJson(`/api/standings/${encodeURIComponent(editionSlug)}`, standingsEnvelopeSchema),
  getRunner: (editionSlug: string, runnerSlug: string) =>
    fetchJson(
      `/api/editions/${encodeURIComponent(editionSlug)}/runners/${encodeURIComponent(runnerSlug)}`,
      runnerEnvelopeSchema,
    ),
  listRunners: (editionSlug: string) =>
    fetchJson(`/api/editions/${encodeURIComponent(editionSlug)}/runners`, runnersListEnvelopeSchema),
  listRunnerPunches: (editionSlug: string, runnerSlug: string) =>
    fetchJson(
      `/api/editions/${encodeURIComponent(editionSlug)}/runners/${encodeURIComponent(runnerSlug)}/punches`,
      punchesListSchema,
    ),
  adminLogin: (pin: string) =>
    fetchJson('/api/admin/auth/login', loginResponseSchema, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),
  adminCreateEdition: (input: {
    slug: string;
    displayName: string;
    startsAt: string;
    endsAt: string;
    intervalMinutes?: number;
    gpxXml: string;
  }) =>
    fetchJson('/api/admin/editions', editionEnvelopeSchema, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  adminReplaceEdition: (
    slug: string,
    input: {
      displayName: string;
      startsAt: string;
      endsAt: string;
      intervalMinutes?: number;
      gpxXml?: string;
    },
  ) =>
    fetchJson(`/api/admin/editions/${encodeURIComponent(slug)}`, editionEnvelopeSchema, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  adminDeleteEdition: (slug: string) =>
    fetchJson(`/api/admin/editions/${encodeURIComponent(slug)}`, passthroughSchema, {
      method: 'DELETE',
    }),
  adminTransitionEditionStatus: (slug: string, status: 'setup' | 'live' | 'finished') =>
    fetchJson(
      `/api/admin/editions/${encodeURIComponent(slug)}/status`,
      passthroughSchema,
      {
        method: 'PUT',
        body: JSON.stringify({ status }),
      },
    ),
  adminCreateRunner: (input: {
    editionSlug: string;
    slug: string;
    displayName: string;
    photoKey?: string | null;
    bib: number;
  }) =>
    fetchJson('/api/admin/runners', runnerEnvelopeSchema, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  adminRegisterPunch: (input: { editionSlug: string; runnerSlug: string }) =>
    fetchJson('/api/admin/punches', passthroughSchema, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  adminVoidPunch: (id: string) =>
    fetchJson(`/api/admin/punches/${encodeURIComponent(id)}`, passthroughSchema, {
      method: 'DELETE',
    }),
  adminRecordDnf: (input: {
    editionSlug: string;
    runnerSlug: string;
    outAtLoop: number;
    reason: 'late' | 'manual';
  }) =>
    fetchJson('/api/admin/dnfs', passthroughSchema, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  adminCatchupPunch: (input: { editionSlug: string; runnerSlug: string; loopIndex: number }) =>
    fetchJson('/api/admin/punches/catchup', passthroughSchema, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  adminPresignPhoto: (input: { editionSlug: string; runnerSlug: string; contentType: string }) =>
    fetchJson('/api/admin/media/presign', presignResponseSchema, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};

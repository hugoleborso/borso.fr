import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { type AuthenticatedApp, jsonRequest, readJson } from './auth-utils';

export const YOUTUBE_VIDEO_ID = 'dQw4w9WgXcQ';

export const inspirationSchema = z.object({
  id: z.guid(),
  youtubeVideoId: z.string(),
  title: z.string(),
  artist: z.string(),
  deezerTrackId: z.string().nullable(),
  deezerAlbumId: z.string().nullable(),
  startSeconds: z.number(),
  endSeconds: z.number(),
  note: z.string(),
  authorMemberId: z.guid().nullable(),
  authorName: z.string().nullable(),
  createdAt: z.string(),
  sketchCount: z.number(),
});
export const inspirationEnvelope = z.object({ inspiration: inspirationSchema });
export const inspirationListEnvelope = z.object({ inspirations: z.array(inspirationSchema) });

const laneSchema = z.object({
  id: z.guid(),
  songId: z.guid(),
  name: z.string(),
  position: z.number(),
});
const clipSchema = z.object({
  id: z.guid(),
  laneId: z.guid(),
  inspirationId: z.guid(),
  offsetSeconds: z.number(),
});
export const laneEnvelope = z.object({ lane: laneSchema });
export const clipEnvelope = z.object({ clip: clipSchema });
export const sketchEnvelope = z.object({
  sketch: z.object({ songId: z.guid(), lanes: z.array(laneSchema), clips: z.array(clipSchema) }),
});
export const errorEnvelope = z.object({ error: z.string() });

const songIdEnvelope = z.object({ song: z.object({ id: z.guid() }) });

export interface InspirationFields {
  readonly title?: string;
  readonly startSeconds?: number;
  readonly endSeconds?: number;
}

export function buildInspirationBody(id: string, fields: InspirationFields = {}) {
  return {
    id,
    youtubeVideoId: YOUTUBE_VIDEO_ID,
    title: fields.title ?? 'Call Me Maybe',
    artist: 'Carly Rae Jepsen',
    deezerTrackId: '1234',
    deezerAlbumId: '5678',
    startSeconds: fields.startSeconds ?? 52,
    endSeconds: fields.endSeconds ?? 64,
    note: 'the trumpet',
  };
}

export function buildInspirationChanges(fields: InspirationFields = {}) {
  const { id: _createdId, ...changes } = buildInspirationBody(randomUUID(), fields);
  return changes;
}

export async function sendJson(
  band: AuthenticatedApp,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<Response> {
  return await jsonRequest(band.app, path, { method, body, cookieHeader: band.cookieHeader });
}

export async function createComposition(band: AuthenticatedApp, title = 'New 7'): Promise<string> {
  const response = await sendJson(band, 'POST', '/api/songs', {
    title,
    status: 'idea',
    origin: 'original',
  });
  return (await readJson(response, songIdEnvelope)).song.id;
}

export async function createInspiration(
  band: AuthenticatedApp,
  fields: InspirationFields = {},
): Promise<string> {
  const response = await sendJson(
    band,
    'POST',
    '/api/inspirations',
    buildInspirationBody(randomUUID(), fields),
  );
  return (await readJson(response, inspirationEnvelope)).inspiration.id;
}

export async function listInspirations(band: AuthenticatedApp) {
  const response = await sendJson(band, 'GET', '/api/inspirations');
  return (await readJson(response, inspirationListEnvelope)).inspirations;
}

export async function createLane(
  band: AuthenticatedApp,
  songId: string,
  name = 'drums',
): Promise<string> {
  const response = await sendJson(band, 'POST', `/api/sketches/${songId}/lanes`, {
    id: randomUUID(),
    name,
    position: 0,
  });
  return (await readJson(response, laneEnvelope)).lane.id;
}

export interface ClipPlacement {
  readonly songId: string;
  readonly laneId: string;
  readonly inspirationId: string;
  readonly offsetSeconds?: number;
}

export async function postClip(
  band: AuthenticatedApp,
  placement: ClipPlacement,
  clipId: string = randomUUID(),
): Promise<Response> {
  return await sendJson(band, 'POST', `/api/sketches/${placement.songId}/clips`, {
    id: clipId,
    laneId: placement.laneId,
    inspirationId: placement.inspirationId,
    offsetSeconds: placement.offsetSeconds ?? 0,
  });
}

export async function placeClip(band: AuthenticatedApp, placement: ClipPlacement): Promise<string> {
  return (await readJson(await postClip(band, placement), clipEnvelope)).clip.id;
}

export async function readSketch(band: AuthenticatedApp, songId: string) {
  const response = await sendJson(band, 'GET', `/api/sketches/${songId}`);
  return (await readJson(response, sketchEnvelope)).sketch;
}

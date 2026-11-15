import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  type AuthenticatedApp,
  buildAuthenticatedApp,
  jsonRequest,
  readJson,
} from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { bandLinkTable } from './band-links.schema';

const PHOTOS_ADDRESS = 'https://drive.example.com/drive/folders/photos';
const VIDEOS_ADDRESS = 'https://drive.example.com/drive/folders/videos';

const bandLinkSchema = z.object({
  id: z.guid(),
  label: z.string(),
  url: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
});
const bandLinkEnvelope = z.object({ bandLink: bandLinkSchema });
const bandLinkListEnvelope = z.object({ bandLinks: z.array(bandLinkSchema) });
const errorEnvelope = z.object({ error: z.string() });

interface BandLinkBody {
  readonly id: string;
  readonly label: string;
  readonly url: string;
}

function buildBandLinkBody(label = 'Photos', url = PHOTOS_ADDRESS): BandLinkBody {
  return { id: randomUUID(), label, url };
}

async function send(
  band: AuthenticatedApp,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<Response> {
  return await jsonRequest(band.app, path, { method, body, cookieHeader: band.cookieHeader });
}

async function listBandLinks(band: AuthenticatedApp) {
  const response = await send(band, 'GET', '/api/band-links');
  return (await readJson(response, bandLinkListEnvelope)).bandLinks;
}

// @FollowsBlueprint test-back-e2e
describe('band links controller (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('rejects every verb without a session cookie', async () => {
    const { app } = await buildAuthenticatedApp();
    const body = buildBandLinkBody();
    expect((await jsonRequest(app, '/api/band-links')).status).toBe(401);
    expect((await jsonRequest(app, '/api/band-links', { method: 'POST', body })).status).toBe(401);
    const deletion = await jsonRequest(app, `/api/band-links/${body.id}`, { method: 'DELETE' });
    expect(deletion.status).toBe(401);
  });

  it('lets any member add a link and lists the links oldest first', async () => {
    const hugo = await buildAuthenticatedApp('Hugo');
    const marc = await buildAuthenticatedApp('Marc');
    const photos = buildBandLinkBody('Photos', PHOTOS_ADDRESS);
    const videos = buildBandLinkBody('Concert videos', VIDEOS_ADDRESS);

    const created = await send(hugo, 'POST', '/api/band-links', photos);
    await send(marc, 'POST', '/api/band-links', videos);

    expect(created.status).toBe(201);
    expect((await readJson(created, bandLinkEnvelope)).bandLink).toEqual(
      expect.objectContaining(photos),
    );
    expect(await listBandLinks(marc)).toEqual([
      expect.objectContaining(photos),
      expect.objectContaining(videos),
    ]);
  });

  it('answers the same link when a create is retried with the same id', async () => {
    const band = await buildAuthenticatedApp();
    const body = buildBandLinkBody();
    const first = await send(band, 'POST', '/api/band-links', body);
    const retry = await send(band, 'POST', '/api/band-links', { ...body, label: 'Retried' });
    expect(retry.status).toBe(201);
    expect((await readJson(retry, bandLinkEnvelope)).bandLink).toEqual(
      (await readJson(first, bandLinkEnvelope)).bandLink,
    );
    expect(await testDatabase().select().from(bandLinkTable)).toHaveLength(1);
  });

  it('refuses an address that is not https and keeps nothing', async () => {
    const band = await buildAuthenticatedApp();
    const refused = [
      buildBandLinkBody('Photos', 'http://drive.example.com/drive/folders/photos'),
      buildBandLinkBody('Photos', 'javascript:alert(1)'),
      buildBandLinkBody('   ', PHOTOS_ADDRESS),
    ];
    const statuses = await Promise.all(
      refused.map(async (body) => (await send(band, 'POST', '/api/band-links', body)).status),
    );
    expect(statuses).toStrictEqual([400, 400, 400]);
    expect(await listBandLinks(band)).toEqual([]);
  });

  it('deletes a link once, then answers that it is not found', async () => {
    const band = await buildAuthenticatedApp();
    const body = buildBandLinkBody();
    await send(band, 'POST', '/api/band-links', body);

    const first = await send(band, 'DELETE', `/api/band-links/${body.id}`);
    const second = await send(band, 'DELETE', `/api/band-links/${body.id}`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(404);
    expect(await readJson(second, errorEnvelope)).toEqual({ error: 'band-link-not-found' });
    expect(await listBandLinks(band)).toEqual([]);
  });
});

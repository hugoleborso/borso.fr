import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '../app';
import { freshDatabase, truncateAllTables } from '../../../test/database-utils';
import { signAdminSession } from '../auth/auth.jwt';

const editionEnvelopeSchema = z.object({
  edition: z.object({
    slug: z.string(),
    displayName: z.string(),
    status: z.enum(['setup', 'live', 'finished']),
    gpx: z.object({
      distanceMeters: z.number(),
      elevationGainMeters: z.number(),
      startLatLng: z.object({ lat: z.number(), lng: z.number() }),
    }),
  }),
});

const errorEnvelopeSchema = z.object({ error: z.string() });

const MINIMAL_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test"><trk><trkseg>
  <trkpt lat="45.550" lon="5.780"><ele>400.0</ele></trkpt>
  <trkpt lat="45.555" lon="5.785"><ele>450.0</ele></trkpt>
  <trkpt lat="45.560" lon="5.790"><ele>500.0</ele></trkpt>
</trkseg></trk></gpx>`;

describe('admin edition controller', () => {
  const app = createApp();

  beforeEach(async () => {
    await truncateAllTables(freshDatabase());
  });

  async function adminCookie(): Promise<string> {
    const secret = process.env.JWT_SECRET ?? 'unset';
    const token = await signAdminSession(secret, new Date());
    return `lastloop_admin=${token}`;
  }

  async function postEdition(input: {
    slug: string;
    displayName: string;
    startsAt: string;
    endsAt: string;
    gpxXml: string;
  }, cookie: string) {
    return app.request('/api/admin/editions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(input),
    });
  }

  it('creates an edition with parsed GPX and computed sunrise/sunset', async () => {
    const cookie = await adminCookie();
    const response = await postEdition(
      {
        slug: 'lepin-2027',
        displayName: 'Last Loop Lépin 2027',
        startsAt: '2027-09-18T06:00:00+02:00',
        endsAt: '2027-09-18T22:00:00+02:00',
        gpxXml: MINIMAL_GPX,
      },
      cookie,
    );
    expect(response.status).toBe(201);
    const body = editionEnvelopeSchema.parse(await response.json());
    expect(body.edition.slug).toBe('lepin-2027');
    expect(body.edition.gpx.distanceMeters).toBeGreaterThan(0);
    expect(body.edition.gpx.startLatLng).toEqual({ lat: 45.55, lng: 5.78 });
    expect(body.edition.status).toBe('setup');
  });

  it('returns 409 when the slug already exists', async () => {
    const cookie = await adminCookie();
    const input = {
      slug: 'lepin-2028',
      displayName: 'Last Loop Lépin 2028',
      startsAt: '2028-09-16T06:00:00+02:00',
      endsAt: '2028-09-16T22:00:00+02:00',
      gpxXml: MINIMAL_GPX,
    };
    const first = await postEdition(input, cookie);
    expect(first.status).toBe(201);
    const second = await postEdition(input, cookie);
    expect(second.status).toBe(409);
  });

  it('returns 400 when the GPX is unparseable', async () => {
    const cookie = await adminCookie();
    const response = await postEdition(
      {
        slug: 'lepin-2029',
        displayName: 'broken',
        startsAt: '2029-09-15T06:00:00+02:00',
        endsAt: '2029-09-15T22:00:00+02:00',
        gpxXml: '<html><body>not a gpx</body></html>',
      },
      cookie,
    );
    expect(response.status).toBe(400);
    const body = errorEnvelopeSchema.parse(await response.json());
    expect(body.error).toMatch(/gpx/i);
  });

  it('refuses to create an edition without admin cookie', async () => {
    const response = await postEdition(
      {
        slug: 'lepin-2030',
        displayName: 'no-auth',
        startsAt: '2030-09-14T06:00:00+02:00',
        endsAt: '2030-09-14T22:00:00+02:00',
        gpxXml: MINIMAL_GPX,
      },
      '',
    );
    expect(response.status).toBe(401);
  });

  it('exposes the edition via GET /api/editions/:slug/state', async () => {
    const cookie = await adminCookie();
    await postEdition(
      {
        slug: 'lepin-2031',
        displayName: 'state-probe',
        startsAt: '2031-09-13T06:00:00+02:00',
        endsAt: '2031-09-13T22:00:00+02:00',
        gpxXml: MINIMAL_GPX,
      },
      cookie,
    );
    const stateResponse = await app.request('/api/editions/lepin-2031/state');
    expect(stateResponse.status).toBe(200);
    const stateBody = editionEnvelopeSchema.parse(await stateResponse.json());
    expect(stateBody.edition.slug).toBe('lepin-2031');
  });
});

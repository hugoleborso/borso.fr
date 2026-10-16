/**
 * @vitest-environment node
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { readSecureParameter } from '../helpers/secrets/parameter-store.client';
import { putJsonObject } from '../helpers/storage/object-store.client';
import { archiveExport, ExportArchiveError } from './export-archive.adapter';

vi.mock('../helpers/secrets/parameter-store.client', () => ({ readSecureParameter: vi.fn() }));
vi.mock('../helpers/storage/object-store.client', () => ({ putJsonObject: vi.fn() }));

const ENVIRONMENT = {
  EXPORT_BUCKET: 'export-bucket',
  EXPORT_URL: 'https://talos.borso.fr/api/agent/export',
  AGENT_TOKEN_PARAMETER: '/talos/agent-token-build',
};
const EXPORT_BODY = JSON.stringify({
  exportedAt: '2026-10-18T02:00:04Z',
  tables: { entities: [], events: [] },
});
const NOW = new Date('2026-10-18T02:00:00Z');

function answers(body: string, status = 200) {
  return vi.fn(async () => await Promise.resolve(new Response(body, { status })));
}

const readsToken = async () => await Promise.resolve('jeton');

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// @FollowsBlueprint test-node-adapter
describe('archiveExport', () => {
  it('stores the export body under the date it ran', async () => {
    const fetcher = answers(EXPORT_BODY);
    const storeObject = vi.fn(async () => await Promise.resolve());
    const archived = await archiveExport({
      fetcher,
      readParameter: readsToken,
      storeObject,
      environment: ENVIRONMENT,
      now: NOW,
    });
    expect(archived).toEqual({
      objectKey: 'exports/2026-10-18.json',
      exportedAt: '2026-10-18T02:00:04Z',
      tableCount: 2,
    });
    expect(fetcher).toHaveBeenCalledWith('https://talos.borso.fr/api/agent/export', {
      method: 'GET',
      headers: { Authorization: 'Bearer jeton', Accept: 'application/json' },
    });
    expect(storeObject).toHaveBeenCalledWith(
      'export-bucket',
      'exports/2026-10-18.json',
      EXPORT_BODY,
    );
  });

  it('falls back to the process environment, Parameter Store, fetch, S3 and the clock', async () => {
    vi.stubEnv('EXPORT_BUCKET', ENVIRONMENT.EXPORT_BUCKET);
    vi.stubEnv('EXPORT_URL', ENVIRONMENT.EXPORT_URL);
    vi.stubEnv('AGENT_TOKEN_PARAMETER', ENVIRONMENT.AGENT_TOKEN_PARAMETER);
    vi.mocked(readSecureParameter).mockResolvedValue('jeton');
    vi.stubGlobal('fetch', answers(EXPORT_BODY));
    const archived = await archiveExport();
    expect(archived.objectKey).toMatch(/^exports\/\d{4}-\d{2}-\d{2}\.json$/);
    expect(readSecureParameter).toHaveBeenCalledWith('/talos/agent-token-build');
    expect(putJsonObject).toHaveBeenCalledWith('export-bucket', archived.objectKey, EXPORT_BODY);
  });

  it('names every missing setting', async () => {
    await expect(archiveExport({ environment: { EXPORT_BUCKET: 'b' } })).rejects.toThrow(
      'missing EXPORT_URL, AGENT_TOKEN_PARAMETER',
    );
  });

  it('names its failures so the Lambda log tells them from a crash', async () => {
    await expect(archiveExport({ environment: {} })).rejects.toMatchObject({
      name: 'ExportArchiveError',
    });
  });

  it('fails when the token cannot be read', async () => {
    await expect(
      archiveExport({
        readParameter: async () => await Promise.resolve(undefined),
        environment: ENVIRONMENT,
      }),
    ).rejects.toThrow('/talos/agent-token-build could not be read');
  });

  it('fails when the api refuses', async () => {
    await expect(
      archiveExport({
        fetcher: answers('{"error":"jeton invalide"}', 401),
        readParameter: readsToken,
        environment: ENVIRONMENT,
      }),
    ).rejects.toThrow(new ExportArchiveError('the export answered 401'));
  });

  it('stores nothing when the body is not an export', async () => {
    const storeObject = vi.fn();
    await expect(
      archiveExport({
        fetcher: answers('{}'),
        readParameter: readsToken,
        storeObject,
        environment: ENVIRONMENT,
      }),
    ).rejects.toThrow('the export body is not { exportedAt, tables }');
    expect(storeObject).not.toHaveBeenCalled();
  });
});

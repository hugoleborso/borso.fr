import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from './app';

const TEST_SEED_FLAG = 'ALLOW_TEST_SEED';

// @FollowsBlueprint test-back-e2e
describe('createApp — test-seed routing flag', () => {
  const originalFlag = process.env[TEST_SEED_FLAG];

  beforeAll(() => {
    delete process.env[TEST_SEED_FLAG];
  });

  afterAll(() => {
    if (originalFlag === undefined) {
      delete process.env[TEST_SEED_FLAG];
    } else {
      process.env[TEST_SEED_FLAG] = originalFlag;
    }
  });

  afterEach(() => {
    delete process.env[TEST_SEED_FLAG];
  });

  it('returns 404 on /api/__test/seed when the flag is absent', async () => {
    const app = createApp();
    const response = await app.request('/api/__test/seed', { method: 'POST' });
    expect(response.status).toBe(404);
  });

  it('returns 404 on /api/__test/seed when the flag is set to a non-"1" value', async () => {
    process.env[TEST_SEED_FLAG] = 'true';
    const app = createApp();
    const response = await app.request('/api/__test/seed', { method: 'POST' });
    expect(response.status).toBe(404);
  });

  it('mounts /api/__test/seed (non-404) when the flag is "1"', async () => {
    process.env[TEST_SEED_FLAG] = '1';
    const app = createApp();
    const response = await app.request('/api/__test/seed?fixture=race-down-to-one-survivor', {
      method: 'POST',
    });
    expect(response.status).not.toBe(404);
  });

  it('always serves /api/health', async () => {
    const app = createApp();
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });
});

describe('createApp — wide event', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes one wide event for a request through the composition root', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await createApp().request('/api/health');

    const writtenEvents = write.mock.calls.map(([line]) => {
      const writtenEvent: unknown = JSON.parse(String(line));
      return writtenEvent;
    });
    expect(writtenEvents).toEqual([
      expect.objectContaining({
        'service.name': 'last-loop-lepin-api',
        'event.kind': 'http',
        'http.route': '/api/health',
        'http.response.status_code': 200,
        outcome: 'success',
      }),
    ]);
  });
});

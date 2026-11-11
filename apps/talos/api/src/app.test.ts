import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app';

describe('the talos api', () => {
  it('answers the health check without a session', async () => {
    const response = await createApp().request('/api/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
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
        'service.name': 'talos-api',
        'event.kind': 'http',
        'http.route': '/api/health',
        'http.response.status_code': 200,
        outcome: 'success',
      }),
    ]);
  });
});

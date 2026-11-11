import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app';

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
        'service.name': 'banana-rush-api',
        'event.kind': 'http',
        'http.route': '/api/health',
        'http.response.status_code': 200,
        outcome: 'success',
      }),
    ]);
  });
});

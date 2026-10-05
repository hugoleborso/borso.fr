import { describe, expect, it } from 'vitest';
import { createApp } from './app';

describe('the talos api', () => {
  it('answers the health check without a session', async () => {
    const response = await createApp().request('/api/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});

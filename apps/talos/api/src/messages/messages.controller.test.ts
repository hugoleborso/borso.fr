import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTestContext, requestJson, signIn } from '../../../test/app-utils';
import { truncateAllTables } from '../../../test/database-utils';

beforeEach(async () => {
  await truncateAllTables();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-05T08:12:30Z'));
  return () => {
    vi.useRealTimers();
  };
});

// @FollowsBlueprint test-back-e2e
describe('POST /api/messages', () => {
  it('drops the message in the inbox under its Paris timestamp', async () => {
    const { app, overlay } = buildTestContext({});
    const response = await requestJson(app, '/api/messages', {
      method: 'POST',
      body: { text: 'Rappelle-moi Julie' },
      cookie: await signIn(),
    });
    expect(await response.json()).toEqual({ ok: true });
    expect(overlay.get('boite/messages/2026-10-05-101230.md')).toBe(
      '---\norigine: pwa\ndate: 2026-10-05T08:12:30.000Z\n---\n\nRappelle-moi Julie\n',
    );
  });

  it('refuses an empty message', async () => {
    const { app } = buildTestContext({});
    const response = await requestJson(app, '/api/messages', {
      method: 'POST',
      body: { text: '  ' },
      cookie: await signIn(),
    });
    expect(response.status).toBe(400);
  });
});

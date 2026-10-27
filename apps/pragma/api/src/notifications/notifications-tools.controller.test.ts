import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { jsonRequest, readJson } from '../../../test/auth-utils';
import { callTool, prepareAssistantBand, useAssistantToolSuite } from '../../../test/mcp-utils';

const preferencesBodySchema = z.object({
  preferences: z.array(z.object({ category: z.string(), enabled: z.boolean() })),
});

function readEnabled(body: unknown, category: string): boolean | undefined {
  return preferencesBodySchema
    .parse(body)
    .preferences.find((preference) => preference.category === category)?.enabled;
}

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('notifications tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('turns a category off for the granting member only', async () => {
    const band = await prepareAssistantBand();

    const before = await callTool(band.assistant, 'get_notification_preferences');
    const turned = await callTool(band.assistant, 'set_notification_preference', {
      category: 'takes',
      enabled: false,
    });
    const after = await callTool(band.assistant, 'get_notification_preferences');
    const lea = await readJson(
      await jsonRequest(band.lea.app, '/api/notifications/preferences', {
        cookieHeader: band.lea.cookieHeader,
      }),
      preferencesBodySchema,
    );

    expect(readEnabled(before.body, 'takes')).toBe(true);
    expect(readEnabled(turned.body, 'takes')).toBe(false);
    expect(readEnabled(after.body, 'takes')).toBe(false);
    expect(readEnabled(lea, 'takes')).toBe(true);
  });
});

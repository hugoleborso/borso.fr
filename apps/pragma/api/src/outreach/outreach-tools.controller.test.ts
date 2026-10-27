import { describe, expect, it } from 'vitest';
import { jsonRequest, readJson } from '../../../test/auth-utils';
import { callTool, prepareAssistantBand, useAssistantToolSuite } from '../../../test/mcp-utils';
import { z } from 'zod';

const templateBodySchema = z.object({ body: z.string().nullable() });
const TEMPLATE = 'Bonjour, we are pragma and we would love to play at your bar.';

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('outreach tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('reads no template, saves one, and the app reads the saved one', async () => {
    const band = await prepareAssistantBand();

    const before = await callTool(band.assistant, 'get_outreach_template');
    const saved = await callTool(band.assistant, 'save_outreach_template', { body: TEMPLATE });
    const seenByLea = await readJson(
      await jsonRequest(band.lea.app, '/api/outreach/template', {
        cookieHeader: band.lea.cookieHeader,
      }),
      templateBodySchema,
    );

    expect(before).toEqual({ isError: false, body: { body: null } });
    expect(saved).toEqual({ isError: false, body: { body: TEMPLATE } });
    expect(seenByLea.body).toBe(TEMPLATE);
  });
});

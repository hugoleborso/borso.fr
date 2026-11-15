import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { jsonRequest, readJson } from '../../../test/auth-utils';
import {
  callTool,
  prepareAssistantBand,
  refusal,
  useAssistantToolSuite,
} from '../../../test/mcp-utils';

const PHONE = '+33 6 12 34 56 78';

const signedInMemberSchema = z.object({
  memberId: z.string(),
  firstName: z.string(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('me tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('reads the granting member, and changes only their own contact details', async () => {
    const band = await prepareAssistantBand();

    const signedIn = signedInMemberSchema.parse((await callTool(band.assistant, 'get_me')).body);
    const updated = await callTool(band.assistant, 'update_me', { phone: PHONE });
    const lea = await readJson(
      await jsonRequest(band.lea.app, '/api/me', { cookieHeader: band.lea.cookieHeader }),
      signedInMemberSchema,
    );

    expect(signedIn).toMatchObject({ memberId: band.hugo.memberId, firstName: 'Hugo' });
    expect(updated).toEqual({
      isError: false,
      body: { id: band.hugo.memberId, updated: ['phone'] },
    });
    expect(lea.phone).toBeNull();
  });

  it('reads the flames in get_me from the band’s session days', async () => {
    const band = await prepareAssistantBand();

    const profile = await callTool(band.assistant, 'get_me');

    expect(profile.body).toMatchObject({
      memberId: band.hugo.memberId,
      studies: { queue: [] },
      flames: {
        mine: { days: 0, isTodayCounted: false },
        band: { days: 0, isTodayCounted: false },
      },
    });
  });

  it('refuses an empty update, and a key it does not know', async () => {
    const band = await prepareAssistantBand();

    expect(await callTool(band.assistant, 'update_me')).toEqual(refusal('empty-update'));
    expect(
      await callTool(band.assistant, 'update_me', {
        phone: PHONE,
        study: { song: 'Creep', instrument: 'Guitar' },
      }),
    ).toEqual({
      isError: true,
      body: 'MCP error -32602: Input validation error: Invalid arguments for tool update_me: Unrecognized key: "study"',
    });
    expect(signedInMemberSchema.parse((await callTool(band.assistant, 'get_me')).body).phone).toBe(
      undefined,
    );
  });
});

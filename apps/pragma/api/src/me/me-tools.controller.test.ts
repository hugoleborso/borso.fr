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
    const updated = await callTool(band.assistant, 'update_my_contact', { phone: PHONE });
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

  it('answers empty-update when no contact field is given, as the route does', async () => {
    const band = await prepareAssistantBand();

    expect(await callTool(band.assistant, 'update_my_contact')).toEqual(refusal('empty-update'));
  });
});

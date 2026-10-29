import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  callTool,
  prepareAssistantBand,
  refusal,
  seedInstrument,
  useAssistantToolSuite,
} from '../../../test/mcp-utils';

const membersBodySchema = z.object({
  members: z.array(
    z.object({
      id: z.string().uuid(),
      firstName: z.string(),
      instruments: z.array(z.string()),
      main: z.array(z.string()).optional(),
    }),
  ),
});

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('members tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('gives a member an instrument by name, and lists the members with what each plays', async () => {
    const band = await prepareAssistantBand();
    await seedInstrument(band.hugo, { name: 'Keys', family: 'harmonic' });

    const assigned = await callTool(band.assistant, 'set_member_instruments', {
      member: 'lea',
      instruments: ['keys'],
      main: ['Keys'],
    });
    const listed = membersBodySchema.parse((await callTool(band.assistant, 'list_members')).body);

    expect(assigned).toEqual({
      isError: false,
      body: { id: band.lea.memberId, instruments: ['keys'] },
    });
    expect(listed.members).toContainEqual(
      expect.objectContaining({ firstName: 'Léa', instruments: ['Keys'], main: ['Keys'] }),
    );
    expect(listed.members.map((listedMember) => listedMember.firstName)).toEqual(['Hugo', 'Léa']);
  });

  it('answers the refusal codes the route answers, and names a reference nothing matches', async () => {
    const band = await prepareAssistantBand();
    const unknownId = randomUUID();

    expect(
      await callTool(band.assistant, 'set_member_instruments', {
        member: unknownId,
        instruments: [],
      }),
    ).toEqual(refusal('not-found'));
    expect(
      await callTool(band.assistant, 'set_member_instruments', {
        member: 'Léa',
        instruments: ['Theremin'],
      }),
    ).toEqual({ isError: true, body: { error: 'instrument-not-found', reference: 'Theremin' } });
    expect(
      await callTool(band.assistant, 'set_member_instruments', {
        member: 'Ghost',
        instruments: [],
      }),
    ).toEqual({ isError: true, body: { error: 'member-not-found', reference: 'Ghost' } });
  });
});

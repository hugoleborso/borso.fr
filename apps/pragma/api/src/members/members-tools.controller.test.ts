import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  callTool,
  prepareAssistantBand,
  refusal,
  useAssistantToolSuite,
} from '../../../test/mcp-utils';

const createdSchema = z.object({ id: z.string().uuid(), firstName: z.string() });
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

  it('adds a member, renames them, gives them an instrument by name, then removes them', async () => {
    const band = await prepareAssistantBand();
    await callTool(band.assistant, 'create_instrument', { name: 'Keys', family: 'harmonic' });

    const member = createdSchema.parse(
      (await callTool(band.assistant, 'create_member', { firstName: 'Tom' })).body,
    );
    const renamed = await callTool(band.assistant, 'update_member', {
      member: 'tom',
      firstName: 'Thomas',
    });
    const assigned = await callTool(band.assistant, 'set_member_instruments', {
      member: 'Thomas',
      instruments: ['keys'],
      main: ['Keys'],
    });
    const listed = membersBodySchema.parse((await callTool(band.assistant, 'list_members')).body);
    const removed = await callTool(band.assistant, 'delete_member', { member: member.id });
    const remaining = membersBodySchema.parse(
      (await callTool(band.assistant, 'list_members')).body,
    );

    expect(renamed).toEqual({ isError: false, body: { id: member.id, updated: ['firstName'] } });
    expect(assigned).toEqual({ isError: false, body: { id: member.id, instruments: ['keys'] } });
    expect(listed.members).toContainEqual(
      expect.objectContaining({ firstName: 'Thomas', instruments: ['Keys'], main: ['Keys'] }),
    );
    expect(listed.members.map((listedMember) => listedMember.firstName)).toEqual([
      'Hugo',
      'Léa',
      'Thomas',
    ]);
    expect(removed).toEqual({ isError: false, body: { id: member.id, deleted: true } });
    expect(remaining.members.map((listedMember) => listedMember.id)).not.toContain(member.id);
  });

  it('answers the refusal codes the routes answer, and names a reference nothing matches', async () => {
    const band = await prepareAssistantBand();
    const unknownId = randomUUID();

    expect(await callTool(band.assistant, 'update_member', { member: 'Léa' })).toEqual(
      refusal('empty-update'),
    );
    expect(
      await callTool(band.assistant, 'update_member', { member: unknownId, firstName: 'Ghost' }),
    ).toEqual(refusal('not-found'));
    expect(await callTool(band.assistant, 'delete_member', { member: unknownId })).toEqual(
      refusal('not-found'),
    );
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
    expect(await callTool(band.assistant, 'delete_member', { member: 'Ghost' })).toEqual({
      isError: true,
      body: { error: 'member-not-found', reference: 'Ghost' },
    });
  });
});

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  callTool,
  prepareAssistantBand,
  refusal,
  useAssistantToolSuite,
} from '../../../test/mcp-utils';

const memberSchema = z.object({ id: z.string().uuid(), firstName: z.string() });
const memberBodySchema = z.object({ member: memberSchema });
const membersBodySchema = z.object({ members: z.array(memberSchema) });
const instrumentBodySchema = z.object({ instrument: z.object({ id: z.string().uuid() }) });
const memberInstrumentsBodySchema = z.object({
  instruments: z.array(z.object({ id: z.string(), isPrimary: z.boolean() })),
});

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('members tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('adds a member, renames them, gives them an instrument, then removes them', async () => {
    const band = await prepareAssistantBand();
    const instrumentId = instrumentBodySchema.parse(
      (await callTool(band.assistant, 'create_instrument', { name: 'Keys', family: 'harmonic' }))
        .body,
    ).instrument.id;

    const created = await callTool(band.assistant, 'create_member', { firstName: 'Tom' });
    const { member } = memberBodySchema.parse(created.body);
    const renamed = await callTool(band.assistant, 'update_member', {
      id: member.id,
      firstName: 'Thomas',
    });
    const assigned = await callTool(band.assistant, 'set_member_instruments', {
      id: member.id,
      instrumentIds: [instrumentId],
      primaryInstrumentIds: [instrumentId],
    });
    const instruments = memberInstrumentsBodySchema.parse(
      (await callTool(band.assistant, 'list_member_instruments', { id: member.id })).body,
    );
    const listed = membersBodySchema.parse((await callTool(band.assistant, 'list_members')).body);
    const removed = await callTool(band.assistant, 'delete_member', { id: member.id });
    const remaining = membersBodySchema.parse(
      (await callTool(band.assistant, 'list_members')).body,
    );

    expect(memberBodySchema.parse(renamed.body).member.firstName).toBe('Thomas');
    expect(assigned).toEqual({
      isError: false,
      body: { id: member.id, instrumentIds: [instrumentId] },
    });
    expect(instruments.instruments).toEqual([{ id: instrumentId, isPrimary: true }]);
    expect(listed.members.map((listedMember) => listedMember.firstName)).toEqual([
      'Hugo',
      'Léa',
      'Thomas',
    ]);
    expect(removed).toEqual({ isError: false, body: { id: member.id, deleted: true } });
    expect(remaining.members.map((listedMember) => listedMember.id)).not.toContain(member.id);
  });

  it('answers the refusal codes the routes answer', async () => {
    const band = await prepareAssistantBand();
    const unknownId = randomUUID();

    expect(await callTool(band.assistant, 'update_member', { id: band.lea.memberId })).toEqual(
      refusal('empty-update'),
    );
    expect(
      await callTool(band.assistant, 'update_member', { id: unknownId, firstName: 'Ghost' }),
    ).toEqual(refusal('not-found'));
    expect(await callTool(band.assistant, 'delete_member', { id: unknownId })).toEqual(
      refusal('not-found'),
    );
    expect(
      await callTool(band.assistant, 'set_member_instruments', {
        id: unknownId,
        instrumentIds: [],
      }),
    ).toEqual(refusal('not-found'));
    expect(
      await callTool(band.assistant, 'set_member_instruments', {
        id: band.lea.memberId,
        instrumentIds: [unknownId],
      }),
    ).toEqual(refusal('instrument-not-found'));
  });
});

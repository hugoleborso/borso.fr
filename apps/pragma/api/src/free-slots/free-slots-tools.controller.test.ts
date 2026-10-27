import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { callTool, prepareAssistantBand, useAssistantToolSuite } from '../../../test/mcp-utils';

const freeSlotsBodySchema = z.object({
  slots: z.array(z.object({ start: z.string().datetime(), end: z.string().datetime() })),
  excludedMembers: z.array(z.object({ memberId: z.string(), reason: z.string() })),
});

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('free slots tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('answers the free slots from the assistant clock, listing members without a calendar feed', async () => {
    const band = await prepareAssistantBand();

    const listed = await callTool(band.assistant, 'list_free_slots');
    const { slots, excludedMembers } = freeSlotsBodySchema.parse(listed.body);
    const [firstSlot] = slots;

    expect(listed.isError).toBe(false);
    expect(excludedMembers).toEqual(
      expect.arrayContaining([
        { memberId: band.hugo.memberId, reason: 'no-calendar' },
        { memberId: band.lea.memberId, reason: 'no-calendar' },
      ]),
    );
    expect(new Date(firstSlot?.start ?? 0).getTime()).toBeGreaterThanOrEqual(
      band.harness.clock.now.getTime(),
    );
  });
});

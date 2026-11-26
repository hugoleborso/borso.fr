import { randomUUID } from 'node:crypto';
import { asc } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { testDatabase } from '../../../test/database-utils';
import {
  callTool,
  prepareAssistantBand,
  refusal,
  useAssistantToolSuite,
} from '../../../test/mcp-utils';
import { gearItemTable } from './gear-items.schema';

const createdSchema = z.object({ id: z.guid() });
const CONCERT_DATE = '2099-06-21T20:00:00.000Z';
const PRACTICE_DATE = '2099-06-14T19:00:00.000Z';

async function readStoredItems() {
  return await testDatabase()
    .select({
      label: gearItemTable.label,
      status: gearItemTable.status,
      memberId: gearItemTable.memberId,
    })
    .from(gearItemTable)
    .orderBy(asc(gearItemTable.position));
}

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('gear item tools (back-e2e)', () => {
  useAssistantToolSuite();

  it('adds, changes, reads and deletes gear items by name, as the routes do', async () => {
    const band = await prepareAssistantBand();
    await callTool(band.assistant, 'save_session', {
      kind: 'concert',
      date: CONCERT_DATE,
      venue: 'Akanaboum',
      capacity: 200,
    });

    const sono = createdSchema.parse(
      (
        await callTool(band.assistant, 'save_gear_item', {
          session: 'next-concert',
          label: 'Sono',
          holder: 'venue',
        })
      ).body,
    );
    await callTool(band.assistant, 'save_gear_item', {
      session: 'next-concert',
      label: 'Ampli basse',
      holder: 'me',
    });
    await callTool(band.assistant, 'save_gear_item', {
      session: 'next-concert',
      label: 'Multiprise',
    });
    const updated = await callTool(band.assistant, 'save_gear_item', {
      session: 'next-concert',
      item: 'multiprise',
      holder: 'Léa',
    });
    const read = await callTool(band.assistant, 'get_session', { session: 'next-concert' });
    const deleted = await callTool(band.assistant, 'delete', { kind: 'gear_item', id: 'Sono' });

    expect(updated).toMatchObject({ isError: false, body: { updated: ['status', 'memberId'] } });
    expect(read.body).toMatchObject({
      session: {
        gear: [
          { label: 'Sono', holder: 'venue' },
          { label: 'Ampli basse', holder: 'Hugo' },
          { label: 'Multiprise', holder: 'Léa' },
        ],
      },
    });
    expect(deleted).toEqual({ isError: false, body: { id: sono.id, deleted: true } });
    expect(await readStoredItems()).toEqual([
      { label: 'Ampli basse', status: 'have', memberId: band.hugo.memberId },
      { label: 'Multiprise', status: 'have', memberId: band.lea.memberId },
    ]);
  });

  it('reads no gear on a practice, and refuses an item on one', async () => {
    const band = await prepareAssistantBand();
    await callTool(band.assistant, 'save_session', { kind: 'practice', date: PRACTICE_DATE });

    const read = await callTool(band.assistant, 'get_session', { session: 'next-practice' });
    const added = await callTool(band.assistant, 'save_gear_item', {
      session: 'next-practice',
      label: 'Sono',
    });

    expect(read.body).toMatchObject({ session: { kind: 'practice' } });
    expect(read.body).not.toHaveProperty('session.gear');
    expect(added).toEqual(refusal('not-a-concert'));
  });

  it('answers the refusal codes the routes answer', async () => {
    const band = await prepareAssistantBand();
    await callTool(band.assistant, 'save_session', {
      kind: 'concert',
      date: CONCERT_DATE,
      venue: 'Akanaboum',
      capacity: 200,
    });
    await callTool(band.assistant, 'save_gear_item', { session: 'next-concert', label: 'Sono' });

    const missingLabel = await callTool(band.assistant, 'save_gear_item', {
      session: 'next-concert',
    });
    const unknownMember = await callTool(band.assistant, 'save_gear_item', {
      session: 'next-concert',
      label: 'Ampli',
      holder: 'Marc',
    });
    const emptyUpdate = await callTool(band.assistant, 'save_gear_item', {
      session: 'next-concert',
      item: 'Sono',
    });
    const unknownItem = await callTool(band.assistant, 'save_gear_item', {
      session: 'next-concert',
      item: randomUUID(),
      label: 'Ghost',
    });
    const missingDelete = await callTool(band.assistant, 'delete', {
      kind: 'gear_item',
      id: randomUUID(),
    });

    expect(missingLabel).toEqual({
      isError: true,
      body: {
        error: 'invalid-input',
        fields: { label: 'Invalid input: expected string, received undefined' },
      },
    });
    expect(unknownMember).toEqual({
      isError: true,
      body: { error: 'member-not-found', reference: 'Marc' },
    });
    expect(emptyUpdate).toEqual(refusal('empty-update'));
    expect(unknownItem).toEqual(refusal('not-found'));
    expect(missingDelete).toEqual(refusal('not-found'));
  });
});

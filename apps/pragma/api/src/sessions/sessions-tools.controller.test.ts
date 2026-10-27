import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import {
  callTool,
  passNotificationGroupWindow,
  prepareAssistantBand,
  useOAuthOrigins,
} from '../../../test/mcp-utils';
import { deviceEndpoint, readSentNotifications } from '../../../test/push-utils';
import { sessionTable } from './sessions.schema';

const PRACTICE_DATE = '2026-11-03T19:00:00.000Z';
const MOVED_PRACTICE_DATE = '2026-11-04T19:30:00.000Z';

const sessionBodySchema = z.object({
  session: z.object({ id: z.string().uuid(), kind: z.string(), date: z.string() }).passthrough(),
});
const sessionsBodySchema = z.object({
  sessions: z.array(z.object({ id: z.string().uuid(), kind: z.string() })),
});

async function readSessionRow(id: string) {
  const rows = await testDatabase().select().from(sessionTable).where(eq(sessionTable.id, id));
  return rows[0];
}

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('sessions tools (back-e2e)', () => {
  useOAuthOrigins();

  beforeEach(async () => {
    await truncateAllTables(testDatabase());
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates, reads, lists, updates and deletes a session as the routes do', async () => {
    const band = await prepareAssistantBand();

    const created = sessionBodySchema.parse(
      (
        await callTool(band.assistant, 'create_session', {
          session: { kind: 'practice', date: PRACTICE_DATE },
        })
      ).body,
    );
    const read = sessionBodySchema.parse(
      (await callTool(band.assistant, 'get_session', { id: created.session.id })).body,
    );
    const listed = sessionsBodySchema.parse((await callTool(band.assistant, 'list_sessions')).body);
    const updated = sessionBodySchema.parse(
      (
        await callTool(band.assistant, 'update_session', {
          id: created.session.id,
          changes: { date: MOVED_PRACTICE_DATE },
        })
      ).body,
    );
    const stored = await readSessionRow(created.session.id);
    const deleted = await callTool(band.assistant, 'delete_session', { id: created.session.id });

    expect(read.session.kind).toBe('practice');
    expect(listed.sessions.map((session) => session.id)).toEqual([created.session.id]);
    expect(updated.session.date).toBe(MOVED_PRACTICE_DATE);
    expect(stored?.date.toISOString()).toBe(MOVED_PRACTICE_DATE);
    expect(deleted).toEqual({ isError: false, body: { id: created.session.id, deleted: true } });
    expect(await readSessionRow(created.session.id)).toBeUndefined();
  });

  it('creates a concert with the fields the route requires', async () => {
    const band = await prepareAssistantBand();

    const created = sessionBodySchema.parse(
      (
        await callTool(band.assistant, 'create_session', {
          session: {
            kind: 'concert',
            date: PRACTICE_DATE,
            venue: 'La Maroquinerie',
            capacity: 500,
          },
        })
      ).body,
    );
    const stored = await readSessionRow(created.session.id);
    const missingVenue = await callTool(band.assistant, 'create_session', {
      session: { kind: 'concert', date: PRACTICE_DATE, capacity: 500 },
    });

    expect(stored?.venue).toBe('La Maroquinerie');
    expect(stored?.capacity).toBe(500);
    expect(missingVenue.isError).toBe(true);
    expect(JSON.stringify(missingVenue.body)).toContain('venue');
  });

  it('answers the refusal codes the routes answer', async () => {
    const band = await prepareAssistantBand();
    const unknownId = randomUUID();
    const created = sessionBodySchema.parse(
      (
        await callTool(band.assistant, 'create_session', {
          session: { kind: 'practice', date: PRACTICE_DATE },
        })
      ).body,
    );

    const missing = await callTool(band.assistant, 'get_session', { id: unknownId });
    const missingUpdate = await callTool(band.assistant, 'update_session', {
      id: unknownId,
      changes: { date: MOVED_PRACTICE_DATE },
    });
    const emptyUpdate = await callTool(band.assistant, 'update_session', {
      id: created.session.id,
      changes: {},
    });
    const missingDelete = await callTool(band.assistant, 'delete_session', { id: unknownId });

    expect(missing).toEqual({ isError: true, body: { error: 'not-found' } });
    expect(missingUpdate).toEqual({ isError: true, body: { error: 'not-found' } });
    expect(emptyUpdate).toEqual({ isError: true, body: { error: 'empty-update' } });
    expect(missingDelete).toEqual({ isError: true, body: { error: 'not-found' } });
  });

  it('pushes a created and a changed session to the other members only', async () => {
    const band = await prepareAssistantBand();

    const created = sessionBodySchema.parse(
      (
        await callTool(band.assistant, 'create_session', {
          session: { kind: 'practice', date: PRACTICE_DATE },
        })
      ).body,
    );
    passNotificationGroupWindow(band.harness);
    await callTool(band.assistant, 'update_session', {
      id: created.session.id,
      changes: { date: MOVED_PRACTICE_DATE },
    });
    const sent = readSentNotifications(band.send);

    expect(sent.map((notification) => notification.endpoint)).toEqual([
      deviceEndpoint('lea-phone'),
      deviceEndpoint('lea-phone'),
    ]);
    expect(sent.map((notification) => notification.tag)).toEqual([
      `session:${created.session.id}`,
      `session:${created.session.id}`,
    ]);
  });
});

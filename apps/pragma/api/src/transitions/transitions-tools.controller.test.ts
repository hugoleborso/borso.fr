import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { buildAuthenticatedApp } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import {
  buildAssistantHarness,
  callTool,
  connectAssistant,
  openMcpClient,
  useOAuthOrigins,
} from '../../../test/mcp-utils';
import {
  deviceEndpoint,
  readSentNotifications,
  stubPushService,
  subscribeDevice,
} from '../../../test/push-utils';

const songBodySchema = z.object({ song: z.object({ id: z.string().uuid() }) });
const commentsBodySchema = z.object({
  comments: z.array(z.object({ songAId: z.string(), songBId: z.string(), comment: z.string() })),
});

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('transitions tools (back-e2e)', () => {
  useOAuthOrigins();

  beforeEach(async () => {
    await truncateAllTables(testDatabase());
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes, reads, lists and deletes a transition comment, pushing the change to the other members only', async () => {
    const send = stubPushService();
    const harness = buildAssistantHarness();
    const hugo = await buildAuthenticatedApp('Hugo');
    const lea = await buildAuthenticatedApp('Léa');
    await subscribeDevice(hugo, 'hugo-phone');
    await subscribeDevice(lea, 'lea-phone');
    const tokens = await connectAssistant(harness.app, hugo);
    const assistant = await openMcpClient(harness.app, tokens.accessToken);
    const songAId = songBodySchema.parse(
      (await callTool(assistant, 'create_song', { title: 'Creep', status: 'idea' })).body,
    ).song.id;
    const songBId = songBodySchema.parse(
      (await callTool(assistant, 'create_song', { title: 'Karma Police', status: 'idea' })).body,
    ).song.id;

    const written = await callTool(assistant, 'set_transition_comment', {
      a: songAId,
      b: songBId,
      comment: 'drop the last chorus',
    });
    const sent = readSentNotifications(send);
    const read = await callTool(assistant, 'get_transition_comment', { a: songAId, b: songBId });
    const listed = commentsBodySchema.parse(
      (await callTool(assistant, 'list_transition_comments')).body,
    );
    const deleted = await callTool(assistant, 'delete_transition_comment', {
      a: songAId,
      b: songBId,
    });
    const gone = await callTool(assistant, 'get_transition_comment', { a: songAId, b: songBId });

    expect(written).toEqual({
      isError: false,
      body: { songAId, songBId, comment: 'drop the last chorus' },
    });
    expect(sent.map((notification) => notification.endpoint)).toEqual([
      deviceEndpoint('lea-phone'),
    ]);
    expect(read.isError).toBe(false);
    expect(listed.comments).toEqual([
      expect.objectContaining({ songAId, songBId, comment: 'drop the last chorus' }),
    ]);
    expect(deleted).toEqual({ isError: false, body: { songAId, songBId, deleted: true } });
    expect(gone).toEqual({ isError: true, body: { error: 'not-found' } });
  });

  it('answers not-found when deleting a comment that does not exist', async () => {
    const harness = buildAssistantHarness();
    const hugo = await buildAuthenticatedApp('Hugo');
    const tokens = await connectAssistant(harness.app, hugo);
    const assistant = await openMcpClient(harness.app, tokens.accessToken);

    const deleted = await callTool(assistant, 'delete_transition_comment', {
      a: randomUUID(),
      b: randomUUID(),
    });

    expect(deleted).toEqual({ isError: true, body: { error: 'not-found' } });
  });
});

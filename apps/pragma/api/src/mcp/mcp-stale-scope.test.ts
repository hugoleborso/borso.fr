import { afterEach, describe, expect, it } from 'vitest';
import { callTool, prepareAssistantBand, useAssistantToolSuite } from '../../../test/mcp-utils';
import { useConnectionPoster } from '../realtime/connection-poster.setup';
import { realtimeConnectionTable } from '../realtime/realtime.schema';
import { testDatabase } from '../../../test/database-utils';

async function recordPostsToOneTab(memberId: string): Promise<unknown[]> {
  await testDatabase()
    .insert(realtimeConnectionTable)
    .values({ connectionId: 'reader', memberId, clientId: 'tab-reader' });
  const posts: unknown[] = [];
  useConnectionPoster({
    postToConnection: ({ Data }) => {
      posts.push(JSON.parse(Data));
      return Promise.resolve({});
    },
  });
  return posts;
}

/**
 * @FollowsBlueprint test-back-e2e
 */
describe('an assistant write tells the open tabs (back-e2e)', () => {
  useAssistantToolSuite();

  afterEach(() => {
    useConnectionPoster(null);
  });

  it('sends everything stale after a tool that writes', async () => {
    const band = await prepareAssistantBand();
    const posts = await recordPostsToOneTab(band.lea.memberId);

    await callTool(band.assistant, 'save_task', { title: 'Book the van' });

    expect(posts).toStrictEqual([{ kind: 'stale', scope: 'all' }]);
  });

  it('sends nothing after a tool that only reads, nor for the listing of tools', async () => {
    const band = await prepareAssistantBand();
    const posts = await recordPostsToOneTab(band.lea.memberId);

    await callTool(band.assistant, 'list_tasks');
    await band.assistant.listTools();

    expect(posts).toStrictEqual([]);
  });
});

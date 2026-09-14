import { beforeEach, describe, expect, it } from 'vitest';
import { buildAuthenticatedApp, jsonRequest } from '../../../test/auth-utils';
import { testDatabase, truncateAllTables } from '../../../test/database-utils';
import { findCredentialByMemberId } from './credentials.repository';

// @FollowsBlueprint test-back-e2e
describe('credentials cascade (back-e2e)', () => {
  beforeEach(async () => {
    await truncateAllTables(testDatabase());
  });

  it('deletes a member credential with the member it belongs to', async () => {
    const { app, cookieHeader, memberId } = await buildAuthenticatedApp();
    expect(await findCredentialByMemberId(memberId)).not.toBeNull();

    const removed = await jsonRequest(app, `/api/members/${memberId}`, {
      method: 'DELETE',
      cookieHeader,
    });
    expect(removed.status).toBe(200);
    expect(await findCredentialByMemberId(memberId)).toBeNull();
  });
});

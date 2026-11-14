import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { appendReviewEvent, readReviewLogRequest } from './review-log.store';
import { PHONE_REVIEW, signInAndSync, stubApi } from './sync-setup.test-utils';
import { readSyncStatus } from './sync.store';
import './sync.setup';

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(),
}));

vi.mock('@sentry/react', () => sentry);

const UNPROCESSABLE_STATUS = 422;

// @FollowsBlueprint test-component-render
describe('the sync of review events when the API refuses the push', () => {
  beforeAll(async () => {
    window.localStorage.clear();
    vi.stubGlobal('indexedDB', new IDBFactory());
    stubApi({ pushStatus: UNPROCESSABLE_STATUS, pulled: [] });
    await readReviewLogRequest();
    appendReviewEvent(PHONE_REVIEW);
  });

  it('reports the refusal to Sentry, tagged with its status and route, and pauses the sync', async () => {
    await signInAndSync();
    await vi.waitFor(() => {
      expect(sentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'SyncRejectedError' }),
        { tags: { status: String(UNPROCESSABLE_STATUS), route: 'POST /api/review-events' } },
      );
    });
    expect(readSyncStatus()).toBe('paused');
  });
});

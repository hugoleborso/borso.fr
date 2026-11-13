import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readReviewLog } from './review-log.store';
import { SYNC_CURSOR_STORAGE_KEY } from './sync-cursor.utils';
import { countBreadcrumbs, LAPTOP_REVIEW, signInAndSync, stubApi } from './sync-setup.test-utils';
import './sync.setup';

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(),
}));

vi.mock('@sentry/react', () => sentry);

// @FollowsBlueprint test-component-render
describe('the sync of review events in a browser whose store cannot write', () => {
  beforeAll(() => {
    window.localStorage.clear();
    vi.stubGlobal('indexedDB', undefined);
    stubApi({ pushStatus: 200, pulled: [LAPTOP_REVIEW] });
  });

  it('keeps the cursor where it was, so the next pull fetches the events it could not store', async () => {
    await signInAndSync();
    await vi.waitFor(() => {
      expect(countBreadcrumbs(sentry.addBreadcrumb, 'sync_completed')).toBe(1);
    });
    expect(readReviewLog()).toEqual({ events: [LAPTOP_REVIEW], isProgressKept: false });
    expect(window.localStorage.getItem(SYNC_CURSOR_STORAGE_KEY)).toBeNull();
  });
});

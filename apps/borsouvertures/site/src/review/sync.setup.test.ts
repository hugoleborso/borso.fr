import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readReviewLog } from './review-log.store';
import { SYNC_CURSOR_STORAGE_KEY } from './sync-cursor.utils';
import {
  countBreadcrumbs,
  LAPTOP_REVIEW,
  NEXT_CURSOR,
  signInAndSync,
  stubApi,
} from './sync-setup.test-utils';
import './sync.setup';

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(),
}));

vi.mock('@sentry/react', () => sentry);

// @FollowsBlueprint test-component-render
describe('the sync of review events once the operator signs in', () => {
  beforeAll(() => {
    window.localStorage.clear();
    vi.stubGlobal('indexedDB', new IDBFactory());
    stubApi({ pushStatus: 200, pulled: [LAPTOP_REVIEW] });
  });

  it('stores the pulled events, then moves the cursor past them', async () => {
    await signInAndSync();
    await vi.waitFor(() => {
      expect(countBreadcrumbs(sentry.addBreadcrumb, 'sync_completed')).toBe(1);
    });
    expect(readReviewLog()).toEqual({ events: [LAPTOP_REVIEW], isProgressKept: true });
    expect(window.localStorage.getItem(SYNC_CURSOR_STORAGE_KEY)).toBe(NEXT_CURSOR);
  });
});

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readReviewLog } from './review-log.store';
import { SYNC_CURSOR_STORAGE_KEY } from './sync-cursor.utils';
import {
  countBreadcrumbs,
  LAPTOP_REVIEW,
  LAST_CURSOR,
  LATER_LAPTOP_REVIEW,
  NEXT_CURSOR,
  signInAndSync,
  stubPagedPull,
} from './sync-setup.test-utils';
import './sync.setup';

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(),
}));

vi.mock('@sentry/react', () => sentry);

const PAGE_BY_CURSOR = new Map([
  [null, { events: [LAPTOP_REVIEW], nextCursor: NEXT_CURSOR, hasMore: true }],
  [NEXT_CURSOR, { events: [LATER_LAPTOP_REVIEW], nextCursor: LAST_CURSOR, hasMore: false }],
]);

// @FollowsBlueprint test-component-render
describe('the sync of review events in a browser whose store cannot write', () => {
  const pull: { cursorsAsked: readonly (string | null)[] } = { cursorsAsked: [] };

  beforeAll(() => {
    window.localStorage.clear();
    vi.stubGlobal('indexedDB', undefined);
    pull.cursorsAsked = stubPagedPull(PAGE_BY_CURSOR).cursorsAsked;
  });

  it('pulls every page once into the open tab and keeps the cursor off the disk', async () => {
    await signInAndSync();
    await vi.waitFor(() => {
      expect(countBreadcrumbs(sentry.addBreadcrumb, 'sync_completed')).toBe(1);
    });
    expect(readReviewLog()).toEqual({
      events: [LAPTOP_REVIEW, LATER_LAPTOP_REVIEW],
      isProgressKept: false,
    });
    expect(pull.cursorsAsked).toEqual([null, NEXT_CURSOR]);
    expect(window.localStorage.getItem(SYNC_CURSOR_STORAGE_KEY)).toBeNull();
  });
});

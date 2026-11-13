import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import '@/i18n/i18n';
import { buildExampleDocument } from '@/decks/deck.test-utils';
import { openApplication, stubBoardGeometry, stubDecksFetch } from './trainer-page.test-utils';

const sentry = vi.hoisted(() => ({
  init: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(),
}));

vi.mock('@sentry/react', () => sentry);

// @FollowsBlueprint test-component-render
describe('the opening trainer in a browser whose store cannot open', () => {
  beforeAll(async () => {
    window.localStorage.clear();
    stubDecksFetch(buildExampleDocument());
    vi.stubGlobal('indexedDB', undefined);
    stubBoardGeometry();
    await openApplication();
  });

  it('says progress will not be kept, reports the failed operation, and still reviews', async () => {
    expect((await screen.findByRole('status')).textContent).toBe(
      'This browser cannot store your progress. Reviews from this visit will be lost when you close the page.',
    );
    expect(sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'ReviewEventStoreUnavailableError' }),
      { tags: { operation: 'open' } },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Show the move' }));
    expect(screen.getByText('Missed. The book move is 1... d5.')).toBeTruthy();
    expect(screen.getAllByRole('status')[0]?.textContent).toContain('cannot store your progress');
  });
});

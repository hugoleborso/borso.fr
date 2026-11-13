import { act, cleanup, screen } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import '@/i18n/i18n';
import { buildExampleDeck, buildExampleDocument } from '@/decks/deck.test-utils';
import { appendStoredReviewEvent } from '@/review/review-event-store.adapter';
import { buildReviewEvent } from '@/review/review.test-utils';
import { openApplication, readCount, stubDecksFetch } from './trainer-page.test-utils';

const YESTERDAY = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

// @FollowsBlueprint test-component-render
describe('the opening trainer, loaded over reviews made on an earlier visit', () => {
  beforeAll(async () => {
    const [firstCard, secondCard] = buildExampleDeck().cards;
    if (firstCard === undefined || secondCard === undefined) throw new Error('two cards');
    const factory = new IDBFactory();
    await appendStoredReviewEvent(factory, buildReviewEvent(1, firstCard.cardId, YESTERDAY));
    await appendStoredReviewEvent(
      factory,
      buildReviewEvent(2, secondCard.cardId, YESTERDAY, 'missed'),
    );
    window.localStorage.clear();
    stubDecksFetch(buildExampleDocument());
    vi.stubGlobal('indexedDB', factory);
    await openApplication();
  });

  afterAll(async () => {
    await act(async () => {
      cleanup();
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });
  });

  it('finds the same progress after a reload', () => {
    expect(screen.getByRole('heading', { name: 'Today' })).toBeTruthy();
    expect(readCount('due')).toBe('1');
    expect(readCount('new')).toBe('4');
    expect(screen.queryByRole('status')).toBeNull();
  });
});

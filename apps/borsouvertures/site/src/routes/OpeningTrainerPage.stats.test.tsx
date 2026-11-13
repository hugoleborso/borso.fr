import { deriveCalendarDay } from '@domain/calendar-day.core';
import type { ReviewEvent, ReviewOutcome } from '@domain/review-event.core';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n/i18n';
import { buildExampleDeck, buildExampleDocument } from '@/decks/deck.test-utils';
import { appendStoredReviewEvent } from '@/review/review-event-store.adapter';
import { buildReviewEvent } from '@/review/review.test-utils';
import { openApplication, readCount, stubDecksFetch } from './trainer-page.test-utils';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const LOADED_AT = Date.now();

function buildReviewDaysAgo(
  sequence: number,
  cardId: string,
  daysAgo: number,
  outcome: ReviewOutcome,
): ReviewEvent {
  const reviewedAt = new Date(LOADED_AT - daysAgo * MILLISECONDS_PER_DAY);
  return buildReviewEvent(sequence, cardId, reviewedAt.toISOString(), outcome, {
    calendarDay: deriveCalendarDay(reviewedAt, -reviewedAt.getTimezoneOffset()),
  });
}

// @FollowsBlueprint test-component-render
describe('the opening trainer, loaded over a card recalled when it came due', () => {
  beforeAll(async () => {
    const [firstCard, secondCard] = buildExampleDeck().cards;
    if (firstCard === undefined || secondCard === undefined) throw new Error('two cards');
    const factory = new IDBFactory();
    await appendStoredReviewEvent(factory, buildReviewDaysAgo(1, firstCard.cardId, 4, 'recalled'));
    await appendStoredReviewEvent(factory, buildReviewDaysAgo(2, firstCard.cardId, 1, 'recalled'));
    await appendStoredReviewEvent(factory, buildReviewDaysAgo(3, secondCard.cardId, 1, 'missed'));
    window.localStorage.clear();
    stubDecksFetch(buildExampleDocument());
    vi.stubGlobal('indexedDB', factory);
  });

  beforeEach(async () => {
    await openApplication();
  });

  it('shows the streak and the retention of the last 30 days on Today', () => {
    expect(readCount('Streak')).toBe('1 day');
    expect(screen.getByRole('heading', { name: 'Retention, last 30 days' })).toBeTruthy();
    expect(readCount('Albin Countergambit')).toBe('100% · due reviews recalled: 1/1');
  });

  it('opens Stats from the tab bar, with the streak, 12 weeks per deck and the accuracy', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Stats' }));
    expect(await screen.findByRole('heading', { name: 'Stats' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Stats' }).getAttribute('aria-current')).toBe('page');
    expect(readCount('Streak')).toBe('1 day');

    expect(screen.getByRole('heading', { name: 'Retention by week' })).toBeTruthy();
    expect(screen.getAllByRole('img')).toHaveLength(12);
    expect(
      screen.getAllByRole('img', { name: /^Week of \d{4}-\d{2}-\d{2}: no due review$/ }),
    ).toHaveLength(11);
    expect(
      screen.getByRole('img', {
        name: /^Week of \d{4}-\d{2}-\d{2}: 100%, due reviews recalled: 1\/1$/,
      }),
    ).toBeTruthy();
    expect(screen.getByText('11 weeks ago')).toBeTruthy();
    expect(screen.getByText('This week')).toBeTruthy();

    expect(screen.getByRole('heading', { name: 'Accuracy per deck' })).toBeTruthy();
    expect(screen.getAllByText('Albin Countergambit')).toHaveLength(2);
    expect(screen.getByText('67% · reviews recalled: 2/3')).toBeTruthy();
  });
});

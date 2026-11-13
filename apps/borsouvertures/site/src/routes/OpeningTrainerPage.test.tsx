import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n/i18n';
import { buildExampleDocument } from '@/decks/deck.test-utils';
import { listStoredReviewEvents } from '@/review/review-event-store.adapter';
import { readReviewLog } from '@/review/review-log.store';
import {
  openApplication,
  playMove,
  readCount,
  selectTabAwaitingSuspense,
  stubBoardGeometry,
  stubDecksFetch,
} from './trainer-page.test-utils';

// @FollowsBlueprint test-component-render
describe('the opening trainer, one visit from the first load', () => {
  // @FollowsBlueprint test-jsdom-gap-stub
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
    };
  });

  beforeAll(async () => {
    window.localStorage.clear();
    stubDecksFetch(buildExampleDocument());
    vi.stubGlobal('indexedDB', new IDBFactory());
    stubBoardGeometry();
  });

  beforeEach(async () => {
    await openApplication();
  });

  it('opens on Today with the due count, the new count and Start', () => {
    expect(screen.getByRole('heading', { name: 'Today' })).toBeTruthy();
    expect(readCount('due')).toBe('0');
    expect(readCount('new')).toBe('6');
    expect(screen.getByRole('button', { name: 'Start' })).toHaveProperty('disabled', false);
    expect(screen.getByRole('button', { name: 'Today' }).getAttribute('aria-current')).toBe('page');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('switches screens from the tab bar and opens a deck page', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Opening decks' }));
    expect(await screen.findByRole('heading', { name: 'Opening decks' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Opening decks' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(screen.getByRole('button', { name: 'Today' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('combobox', { name: 'New cards per day' })).toHaveProperty(
      'value',
      '10',
    );

    await userEvent.click(
      screen.getByRole('button', {
        name: /Albin Countergambit.*Black · 6 cards · 0 due · 6 new.*No retention yet/,
      }),
    );
    expect(screen.getByRole('heading', { name: 'Albin Countergambit' })).toBeTruthy();
    expect(screen.getByText('You play Black')).toBeTruthy();

    await userEvent.click(screen.getByRole('tab', { name: 'Lines' }));
    await userEvent.click(screen.getByRole('button', { name: 'Main line' }));
    expect(screen.queryByRole('heading', { name: 'Albin Countergambit' })).toBeNull();
    const line = within(screen.getByRole('region', { name: 'Main line' }));
    expect(line.getByText('Starting position')).toBeTruthy();
    expect(line.getByText('0 of 8')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Previous move' })).toHaveProperty('disabled', true);
    await userEvent.click(screen.getByRole('button', { name: 'Next move' }));
    expect(line.getByText('1. d4')).toBeTruthy();
    expect(line.getByText('white pawn on d2 goes to d4')).toBeTruthy();
    expect(line.queryByRole('region', { name: 'Idea' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Next move' }));
    expect(line.getByText('black pawn on d7 goes to d5')).toBeTruthy();
    expect(line.getByText('English idea 1.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'End of the line' }));
    expect(line.getByText('4... Nc6')).toBeTruthy();
    expect(line.getByText('8 of 8')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next move' })).toHaveProperty('disabled', true);
    await userEvent.click(screen.getByRole('button', { name: 'Previous move' }));
    expect(line.getByText('white knight on g1 goes to f3')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Start of the line' }));
    expect(line.getByText('Starting position')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'All lines' }));
    expect(screen.getByRole('button', { name: 'Lasker Trap' })).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'Review' }));

    await userEvent.click(screen.getByRole('button', { name: 'Review this deck' }));
    expect(await screen.findByRole('heading', { name: 'Albin Countergambit · 1/6' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Leave the session' }));
    expect(screen.getByRole('heading', { name: 'Albin Countergambit' })).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'All opening decks' }));
    expect(screen.getByRole('heading', { name: 'Opening decks' })).toBeTruthy();
  });

  it('applies the new cards per day the reader picks', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Opening decks' }));
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'New cards per day' }),
      '3',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(readCount('new')).toBe('3');
  });

  it('leaves the due and new counts unchanged after time spent in Explore', async () => {
    await selectTabAwaitingSuspense('Explore');
    expect(screen.getByRole('region', { name: 'Explore' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Explore' }).getAttribute('aria-current')).toBe(
      'page',
    );
    await userEvent.click(screen.getByRole('button', { name: /^1\. e4/ }));
    expect(screen.getByText('1. e4')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(readCount('due')).toBe('0');
    expect(readCount('new')).toBe('3');
    expect(readReviewLog().events).toEqual([]);
  });

  it('names its three sources on Credits', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    await userEvent.click(screen.getByRole('button', { name: 'Credits' }));
    expect(screen.getByRole('heading', { name: 'Credits' })).toBeTruthy();
    expect(screen.getByText('CC0 1.0')).toBeTruthy();
    expect(screen.getByText('CC BY-SA 4.0')).toBeTruthy();
    expect(screen.getByText('GPL-3.0')).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'Stockfish' }));
    expect(
      screen.getByRole('link', { name: 'Source code at tag v19.0.1' }).getAttribute('href'),
    ).toBe('https://github.com/nmrugg/stockfish.js/tree/v19.0.1');
    expect(
      screen.getByText('ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Today' }).getAttribute('aria-current')).toBeNull();
  });

  it('recalls a card and shows its idea, misses a card through Show the move, and ends with the recalled share', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(await screen.findByRole('heading', { name: 'Albin Countergambit · 1/3' })).toBeTruthy();
    expect(screen.getByText('White played 1. d4')).toBeTruthy();
    expect(screen.queryByText('English idea 1.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true);
    await screen.findByText('Your move');
    expect(screen.queryByRole('img', { name: 'Recalled' })).toBeNull();

    playMove('d7d5');
    expect(screen.getByRole('img', { name: 'Recalled' })).toBeTruthy();
    expect(screen.queryByText('Your move')).toBeNull();
    expect(
      screen.getByText('black pawn on d7 goes to d5').closest('[role="status"]')?.textContent,
    ).toBe('1... d5black pawn on d7 goes to d5Recalled. You played 1... d5.');
    expect(screen.getByText('English idea 1.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Albin Countergambit · 1/3' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show the move' })).toHaveProperty('disabled', true);

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Albin Countergambit · 2/3' })).toBeTruthy();
    expect(screen.getByText('White played 2. c4')).toBeTruthy();
    expect(screen.queryByText('English idea 2.')).toBeNull();
    expect(screen.queryByRole('img', { name: 'Recalled' })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Show the move' }));
    expect(screen.getByRole('img', { name: 'Missed' })).toBeTruthy();
    expect(
      screen.getByText('black pawn on e7 goes to e5').closest('[role="status"]')?.textContent,
    ).toBe('2... e5black pawn on e7 goes to e5Missed. The book move is 2... e5.');
    expect(screen.getByText('English idea 2.')).toBeTruthy();

    await vi.waitFor(async () => {
      const stored = await listStoredReviewEvents(globalThis.indexedDB);
      expect(stored.map((event) => event.outcome).toSorted()).toEqual(['missed', 'recalled']);
    });

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Your move');
    playMove('d5d4');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Albin Countergambit · 3/3' })).toBeTruthy();
    await screen.findByText('Your move');
    playMove('e7e5');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByRole('heading', { name: 'Session complete' })).toBeTruthy();
    expect(screen.getByText('2 of 3 recalled on the first try (67%)')).toBeTruthy();
    expect(screen.getByText('1 card due tomorrow')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('button', { name: 'Start' })).toHaveProperty('disabled', true);
    await userEvent.click(screen.getByRole('tab', { name: 'Ahead' }));
    expect(screen.getByRole('heading', { name: 'Review a deck ahead' })).toBeTruthy();
    expect(readCount('new')).toBe('0');
  });
});

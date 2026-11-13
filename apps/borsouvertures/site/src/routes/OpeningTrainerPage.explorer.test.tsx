import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n/i18n';
import { buildExampleDocument } from '@/decks/deck.test-utils';
import { listStoredDeckLineEvents } from '@/personal-deck/deck-line-event-store.adapter';
import { readReviewLog } from '@/review/review-log.store';
import { setSide } from '@/state/appState';
import { openApplication, stubBoardGeometry, stubDecksFetch } from './trainer-page.test-utils';

const factory = new IDBFactory();
const SLOW_RENDER_MS = 10_000;

async function openExplore(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Explore' }));
  await screen.findByRole('region', { name: 'Explore' }, { timeout: SLOW_RENDER_MS });
}

async function playCandidate(notation: RegExp): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: notation }));
}

// @FollowsBlueprint test-component-render
describe('the open explorer and the personal deck', () => {
  beforeAll(async () => {
    window.localStorage.clear();
    stubDecksFetch(buildExampleDocument());
    vi.stubGlobal('indexedDB', factory);
    stubBoardGeometry();
    setSide('white');
  });

  beforeEach(async () => {
    await openApplication();
  });

  it('names the opening at each step, and lists the moves the book knows', async () => {
    await openExplore();
    expect(screen.getByRole('heading', { name: 'No named opening yet' })).toBeTruthy();
    expect(screen.getByText('Starting position')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add to my deck' })).toHaveProperty('disabled', true);
    await playCandidate(/^1\. e4/);
    await playCandidate(/^1\.\.\. e5/);
    await playCandidate(/^2\. Nf3/);
    await playCandidate(/^2\.\.\. Nc6/);
    await playCandidate(/^3\. Bc4/);
    expect(screen.getByRole('heading', { name: 'Classical' })).toBeTruthy();
    expect(screen.getByText('1. e4 e5 2. Nf3 Nc6 3. Bc4')).toBeTruthy();
    expect(screen.queryAllByRole('button', { name: /^3\.\.\./ })).toEqual([]);
  });

  it('takes a move back and goes back to the start', async () => {
    await openExplore();
    await userEvent.click(screen.getByRole('button', { name: 'Take back the last move' }));
    expect(screen.getByText('1. e4 e5 2. Nf3 Nc6')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Back to the starting position' }));
    expect(screen.getByText('Starting position')).toBeTruthy();
    for (const notation of [/^1\. e4/, /^1\.\.\. e5/, /^2\. Nf3/, /^2\.\.\. Nc6/, /^3\. Bc4/]) {
      await playCandidate(notation);
    }
  });

  it('adds the line to My lines, stores the event, and refuses it a second time', async () => {
    await openExplore();
    await userEvent.click(screen.getByRole('button', { name: 'Add to my deck' }));
    expect(await screen.findByText('Added to My lines, White')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add to my deck' })).toHaveProperty('disabled', true);
    await vi.waitFor(async () => {
      expect(await listStoredDeckLineEvents(factory)).toEqual([
        expect.objectContaining({
          kind: 'line-added',
          side: 'white',
          movesUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'],
          openingName: 'Classical',
          receivedAt: null,
        }),
      ]);
    });
  });

  it('refuses a line that holds no move of the side he plays', async () => {
    await openExplore();
    await userEvent.click(screen.getByRole('button', { name: 'Back to the starting position' }));
    await userEvent.click(screen.getByRole('button', { name: 'Side you play' }));
    await playCandidate(/^1\. e4/);
    await userEvent.click(screen.getByRole('button', { name: 'Add to my deck' }));
    expect(await screen.findByText('This line holds no move of yours')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Side you play' }));
  });

  it('shows My lines on Decks with its cards and the opening name in place of an idea', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Decks' }));
    const myLines = await screen.findByRole(
      'button',
      { name: /^My lines/ },
      { timeout: SLOW_RENDER_MS },
    );
    expect(myLines.textContent).toContain('3 cards');
    await userEvent.click(myLines);
    await userEvent.click(screen.getByRole('tab', { name: 'Lines' }));
    await userEvent.click(screen.getByRole('button', { name: 'Classical' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next move' }));
    expect(
      within(screen.getByRole('region', { name: 'Opening' })).getByText('Classical'),
    ).toBeTruthy();
    expect(readReviewLog().events).toEqual([]);
  });

  it('removes the line from My lines', async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Decks' }));
    await userEvent.click(
      await screen.findByRole('button', { name: /^My lines/ }, { timeout: SLOW_RENDER_MS }),
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Lines' }));
    await userEvent.click(screen.getByRole('button', { name: 'Classical' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(await screen.findByRole('heading', { name: 'Decks' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^My lines/ })).toBeNull();
    await vi.waitFor(async () => {
      expect((await listStoredDeckLineEvents(factory)).map((event) => event.kind)).toEqual(
        expect.arrayContaining(['line-added', 'line-removed']),
      );
    });
  });
});

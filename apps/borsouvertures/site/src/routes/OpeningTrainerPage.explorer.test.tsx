import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n/i18n';
import { buildExampleDocument } from '@/decks/deck.test-utils';
import { replaceExplorerMoves } from '@/explorer/explorer.store';
import { listStoredDeckLineEvents } from '@/personal-deck/deck-line-event-store.adapter';
import { readReviewLog } from '@/review/review-log.store';
import { setSide } from '@/state/appState';
import {
  openApplication,
  selectTabAwaitingSuspense,
  stubBoardGeometry,
  stubDecksFetch,
} from './trainer-page.test-utils';

const factory = new IDBFactory();
const CLASSICAL_LINE = [/^1\. e4/, /^1\.\.\. e5/, /^2\. Nf3/, /^2\.\.\. Nc6/, /^3\. Bc4/];

async function openExplore(): Promise<void> {
  await selectTabAwaitingSuspense('Explore');
  screen.getByRole('region', { name: 'Explore' });
}

async function playCandidate(notation: RegExp): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: notation }));
}

async function playClassicalLine(): Promise<void> {
  for (const notation of CLASSICAL_LINE) await playCandidate(notation);
}

// @FollowsBlueprint test-component-render
describe('the open explorer and the personal deck', () => {
  beforeAll(() => {
    window.localStorage.clear();
    stubDecksFetch(buildExampleDocument());
    vi.stubGlobal('indexedDB', factory);
    stubBoardGeometry();
  });

  beforeEach(async () => {
    setSide('white');
    replaceExplorerMoves([]);
    await openApplication();
  });

  it('names the opening at each step, and lists the moves the book knows', async () => {
    await openExplore();
    expect(screen.getByRole('heading', { name: 'No named opening yet' })).toBeTruthy();
    expect(screen.getByText('Starting position')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add to my deck' })).toHaveProperty('disabled', true);
    await playClassicalLine();
    expect(screen.getByRole('heading', { name: 'Classical' })).toBeTruthy();
    expect(screen.getByText('1. e4 e5 2. Nf3 Nc6 3. Bc4')).toBeTruthy();
    expect(screen.queryAllByRole('button', { name: /^3\.\.\./ })).toEqual([]);
  });

  it('takes a move back and goes back to the start', async () => {
    await openExplore();
    await playClassicalLine();
    await userEvent.click(screen.getByRole('button', { name: 'Take back the last move' }));
    expect(screen.getByText('1. e4 e5 2. Nf3 Nc6')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Back to the starting position' }));
    expect(screen.getByText('Starting position')).toBeTruthy();
  });

  it('refuses a line that holds no move of the side he plays', async () => {
    await openExplore();
    await userEvent.click(screen.getByRole('button', { name: 'Side you play' }));
    await playCandidate(/^1\. e4/);
    await userEvent.click(screen.getByRole('button', { name: 'Add to my deck' }));
    expect(screen.getByText('This line holds no move of yours')).toBeTruthy();
  });

  // @FollowsBlueprint test-scenario-e2e
  it('adds a line to My lines, refuses it a second time, shows it on Decks and removes it', async () => {
    await openExplore();
    await playClassicalLine();
    await userEvent.click(screen.getByRole('button', { name: 'Add to my deck' }));
    expect(screen.getByText('Added to My lines, White')).toBeTruthy();
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

    await userEvent.click(screen.getByRole('button', { name: 'Decks' }));
    const myLines = screen.getByRole('button', { name: /^My lines/ });
    expect(myLines.textContent).toContain('3 cards');
    await userEvent.click(myLines);
    await userEvent.click(screen.getByRole('tab', { name: 'Lines' }));
    await userEvent.click(screen.getByRole('button', { name: 'Classical' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next move' }));
    expect(
      within(screen.getByRole('region', { name: 'Opening' })).getByText('Classical'),
    ).toBeTruthy();
    expect(readReviewLog().events).toEqual([]);

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByRole('heading', { name: 'Decks' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^My lines/ })).toBeNull();
    await vi.waitFor(async () => {
      const storedKinds = (await listStoredDeckLineEvents(factory)).map((event) => event.kind);
      expect(storedKinds.toSorted()).toEqual(['line-added', 'line-removed']);
    });
  });
});

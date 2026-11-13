import { describe, expect, it } from 'vitest';
import {
  APP_TABS,
  INITIAL_SCREEN,
  readScreenDeckId,
  selectActiveTab,
  selectAppScreenView,
  selectSessionExitScreen,
  selectTabScreen,
} from './app-screen.core';

// @FollowsBlueprint test-pure-unit
describe('the tabs', () => {
  it('are Today, Decks and Explore, and Today is the screen after every load', () => {
    expect(APP_TABS).toEqual(['today', 'decks', 'explore']);
    expect(INITIAL_SCREEN).toEqual({ kind: 'today' });
  });

  it('marks the tab a screen belongs to', () => {
    expect(selectActiveTab({ kind: 'today' })).toBe('today');
    expect(selectActiveTab({ kind: 'decks' })).toBe('decks');
    expect(selectActiveTab({ kind: 'deck', deckId: 'albin-countergambit' })).toBe('decks');
    expect(selectActiveTab({ kind: 'explore' })).toBe('explore');
    expect(selectActiveTab({ kind: 'credits' })).toBeNull();
  });

  it('gives the session of the day to Today and the session of a deck to Decks', () => {
    expect(selectActiveTab({ kind: 'review-session', deckId: null })).toBe('today');
    expect(selectActiveTab({ kind: 'review-session', deckId: 'albin-countergambit' })).toBe(
      'decks',
    );
  });

  it('opens the screen of a tab', () => {
    expect(selectTabScreen('today')).toEqual({ kind: 'today' });
    expect(selectTabScreen('decks')).toEqual({ kind: 'decks' });
    expect(selectTabScreen('explore')).toEqual({ kind: 'explore' });
  });
});

describe('leaving a session and reading a deck id', () => {
  it('returns to Today, or to the deck the session came from', () => {
    expect(selectSessionExitScreen(null)).toEqual({ kind: 'today' });
    expect(selectSessionExitScreen('vienna-game')).toEqual({ kind: 'deck', deckId: 'vienna-game' });
  });

  it('reads the deck a screen names, if it names one', () => {
    expect(readScreenDeckId({ kind: 'deck', deckId: 'vienna-game' })).toBe('vienna-game');
    expect(readScreenDeckId({ kind: 'review-session', deckId: null })).toBeNull();
    expect(readScreenDeckId({ kind: 'today' })).toBeNull();
  });
});

describe('selectAppScreenView', () => {
  const deckIds = ['albin-countergambit'];

  it('draws the screen asked when the decks loaded', () => {
    expect(selectAppScreenView({ kind: 'today' }, true, deckIds)).toBe('today');
    expect(selectAppScreenView({ kind: 'decks' }, true, deckIds)).toBe('decks');
    expect(
      selectAppScreenView({ kind: 'deck', deckId: 'albin-countergambit' }, true, deckIds),
    ).toBe('deck');
    expect(selectAppScreenView({ kind: 'review-session', deckId: null }, true, deckIds)).toBe(
      'review-session',
    );
    expect(selectAppScreenView({ kind: 'explore' }, true, deckIds)).toBe('explore');
    expect(selectAppScreenView({ kind: 'credits' }, true, deckIds)).toBe('credits');
  });

  it('falls back to the list for a deck that is gone', () => {
    expect(selectAppScreenView({ kind: 'deck', deckId: 'gone' }, true, deckIds)).toBe('decks');
  });

  it('shows the failure on the four screens that read decks, and nowhere else', () => {
    expect(selectAppScreenView({ kind: 'today' }, false, [])).toBe('decks-load-failure');
    expect(selectAppScreenView({ kind: 'decks' }, false, [])).toBe('decks-load-failure');
    expect(selectAppScreenView({ kind: 'deck', deckId: 'gone' }, false, [])).toBe(
      'decks-load-failure',
    );
    expect(selectAppScreenView({ kind: 'review-session', deckId: null }, false, [])).toBe(
      'decks-load-failure',
    );
    expect(selectAppScreenView({ kind: 'explore' }, false, [])).toBe('explore');
    expect(selectAppScreenView({ kind: 'credits' }, false, [])).toBe('credits');
  });
});

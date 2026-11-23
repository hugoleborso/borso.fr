import { describe, expect, it } from 'vitest';
import {
  buildGameSearch,
  buildInvitationUrl,
  readGameCode,
  readSideView,
  isWatchMoved,
  selectGameScreen,
  watchRematch,
} from './game-address.core';

// @FollowsBlueprint test-pure-unit
describe('readGameCode', () => {
  it('answers null when the address names no game', () => {
    expect(readGameCode(null)).toBeNull();
  });

  it('normalises a code a chat application changed the case of', () => {
    expect(readGameCode(' brig ')).toBe('BRIG');
  });

  it('answers null for a code too short to be one', () => {
    expect(readGameCode('BRI')).toBeNull();
  });
});

describe('readSideView', () => {
  it('reads the invite and scores views', () => {
    expect(readSideView('invite')).toBe('invite');
    expect(readSideView('scores')).toBe('scores');
  });

  it('answers null for anything else', () => {
    expect(readSideView('bidding')).toBeNull();
    expect(readSideView(null)).toBeNull();
  });
});

describe('selectGameScreen', () => {
  it('shows the phase when no side view is asked for', () => {
    expect(selectGameScreen('bidding', null)).toBe('bidding');
    expect(selectGameScreen('scoring', null)).toBe('scoring');
  });

  it('shows the side view asked for during play', () => {
    expect(selectGameScreen('scoring', 'scores')).toBe('scores');
    expect(selectGameScreen('bidding', 'invite')).toBe('invite');
  });

  it('shows the scores once the game is finished, whatever was asked', () => {
    expect(selectGameScreen('finished', null)).toBe('scores');
    expect(selectGameScreen('finished', 'invite')).toBe('scores');
  });
});

describe('buildGameSearch', () => {
  it('names the game alone for the phase screen', () => {
    expect(buildGameSearch('BRIG', null)).toBe('?game=BRIG');
  });

  it('adds the side view', () => {
    expect(buildGameSearch('BRIG', 'scores')).toBe('?game=BRIG&view=scores');
  });
});

describe('buildInvitationUrl', () => {
  it('points at the root address with the game in the query', () => {
    expect(buildInvitationUrl('https://skull-king.borso.fr/', 'BRIG')).toBe(
      'https://skull-king.borso.fr/?game=BRIG',
    );
  });

  it('accepts an origin without a trailing slash', () => {
    expect(buildInvitationUrl('http://localhost:5178', 'BRIG')).toBe(
      'http://localhost:5178/?game=BRIG',
    );
  });
});

describe('watchRematch', () => {
  it('opens a finished game that already has a rematch on that game, not the rematch', () => {
    expect(watchRematch(null, 'SGRN', 'VZJR')).toStrictEqual({
      joinCode: 'SGRN',
      rematchJoinCode: 'VZJR',
      follow: null,
    });
  });

  it('follows a rematch another phone starts while this game is on screen', () => {
    const before = watchRematch(null, 'SGRN', null);
    expect(watchRematch(before, 'SGRN', 'VZJR').follow).toBe('VZJR');
  });

  it('keeps following once it decided to, until the address moves', () => {
    const started = watchRematch(watchRematch(null, 'SGRN', null), 'SGRN', 'VZJR');
    expect(watchRematch(started, 'SGRN', 'VZJR')).toBe(started);
    expect(watchRematch(started, 'SGRN', 'KRAK').follow).toBe('VZJR');
  });

  it('starts over, following nothing, for another game', () => {
    const started = watchRematch(watchRematch(null, 'SGRN', null), 'SGRN', 'VZJR');
    expect(watchRematch(started, 'VZJR', null)).toStrictEqual({
      joinCode: 'VZJR',
      rematchJoinCode: null,
      follow: null,
    });
  });

  it('answers the same watch while nothing changed, so the screen renders once', () => {
    const watching = watchRematch(null, 'SGRN', null);
    expect(watchRematch(watching, 'SGRN', null)).toBe(watching);
    expect(isWatchMoved(watching, watchRematch(watching, 'SGRN', null))).toBe(false);
    expect(isWatchMoved(null, watching)).toBe(true);
  });
});

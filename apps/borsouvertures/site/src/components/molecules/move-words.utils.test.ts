import { beforeEach, describe, expect, it } from 'vitest';
import type { MoveFacts } from '@/decks/card.core';
import { i18next } from '@/i18n/i18n';
import { describeMoveInWords } from './move-words.utils';

const KNIGHT_MOVE: MoveFacts = {
  fromSquare: 'g1',
  toSquare: 'f3',
  piece: 'wN',
  kind: 'move',
  mover: 'white',
};

beforeEach(async () => {
  await i18next.changeLanguage('en');
});

// @FollowsBlueprint test-pure-unit
describe('describeMoveInWords', () => {
  it('names the piece, the square it leaves and the square it goes to', () => {
    expect(describeMoveInWords(i18next.t, KNIGHT_MOVE)).toBe('white knight on g1 goes to f3');
  });

  it('says takes on a capture', () => {
    expect(
      describeMoveInWords(i18next.t, {
        fromSquare: 'g4',
        toSquare: 'd1',
        piece: 'bB',
        kind: 'capture',
        mover: 'black',
      }),
    ).toBe('black bishop on g4 takes on d1');
  });

  it('names the castling wing and the side that castles', () => {
    const kingMove: MoveFacts = { ...KNIGHT_MOVE, piece: 'wK', fromSquare: 'e1' };
    expect(describeMoveInWords(i18next.t, { ...kingMove, kind: 'castle-kingside' })).toBe(
      'White castles kingside',
    );
    expect(describeMoveInWords(i18next.t, { ...kingMove, kind: 'castle-queenside' })).toBe(
      'White castles queenside',
    );
    expect(
      describeMoveInWords(i18next.t, { ...kingMove, kind: 'castle-kingside', mover: 'black' }),
    ).toBe('Black castles kingside');
    expect(
      describeMoveInWords(i18next.t, { ...kingMove, kind: 'castle-queenside', mover: 'black' }),
    ).toBe('Black castles queenside');
  });

  it('says it in the active language', async () => {
    await i18next.changeLanguage('fr');
    expect(describeMoveInWords(i18next.t, KNIGHT_MOVE)).toBe('cavalier blanc en g1 va en f3');
  });

  it('says nothing when there is no move', () => {
    expect(describeMoveInWords(i18next.t, null)).toBe('');
  });
});

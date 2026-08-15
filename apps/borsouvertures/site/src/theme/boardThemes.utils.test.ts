import { describe, expect, it } from 'vitest';
import { boardThemes, getBoardTheme, isBoardThemeId, toBoardThemeId } from './boardThemes.utils';

describe('boardThemes', () => {
  it('exposes the four supported themes', () => {
    expect(boardThemes.map((theme) => theme.id)).toEqual(['lichess', 'chesscom', 'nord', 'sand']);
  });
});

describe('getBoardTheme', () => {
  it('returns the named theme', () => {
    expect(getBoardTheme('chesscom').nameKey).toBe('top-bar.board-style.theme.chesscom');
    expect(getBoardTheme('nord').nameKey).toBe('top-bar.board-style.theme.nord');
    expect(getBoardTheme('lichess').dark).toBe('#b58863');
    expect(getBoardTheme('sand').light).toBe('#f3e9dc');
  });
});

describe('isBoardThemeId', () => {
  it('accepts every supported id', () => {
    for (const theme of boardThemes) expect(isBoardThemeId(theme.id)).toBe(true);
  });

  it('rejects unknown ids', () => {
    expect(isBoardThemeId('classic')).toBe(false);
    expect(isBoardThemeId('')).toBe(false);
  });
});

// @FollowsBlueprint test-pure-unit
describe('toBoardThemeId', () => {
  it('returns the value when it names a shipped theme', () => {
    expect(toBoardThemeId('nord', 'chesscom')).toBe('nord');
  });

  it('returns the fallback when the value names no shipped theme', () => {
    expect(toBoardThemeId('classic', 'chesscom')).toBe('chesscom');
  });
});

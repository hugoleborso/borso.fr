import { describe, expect, it } from 'vitest';
import { boardThemes, getBoardTheme, isBoardThemeId } from './boardThemes.utils';

describe('boardThemes', () => {
  it('exposes the four supported themes', () => {
    expect(boardThemes.map((theme) => theme.id)).toEqual(['lichess', 'chesscom', 'nord', 'sand']);
  });
});

describe('getBoardTheme', () => {
  it('returns the named theme', () => {
    expect(getBoardTheme('chesscom').name).toBe('Chess.com');
    expect(getBoardTheme('nord').name).toBe('Nord Blue');
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

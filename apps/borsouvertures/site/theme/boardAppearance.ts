import { type BoardThemeId, getBoardTheme } from '@/theme/boardThemes.utils';
import { chesscomPieces } from '@/theme/chesscomPieces';

export function getBoardAppearance(boardStyleId: BoardThemeId) {
  const theme = getBoardTheme(boardStyleId);
  const customPieces = boardStyleId === 'lichess' ? undefined : chesscomPieces;
  return { theme, customPieces };
}

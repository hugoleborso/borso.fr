import { type BoardThemeId, getBoardTheme } from '@/theme/boardThemes.utils';

/**
 * Resolve a `BoardThemeId` to the props the chessboard component consumes.
 *
 * Pieces use react-chessboard's built-in SVG set across every theme — they
 * ship with the library and are served from the same origin as the JS bundle,
 * which is what keeps the PWA working offline. A previous iteration loaded
 * `chess.com`-style sprites from `images.chesscomfiles.com`; that broke
 * offline-first and was visibly broken even online (CDN hotlinking blocked).
 * The themes now differ only in the board palette + arrow colour.
 */
export function getBoardAppearance(boardStyleId: BoardThemeId) {
  const theme = getBoardTheme(boardStyleId);
  return { theme };
}

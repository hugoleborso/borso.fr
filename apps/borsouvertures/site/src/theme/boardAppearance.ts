import { type BoardThemeId, getBoardTheme } from '@/theme/boardThemes.utils';

// @FollowsBlueprint core-appearance
export function getBoardAppearance(boardStyleId: BoardThemeId) {
  const theme = getBoardTheme(boardStyleId);
  return { theme };
}

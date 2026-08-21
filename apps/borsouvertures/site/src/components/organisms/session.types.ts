import type { TreeVisualization } from '@/openings/sessionStart.core';
import type { Selection } from '@/openings/selectors.utils';
import type { Opening } from '@/openings/types';
import type { PlayScope, Side } from '@/state/persistedState.utils';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

// @FollowsBlueprint shared-props-shape
export interface SessionBodyProps {
  openings: Opening[];
  selection: Selection;
  playScope: PlayScope;
  side: Side;
  boardStyle: BoardThemeId;
  isAutoOpponentEnabled: boolean;
  areMovesShown: boolean;
  visualization: TreeVisualization;
}

export interface SessionModeControlProps {
  visualization: TreeVisualization;
  isAutoOpponentEnabled: boolean;
}

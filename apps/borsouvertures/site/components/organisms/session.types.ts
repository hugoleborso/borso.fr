import type { TreeVisualization } from '@/openings/sessionStart.core';
import type { Selection } from '@/openings/selectors.utils';
import type { Opening } from '@/openings/types';
import type { PlayScope, Side } from '@/state/persistedState.utils';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

/** The learn and play session bodies share one props shape, so the session
 * screen picks between them from a lookup keyed by the mode. */
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

/** The one control the session bar shows for the current mode. */
export interface SessionModeControlProps {
  visualization: TreeVisualization;
  isAutoOpponentEnabled: boolean;
}

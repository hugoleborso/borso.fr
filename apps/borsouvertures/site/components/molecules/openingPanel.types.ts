import type { OpeningFlowLists } from '@/openings/openingFlow.core';
import type { Selection } from '@/openings/selectors.utils';
import type { Opening } from '@/openings/types';
import type { Mode, PlayScope } from '@/state/persistedState.utils';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

/**
 * The three columns of the opening picker share one props shape, so the
 * compact flow can pick the column to show from a lookup keyed by its step.
 */
export interface OpeningPanelProps {
  mode: Mode;
  openings: Opening[];
  lists: OpeningFlowLists;
  selection: Selection;
  playScope: PlayScope;
  boardStyle: BoardThemeId;
  onAdvance: () => void;
}

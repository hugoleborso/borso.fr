import type { OpeningFlowLists } from '@/openings/openingFlow.core';
import type { Selection } from '@/openings/selectors.utils';
import type { Opening } from '@/openings/types';
import type { Mode, PlayScope } from '@/state/persistedState.utils';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

/**
 * @Blueprint shared-props-shape
 * @BlueprintName Shared Props Shape Module
 * @BlueprintUsage Use when several interchangeable components must satisfy one props type that a lookup table can be typed against.
 * @BlueprintDescription Declares the props interface in a sibling `.types.ts` module that imports only types, so each component and the organism holding the table import the shape from there rather than from each other. That is what keeps the import graph acyclic: a table typed as `ComponentByKind<Step, OpeningPanelProps>` would otherwise force the organism to import a component and the component to import the organism's props type.
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

import { useMemo } from 'react';
import type { OpeningPanelProps } from '@/components/molecules/openingPanel.types';
import type { ComponentByFlag } from '@/lib/componentTable.types';
import { useIsCompactViewport } from '@/lib/viewport';
import { buildOpeningFlowLists } from '@/openings/openingFlow.core';
import type { Opening } from '@/openings/types';
import { useAppState } from '@/state/appState';
import { CompactOpeningFlow } from './CompactOpeningFlow';
import { WideOpeningFlow } from './WideOpeningFlow';

const FLOW_BY_VIEWPORT: ComponentByFlag<OpeningPanelProps> = {
  true: CompactOpeningFlow,
  false: WideOpeningFlow,
};

/** Nothing to advance to until a flow decides what "next" means. */
function stayOnTheSameStep(): void {
  // Intentionally empty.
}

interface OpeningFlowSelectorProps {
  openings: Opening[];
}

export function OpeningFlowSelector({ openings }: OpeningFlowSelectorProps) {
  const { mode, selection, playScope, boardStyle } = useAppState();
  const isCompactViewport = useIsCompactViewport();
  const lists = useMemo(
    () => buildOpeningFlowLists(mode, openings, selection, playScope),
    [mode, openings, selection, playScope],
  );
  const Flow = FLOW_BY_VIEWPORT[`${isCompactViewport}`];

  return (
    <Flow
      mode={mode}
      openings={openings}
      lists={lists}
      selection={selection}
      playScope={playScope}
      boardStyle={boardStyle}
      onAdvance={stayOnTheSameStep}
    />
  );
}

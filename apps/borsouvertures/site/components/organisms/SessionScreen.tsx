import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { ShowMovesToggle } from '@/components/molecules/ShowMovesToggle';
import type { ComponentByKind } from '@/lib/componentTable.types';
import { useIsCompactViewport } from '@/lib/viewport';
import { buildSessionKey, selectTreeVisualization } from '@/openings/sessionStart.core';
import type { Opening } from '@/openings/types';
import { setView, useAppState } from '@/state/appState';
import type { Mode } from '@/state/persistedState.utils';
import { LearnSessionControl } from './LearnSessionControl';
import { LearnTreeSession } from './LearnTreeSession';
import { PlaySession } from './PlaySession';
import { PlaySessionControl } from './PlaySessionControl';
import type { SessionBodyProps, SessionModeControlProps } from './session.types';

const CONTROLS_ROW_STYLE = { justifyContent: 'space-between' } as const;

// @FollowsBlueprint component-lookup-table
const SESSION_BODY_BY_MODE: ComponentByKind<Mode, SessionBodyProps> = {
  learn: LearnTreeSession,
  play: PlaySession,
};

const SESSION_CONTROL_BY_MODE: ComponentByKind<Mode, SessionModeControlProps> = {
  learn: LearnSessionControl,
  play: PlaySessionControl,
};

interface SessionScreenProps {
  openings: Opening[];
}

/**
 * @Blueprint organism-table-dispatch
 * @BlueprintName Organism Dispatching Through A Table
 * @BlueprintUsage Use for a screen region that owns state and has to choose which child renders the body.
 * @BlueprintDescription Holds the one piece of local state the region owns, reads the rest from the shared store, and picks both the body and its matching control by indexing two tables with the same mode key, so the pair can never fall out of step. The body is given `key={buildSessionKey(...)}`, so a change of mode, side, selection or scope remounts it and restarts the machine it drives, which is the alternative to an effect that pushes the new scope into a running machine.
 */
export function SessionScreen({ openings }: SessionScreenProps) {
  const { t } = useTranslation();
  const { mode, side, boardStyle, selection, playScope, playAutoOpponent, treeVisualizationMode } =
    useAppState();
  const [areMovesShown, setAreMovesShown] = useState(false);
  const isCompactViewport = useIsCompactViewport();
  const visualization = selectTreeVisualization(treeVisualizationMode, isCompactViewport);

  const SessionBody = SESSION_BODY_BY_MODE[mode];
  const SessionControl = SESSION_CONTROL_BY_MODE[mode];

  return (
    <>
      <div className="controls-row" style={CONTROLS_ROW_STYLE}>
        <div className="controls-row">
          <Button label={t('session.change-selection')} onActivate={() => setView('select')} />
          <ShowMovesToggle areMovesShown={areMovesShown} onToggle={setAreMovesShown} />
          <SessionControl visualization={visualization} isAutoOpponentEnabled={playAutoOpponent} />
        </div>
      </div>
      <SessionBody
        key={buildSessionKey(mode, side, selection, playScope)}
        openings={openings}
        selection={selection}
        playScope={playScope}
        side={side}
        boardStyle={boardStyle}
        isAutoOpponentEnabled={playAutoOpponent}
        areMovesShown={areMovesShown}
        visualization={visualization}
      />
    </>
  );
}

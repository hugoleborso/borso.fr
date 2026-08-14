import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import { SideSelector } from '@/components/molecules/SideSelector';
import type { ComponentByFlag, ComponentByKind } from '@/lib/componentTable.types';
import { isSessionStartAllowed } from '@/openings/sessionStart.core';
import type { Opening } from '@/openings/types';
import { setView, useAppState } from '@/state/appState';
import type { Mode } from '@/state/persistedState.utils';
import { OpeningFlowSelector } from './OpeningFlowSelector';
import { SelectionAutoOpponentRow } from './SelectionAutoOpponentRow';
import { SessionStartHint } from '@/components/atoms/SessionStartHint';

// @FollowsBlueprint component-lookup-table
const AUTO_OPPONENT_ROW_BY_MODE: ComponentByKind<Mode, { isAutoOpponentEnabled: boolean }> = {
  play: SelectionAutoOpponentRow,
  learn: EmptySlot,
};

const START_HINT_BY_READINESS: ComponentByFlag<{ mode: Mode }> = {
  true: EmptySlot,
  false: SessionStartHint,
};

const START_LABEL_KEY_BY_MODE: Record<Mode, 'selection.start.learn' | 'selection.start.play'> = {
  learn: 'selection.start.learn',
  play: 'selection.start.play',
};

interface SelectionScreenProps {
  openings: Opening[];
}

// @FollowsBlueprint organism-table-dispatch
export function SelectionScreen({ openings }: SelectionScreenProps) {
  const { t } = useTranslation();
  const { mode, side, selection, playScope, playAutoOpponent } = useAppState();
  const isStartAllowed = isSessionStartAllowed(mode, selection, playScope);
  const AutoOpponentRow = AUTO_OPPONENT_ROW_BY_MODE[mode];
  const StartHint = START_HINT_BY_READINESS[`${isStartAllowed}`];

  return (
    <>
      <div className="p-4 rounded-xl border border-panel-line bg-panel backdrop-blur-[6px]">
        <SideSelector side={side} />
        <AutoOpponentRow isAutoOpponentEnabled={playAutoOpponent} />
      </div>
      <OpeningFlowSelector openings={openings} />
      <div className="p-4 rounded-xl border border-panel-line bg-panel backdrop-blur-[6px]">
        <Button
          label={t(START_LABEL_KEY_BY_MODE[mode])}
          variant="primary"
          isDisabled={!isStartAllowed}
          onActivate={() => setView('session')}
        />
        <StartHint mode={mode} />
      </div>
    </>
  );
}

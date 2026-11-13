import { type CSSProperties, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionBar } from '@/components/atoms/ActionBar';
import { BoardView } from '@/components/atoms/BoardView';
import { Notice } from '@/components/atoms/Notice';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import { TabPanel } from '@/components/atoms/TabPanel';
import { PlayBookPanel } from '@/components/molecules/PlayBookPanel';
import type { PlayActionsProps } from '@/components/molecules/drill-actions.types';
import { PlayBookActions } from '@/components/molecules/PlayBookActions';
import { PlayCompletedActions } from '@/components/molecules/PlayCompletedActions';
import { PlayOutOfBookModal } from '@/components/molecules/PlayOutOfBookModal';
import { PlayStatusPanel } from '@/components/molecules/PlayStatusPanel';
import type { ComponentByFlag } from '@/lib/componentTable.types';
import { useSessionStart } from '@/lib/session-start.hook';
import { useBoardWidth } from '@/lib/viewport.hook';
import { selectVisibleBookMoves } from '@/openings/bookArrows.utils';
import { playMachine } from '@/openings/machineInstances';
import {
  isUndoAllowed,
  selectCompletionMessageKey,
  selectLineLabel,
} from '@/openings/playSession.core';
import { uciToArrow } from '@/openings/uciSquare.utils';
import type { SessionBodyProps } from './session.types';

const NO_HIGHLIGHTS: Record<string, CSSProperties> = {};
const ACCEPTED = 'accepted';

// @FollowsBlueprint component-lookup-table
const COMPLETED_NOTICE_BY_STATE: ComponentByFlag<{ message: string }> = {
  true: Notice,
  false: EmptySlot,
};

const ACTIONS_BY_COMPLETION: ComponentByFlag<PlayActionsProps> = {
  true: PlayCompletedActions,
  false: PlayBookActions,
};

const OUT_OF_BOOK_MODAL_BY_STATE: ComponentByFlag<Record<string, never>> = {
  true: PlayOutOfBookModal,
  false: EmptySlot,
};

/**
 * @Blueprint organism-machine-bound
 * @BlueprintName Organism Bound To A State Machine
 * @BlueprintUsage Use for a screen region whose state lives in a hand written machine outside React.
 * @BlueprintDescription Starts the machine once from `useSessionStart`, then reads it through `useSyncExternalStore` with the machine's own `subscribe` and `getSnapshot` passed as stable references rather than inline closures. Everything the markup needs is derived from that snapshot during render through pure selectors, and the two modal flags are read as lookup keys, so the component holds no `useState` mirroring the machine and no effect keeping the two in step.
 */
export function PlaySession({
  openings,
  selection,
  playScope,
  side,
  boardStyle,
  isAutoOpponentEnabled,
  areMovesShown,
  shownSection,
  tabsId,
}: SessionBodyProps) {
  const { t } = useTranslation();
  useSessionStart(() =>
    playMachine.start({
      openings,
      selection,
      playScope,
      side,
      autoOpponent: isAutoOpponentEnabled,
    }),
  );
  const snapshot = useSyncExternalStore(playMachine.subscribe, playMachine.getSnapshot);
  const boardWidth = useBoardWidth();

  const areArrowsVisible = snapshot.inBook && (areMovesShown || snapshot.manualReveal);
  const arrows = selectVisibleBookMoves(snapshot.nextBookMovesUci, areArrowsVisible).map((uci) =>
    uciToArrow(uci),
  );
  const lineLabel = selectLineLabel({
    opening: snapshot.uniqueOpening,
    variation: snapshot.uniqueVariation,
    line: snapshot.uniqueLine,
  });

  const CompletedNotice = COMPLETED_NOTICE_BY_STATE[`${snapshot.successOpen}`];
  const Actions = ACTIONS_BY_COMPLETION[`${snapshot.successOpen}`];
  const OutOfBookModal = OUT_OF_BOOK_MODAL_BY_STATE[`${snapshot.outOfBookOpen}`];

  return (
    <>
      <TabPanel idPrefix={tabsId} tabId="board" isSelected={shownSection === 'board'}>
        <div className="flex flex-col items-center gap-4 lg:items-start">
          <BoardView
            orientation={side}
            fen={snapshot.fen}
            onMove={(uci) => playMachine.playMove(uci) === ACCEPTED}
            arrows={arrows}
            highlightSquares={NO_HIGHLIGHTS}
            boardStyleId={boardStyle}
            boardWidth={boardWidth}
          />
          <div className="self-stretch">
            <CompletedNotice
              message={t(selectCompletionMessageKey(lineLabel), { line: lineLabel })}
            />
          </div>
        </div>
      </TabPanel>
      <TabPanel idPrefix={tabsId} tabId="status" isSelected={shownSection === 'status'}>
        <PlayBookPanel />
        <PlayStatusPanel
          isInBook={snapshot.inBook}
          candidateCount={snapshot.candidateCount}
          openingName={snapshot.uniqueOpening?.name}
          variationName={snapshot.uniqueVariation?.name}
          lineName={lineLabel}
        />
      </TabPanel>
      <ActionBar>
        <Actions
          isUndoAllowed={isUndoAllowed(snapshot.playedMovesUci.length, isAutoOpponentEnabled)}
        />
      </ActionBar>
      <OutOfBookModal />
    </>
  );
}

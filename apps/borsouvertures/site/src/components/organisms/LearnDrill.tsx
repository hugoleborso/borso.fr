import { type CSSProperties, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionBar } from '@/components/atoms/ActionBar';
import { BoardView } from '@/components/atoms/BoardView';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import { MoveButtonList } from '@/components/atoms/MoveButtonList';
import { TabPanel } from '@/components/atoms/TabPanel';
import { Notice } from '@/components/atoms/Notice';
import { LearnClearedActions } from '@/components/molecules/LearnClearedActions';
import { LearnDrillActions } from '@/components/molecules/LearnDrillActions';
import type { LearnDrillActionsProps } from '@/components/molecules/drill-actions.types';
import { LearnDrillPanel } from '@/components/molecules/LearnDrillPanel';
import { LearnDrillProgress } from '@/components/molecules/LearnDrillProgress';
import { LearnOutOfBookModal } from '@/components/molecules/LearnOutOfBookModal';
import type { ComponentByFlag, ComponentByKind } from '@/lib/componentTable.types';
import { useSessionStart } from '@/lib/session-start.hook';
import { useBoardWidth } from '@/lib/viewport.hook';
import { selectVisibleBookMoves } from '@/openings/bookArrows.utils';
import type { LearnDrillTarget } from '@/openings/learnSession.core';
import { learnTreeMachine } from '@/openings/machineInstances';
import type { TreeVisualization } from '@/openings/sessionStart.core';
import { uciToArrow } from '@/openings/uciSquare.utils';
import type { Side } from '@/state/persistedState.utils';
import type { BoardThemeId } from '@/theme/boardThemes.utils';
import type { SessionSection } from './session.types';

const NO_HIGHLIGHTS: Record<string, CSSProperties> = {};
const ACCEPTED = 'accepted';

// @FollowsBlueprint component-lookup-table
const CLEARED_NOTICE_BY_STATE: ComponentByFlag<{ message: string }> = {
  true: Notice,
  false: EmptySlot,
};

const ACTIONS_BY_CLEARED: ComponentByFlag<LearnDrillActionsProps> = {
  true: LearnClearedActions,
  false: LearnDrillActions,
};

interface MoveListProps {
  candidates: readonly string[];
  fen: string;
  onPick: (uci: string) => void;
}

const MOVE_LIST_BY_VISUALIZATION: ComponentByKind<TreeVisualization, MoveListProps> = {
  buttons: MoveButtonList,
  arrows: EmptySlot,
};

const OUT_OF_BOOK_MODAL_BY_STATE: ComponentByFlag<Record<string, never>> = {
  true: LearnOutOfBookModal,
  false: EmptySlot,
};

interface LearnDrillProps {
  target: LearnDrillTarget;
  side: Side;
  boardStyle: BoardThemeId;
  visualization: TreeVisualization;
  shownSection: SessionSection;
  tabsId: string;
}

// @FollowsBlueprint organism-machine-bound
export function LearnDrill({
  target,
  side,
  boardStyle,
  visualization,
  shownSection,
  tabsId,
}: LearnDrillProps) {
  const { t } = useTranslation();
  const { opening, variation } = target;
  useSessionStart(() => learnTreeMachine.start(variation, side));
  const snapshot = useSyncExternalStore(learnTreeMachine.subscribe, learnTreeMachine.getSnapshot);
  const boardWidth = useBoardWidth();

  const areArrowsVisible = visualization === 'arrows' && snapshot.showRevealedArrows;
  const arrows = selectVisibleBookMoves(snapshot.nextBookMovesUci, areArrowsVisible).map((uci) =>
    uciToArrow(uci),
  );

  const ClearedNotice = CLEARED_NOTICE_BY_STATE[`${snapshot.variationCleared}`];
  const Actions = ACTIONS_BY_CLEARED[`${snapshot.variationCleared}`];
  const MoveList = MOVE_LIST_BY_VISUALIZATION[visualization];
  const OutOfBookModal = OUT_OF_BOOK_MODAL_BY_STATE[`${snapshot.outOfBookOpen}`];

  return (
    <>
      <TabPanel idPrefix={tabsId} tabId="board" isSelected={shownSection === 'board'}>
        <div className="flex flex-col items-center gap-4 lg:items-start">
          <BoardView
            orientation={side}
            fen={snapshot.fen}
            onMove={(uci) => learnTreeMachine.playMove(uci) === ACCEPTED}
            arrows={arrows}
            highlightSquares={NO_HIGHLIGHTS}
            boardStyleId={boardStyle}
            boardWidth={boardWidth}
          />
          <div className="flex flex-col gap-3 self-stretch">
            <ClearedNotice message={t('learn.cleared.message')} />
            <MoveList
              candidates={snapshot.nextBookMovesUci}
              fen={snapshot.fen}
              onPick={(uci) => learnTreeMachine.playMove(uci)}
            />
          </div>
        </div>
      </TabPanel>
      <TabPanel idPrefix={tabsId} tabId="status" isSelected={shownSection === 'status'}>
        <LearnDrillPanel variationName={variation.name} />
        <LearnDrillProgress
          visitedCount={snapshot.visitedLeafIds.size}
          totalCount={variation.lines.length}
        />
      </TabPanel>
      <ActionBar>
        <Actions
          openingId={opening.id}
          variationId={variation.id}
          areArrowsRevealed={snapshot.showRevealedArrows}
        />
      </ActionBar>
      <OutOfBookModal />
    </>
  );
}

import { type CSSProperties, useSyncExternalStore } from 'react';
import { BoardView } from '@/components/atoms/BoardView';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import { MoveButtonList } from '@/components/atoms/MoveButtonList';
import { LearnClearedBanner } from '@/components/molecules/LearnClearedBanner';
import { LearnDrillPanel } from '@/components/molecules/LearnDrillPanel';
import { LearnDrillProgress } from '@/components/molecules/LearnDrillProgress';
import { LearnOutOfBookModal } from '@/components/molecules/LearnOutOfBookModal';
import type { ComponentByFlag, ComponentByKind } from '@/lib/componentTable.types';
import { useSessionStart } from '@/lib/useSessionStart';
import { useBoardWidth } from '@/lib/viewport';
import { selectVisibleBookMoves } from '@/openings/bookArrows.utils';
import type { LearnDrillTarget } from '@/openings/learnSession.core';
import { learnTreeMachine } from '@/openings/machineInstances';
import type { TreeVisualization } from '@/openings/sessionStart.core';
import { uciToArrow } from '@/openings/uciSquare.utils';
import type { Side } from '@/state/persistedState.utils';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

const NO_HIGHLIGHTS: Record<string, CSSProperties> = {};
const ACCEPTED = 'accepted';

interface ClearedBannerProps {
  openingId: string;
  variationId: string;
}

const CLEARED_BANNER_BY_STATE: ComponentByFlag<ClearedBannerProps> = {
  true: LearnClearedBanner,
  false: EmptySlot,
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
}

export function LearnDrill({ target, side, boardStyle, visualization }: LearnDrillProps) {
  const { opening, variation } = target;
  useSessionStart(() => learnTreeMachine.start(variation, side));
  const snapshot = useSyncExternalStore(learnTreeMachine.subscribe, learnTreeMachine.getSnapshot);
  const boardWidth = useBoardWidth();

  const areArrowsVisible = visualization === 'arrows' && snapshot.showRevealedArrows;
  const arrows = selectVisibleBookMoves(snapshot.nextBookMovesUci, areArrowsVisible).map((uci) =>
    uciToArrow(uci),
  );

  const ClearedBanner = CLEARED_BANNER_BY_STATE[`${snapshot.variationCleared}`];
  const MoveList = MOVE_LIST_BY_VISUALIZATION[visualization];
  const OutOfBookModal = OUT_OF_BOOK_MODAL_BY_STATE[`${snapshot.outOfBookOpen}`];

  return (
    <div className="layout">
      <div className="board-area">
        <ClearedBanner openingId={opening.id} variationId={variation.id} />
        <BoardView
          orientation={side}
          fen={snapshot.fen}
          onMove={(uci) => learnTreeMachine.playMove(uci) === ACCEPTED}
          arrows={arrows}
          highlightSquares={NO_HIGHLIGHTS}
          boardStyleId={boardStyle}
          boardWidth={boardWidth}
        />
      </div>
      <div className="play-aside">
        <LearnDrillPanel
          variationName={variation.name}
          areArrowsRevealed={snapshot.showRevealedArrows}
        />
        <MoveList
          candidates={snapshot.nextBookMovesUci}
          fen={snapshot.fen}
          onPick={(uci) => learnTreeMachine.playMove(uci)}
        />
        <LearnDrillProgress
          visitedCount={snapshot.visitedLeafIds.size}
          totalCount={variation.lines.length}
        />
      </div>
      <OutOfBookModal />
    </div>
  );
}

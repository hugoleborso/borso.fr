import { type CSSProperties, useSyncExternalStore } from 'react';
import { BoardView } from '@/components/atoms/BoardView';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import { PlayBookPanel } from '@/components/molecules/PlayBookPanel';
import { PlayCompletedBanner } from '@/components/molecules/PlayCompletedBanner';
import { PlayOutOfBookModal } from '@/components/molecules/PlayOutOfBookModal';
import { PlayStatusPanel } from '@/components/molecules/PlayStatusPanel';
import type { ComponentByFlag } from '@/lib/componentTable.types';
import { useSessionStart } from '@/lib/useSessionStart';
import { useBoardWidth } from '@/lib/viewport';
import { selectVisibleBookMoves } from '@/openings/bookArrows.utils';
import { playMachine } from '@/openings/machineInstances';
import { isUndoAllowed, selectLineLabel } from '@/openings/playSession.core';
import { uciToArrow } from '@/openings/uciSquare.utils';
import type { SessionBodyProps } from './session.types';

const NO_HIGHLIGHTS: Record<string, CSSProperties> = {};
const ACCEPTED = 'accepted';

// @FollowsBlueprint component-lookup-table
const COMPLETED_BANNER_BY_STATE: ComponentByFlag<{ lineLabel: string | undefined }> = {
  true: PlayCompletedBanner,
  false: EmptySlot,
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
}: SessionBodyProps) {
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

  const CompletedBanner = COMPLETED_BANNER_BY_STATE[`${snapshot.successOpen}`];
  const OutOfBookModal = OUT_OF_BOOK_MODAL_BY_STATE[`${snapshot.outOfBookOpen}`];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr] lg:items-start">
      <div className="flex flex-col items-center justify-center lg:block lg:row-span-2 lg:justify-self-start">
        <CompletedBanner lineLabel={lineLabel} />
        <BoardView
          orientation={side}
          fen={snapshot.fen}
          onMove={(uci) => playMachine.playMove(uci) === ACCEPTED}
          arrows={arrows}
          highlightSquares={NO_HIGHLIGHTS}
          boardStyleId={boardStyle}
          boardWidth={boardWidth}
        />
      </div>
      <div className="flex flex-col gap-4">
        <PlayBookPanel
          isUndoAllowed={isUndoAllowed(snapshot.playedMovesUci.length, isAutoOpponentEnabled)}
        />
        <PlayStatusPanel
          isInBook={snapshot.inBook}
          candidateCount={snapshot.candidateCount}
          openingName={snapshot.uniqueOpening?.name}
          variationName={snapshot.uniqueVariation?.name}
          lineName={lineLabel}
        />
      </div>
      <OutOfBookModal />
    </div>
  );
}

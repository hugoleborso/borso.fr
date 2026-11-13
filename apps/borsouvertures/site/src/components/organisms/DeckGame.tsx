import { type CSSProperties, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import type { Arrow } from 'react-chessboard';
import { ActionBar } from '@/components/atoms/ActionBar';
import { BoardView } from '@/components/atoms/BoardView';
import { Button } from '@/components/atoms/Button';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import { Panel } from '@/components/atoms/Panel';
import { StatusBand } from '@/components/atoms/StatusBand';
import { OpponentStrengthSelect } from '@/components/molecules/OpponentStrengthSelect';
import type { BuiltDeck } from '@/decks/deck.utils';
import type { ComponentByFlag } from '@/lib/componentTable.types';
import { useBoardWidth } from '@/lib/viewport.hook';
import { deckGameMachine } from '@/opponent/deck-game-machine.setup';
import {
  type DeckGameSnapshot,
  type DeckGameStatus,
  isDeckGameMoveAccepted,
  isDeckGameOn,
  type MoveSource,
  selectDeckGameStatus,
} from '@/opponent/deck-game-machine.utils';
import { useAppState } from '@/state/appState';

const NO_ARROWS: Arrow[] = [];
const NO_HIGHLIGHTS: Record<string, CSSProperties> = {};

const STATUS_KEY_BY_STATUS = {
  'reader-to-move': 'opponent.status.reader-to-move',
  'book-moving': 'opponent.status.book-moving',
  'stockfish-moving': 'opponent.status.stockfish-moving',
  'reader-won': 'opponent.status.reader-won',
  'opponent-won': 'opponent.status.opponent-won',
  draw: 'opponent.status.draw',
  'stockfish-unavailable': 'opponent.status.stockfish-unavailable',
  'stockfish-illegal-move': 'opponent.status.stockfish-illegal-move',
} as const satisfies Record<DeckGameStatus, string>;

const SOURCE_KEY_BY_SOURCE = {
  book: 'opponent.source.book',
  stockfish: 'opponent.source.stockfish',
} as const satisfies Record<MoveSource, string>;

const LAST_MOVE_KEY_BY_SOURCE = {
  book: 'opponent.last-move.book',
  stockfish: 'opponent.last-move.stockfish',
} as const satisfies Record<MoveSource, string>;

interface DeckGameBodyProps {
  deck: BuiltDeck;
  snapshot: DeckGameSnapshot;
}

function isReaderMoveAccepted(uci: string): boolean {
  return isDeckGameMoveAccepted(deckGameMachine.playMove(uci));
}

function DeckGameStart({ deck }: DeckGameBodyProps) {
  const { t } = useTranslation();
  const { opponentStrength } = useAppState();
  return (
    <div className="flex flex-col gap-4">
      <OpponentStrengthSelect strength={opponentStrength} />
      <Button
        label={t('opponent.start')}
        variant="primary"
        onActivate={() => deckGameMachine.start(deck)}
      />
    </div>
  );
}

function DeckGameControls({ deck, snapshot }: DeckGameBodyProps) {
  const { t } = useTranslation();
  const { opponentStrength } = useAppState();
  const { lastOpponentMove } = snapshot;
  return (
    <div className="flex flex-col gap-4 w-full">
      <div role="status" aria-live="polite" className="flex flex-col gap-1">
        <StatusBand
          label={t(SOURCE_KEY_BY_SOURCE[snapshot.moveSource])}
          value={t(STATUS_KEY_BY_STATUS[selectDeckGameStatus(snapshot)])}
          tone="asking"
        />
        {lastOpponentMove === null ? null : (
          <p className="text-sm text-ink-muted">
            {t(LAST_MOVE_KEY_BY_SOURCE[lastOpponentMove.source], {
              move: lastOpponentMove.notation,
            })}
          </p>
        )}
      </div>
      <ActionBar>
        <Button label={t('opponent.new-game')} onActivate={() => deckGameMachine.start(deck)} />
        <Button label={t('opponent.leave')} onActivate={deckGameMachine.leave} />
      </ActionBar>
      <OpponentStrengthSelect strength={opponentStrength} />
    </div>
  );
}

function DeckGameBoard({ snapshot }: DeckGameBodyProps) {
  const { boardStyle } = useAppState();
  const boardWidth = useBoardWidth();
  return (
    <BoardView
      orientation={snapshot.readerSide}
      fen={snapshot.fen}
      onMove={isReaderMoveAccepted}
      arrows={NO_ARROWS}
      highlightSquares={NO_HIGHLIGHTS}
      boardStyleId={boardStyle}
      boardWidth={boardWidth}
    />
  );
}

// @FollowsBlueprint component-lookup-table
const CONTROLS_BY_GAME_ON: ComponentByFlag<DeckGameBodyProps> = {
  true: DeckGameControls,
  false: DeckGameStart,
};

const BOARD_BY_GAME_ON: ComponentByFlag<DeckGameBodyProps> = {
  true: DeckGameBoard,
  false: EmptySlot,
};

interface DeckGameProps {
  deck: BuiltDeck;
}

// @FollowsBlueprint organism-machine-bound
export function DeckGame({ deck }: DeckGameProps) {
  const { t } = useTranslation();
  const snapshot = useSyncExternalStore(deckGameMachine.subscribe, deckGameMachine.getSnapshot);
  const isGameOn = isDeckGameOn(snapshot, deck.id);
  const Controls = CONTROLS_BY_GAME_ON[`${isGameOn}`];
  const Board = BOARD_BY_GAME_ON[`${isGameOn}`];
  return (
    <Panel title={t('opponent.title')}>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-8 lg:items-start">
        <Board deck={deck} snapshot={snapshot} />
        <Controls deck={deck} snapshot={snapshot} />
      </div>
    </Panel>
  );
}

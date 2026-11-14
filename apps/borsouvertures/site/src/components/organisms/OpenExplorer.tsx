import { type CSSProperties, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionBar } from '@/components/atoms/ActionBar';
import { BoardView } from '@/components/atoms/BoardView';
import { Button } from '@/components/atoms/Button';
import { Notice } from '@/components/atoms/Notice';
import { ToggleSlider } from '@/components/atoms/ToggleSlider';
import { ExplorerCandidateRow } from '@/components/molecules/ExplorerCandidateRow';
import { IconButton } from '@/components/molecules/IconButton';
import { formatNumberedLine } from '@/decks/card.core';
import {
  applyExplorerMove,
  type ExplorerLevel,
  type ExplorerLine,
  listCandidateMoves,
  selectExplorerPosition,
  selectLastMoveSquares,
  takeBackMove,
} from '@/explorer/explorer.core';
import { replaceExplorerMoves, useExplorerMoves } from '@/explorer/explorer.store';
import { useStockfishEvaluation } from '@/lib/queries/stockfish-evaluation.queries';
import { useBoardWidth } from '@/lib/viewport.hook';
import { uciToArrow } from '@/openings/uciSquare.utils';
import { selectShownEvaluationBar } from '@/opponent/stockfish-evaluation.core';
import { checkLineAdd, type LineAddRefusal } from '@/personal-deck/personal-deck.core';
import { recordDeckLineChange } from '@/personal-deck/personal-deck-effects.setup';
import { usePersonalLines } from '@/personal-deck/personal-decks.hook';
import { setSide, useAppState } from '@/state/appState';
import type { Side } from '@/state/persistedState.utils';
import { getBoardAppearance } from '@/theme/boardAppearance';

const NO_MOVES: readonly string[] = [];

const GROUP_TITLE_KEY_BY_LEVEL = {
  opening: 'explore.groups.opening',
  variation: 'explore.groups.variation',
  line: 'explore.groups.line',
} as const satisfies Record<ExplorerLevel, string>;

const REFUSAL_KEY_BY_REASON = {
  illegal: 'explore.add.illegal',
  'no-reader-move': 'explore.add.no-reader-move',
  'already-in-deck': 'explore.add.already-in-deck',
  conflicts: 'explore.add.conflicts',
} as const satisfies Record<LineAddRefusal, string>;

const SIDE_KEY_BY_SIDE = {
  white: 'explore.side.white',
  black: 'explore.side.black',
} as const satisfies Record<Side, string>;

// @FollowsBlueprint component-lookup-table
const SIDE_BY_IS_BLACK: Record<`${boolean}`, Side> = { true: 'black', false: 'white' };

const PAGE_CHROME_REM = 16.25;
const INLINE_ACTION_BAR_REM = 3.5;

type ExplorerListStyle = CSSProperties &
  Record<'--explorer-list-phone-height' | '--explorer-list-beside-board-height', string>;

interface OpenExplorerProps {
  lines: ExplorerLine[];
}

// @FollowsBlueprint organism-history-one-page-at-a-time
export function OpenExplorer({ lines }: OpenExplorerProps) {
  const { t } = useTranslation();
  const { side, boardStyle, isEvaluationBarShown, isMoveSoundOn } = useAppState();
  const boardWidth = useBoardWidth(isEvaluationBarShown);
  const playedMovesUci = useExplorerMoves();
  const personalLines = usePersonalLines();
  const [notice, setNotice] = useState<string | null>(null);
  const position = useMemo(
    () => selectExplorerPosition(lines, playedMovesUci),
    [lines, playedMovesUci],
  );
  const evaluationReading = useStockfishEvaluation(position.fen, isEvaluationBarShown);
  const { theme } = getBoardAppearance(boardStyle);
  const addCheck = checkLineAdd(personalLines, { side, movesUci: playedMovesUci });
  const isAddBlocked =
    playedMovesUci.length === 0 || (!addCheck.ok && addCheck.reason === 'already-in-deck');
  const openingName = position.lastNamed?.name ?? t('explore.unnamed');
  const movePath =
    position.movesSan.length === 0 ? t('explore.start') : formatNumberedLine(position.movesSan);
  const highlightSquares = Object.fromEntries(
    selectLastMoveSquares(playedMovesUci).map((square) => [
      square,
      { backgroundColor: theme.highlight },
    ]),
  );
  const listStyle: ExplorerListStyle = {
    '--explorer-list-phone-height': `calc(100dvh - ${String(boardWidth)}px - ${String(PAGE_CHROME_REM)}rem - env(safe-area-inset-top) - env(safe-area-inset-bottom))`,
    '--explorer-list-beside-board-height': `calc(${String(boardWidth)}px - ${String(INLINE_ACTION_BAR_REM)}rem)`,
  };

  function showMoves(nextMovesUci: readonly string[]): void {
    setNotice(null);
    replaceExplorerMoves(nextMovesUci);
  }

  function didPlayMove(uci: string): boolean {
    const nextMovesUci = applyExplorerMove(playedMovesUci, uci);
    if (nextMovesUci === null) return false;
    showMoves(nextMovesUci);
    return true;
  }

  function addLine(): void {
    if (!addCheck.ok) {
      setNotice(t(REFUSAL_KEY_BY_REASON[addCheck.reason], { move: addCheck.conflictingMoveSan }));
      return;
    }
    recordDeckLineChange({
      kind: 'line-added',
      side,
      movesUci: playedMovesUci,
      openingName: position.lastNamed?.name ?? null,
    });
    setNotice(t('explore.add.added', { side: t(SIDE_KEY_BY_SIDE[side]) }));
  }

  return (
    <section
      aria-label={t('explore.title')}
      className="flex flex-col gap-2 w-full lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-x-8 lg:items-start"
    >
      <div className="flex items-center justify-between gap-3 pt-2 border-t-2 border-ink lg:col-span-2">
        <div className="flex flex-col min-w-0" aria-live="polite">
          <h2 className="h-[2.8125rem] text-lg font-bold leading-tight line-clamp-2">
            {openingName}
          </h2>
          <p className="font-mono text-sm text-ink-muted truncate">{movePath}</p>
        </div>
        <ToggleSlider
          isOn={side === 'black'}
          onToggle={(isBlack) => setSide(SIDE_BY_IS_BLACK[`${isBlack}`])}
          leftLabel={t('explore.side.white')}
          rightLabel={t('explore.side.black')}
          ariaLabel={t('explore.side.aria-label')}
        />
      </div>
      <BoardView
        orientation={side}
        fen={position.fen}
        onMove={didPlayMove}
        mover="both"
        arrows={listCandidateMoves(position).map((uci) => uciToArrow(uci))}
        highlightSquares={highlightSquares}
        boardStyleId={boardStyle}
        boardWidth={boardWidth}
        mark={null}
        evaluationBar={selectShownEvaluationBar(isEvaluationBarShown, evaluationReading, side)}
        isMoveSoundOn={isMoveSoundOn}
      />
      <div className="flex flex-col gap-2 w-full min-w-0">
        <div
          className="flex flex-col gap-2 overflow-y-auto overscroll-contain max-h-(--explorer-list-phone-height) lg:max-h-(--explorer-list-beside-board-height)"
          style={listStyle}
        >
          {notice === null ? null : <Notice message={notice} />}
          {position.isInBook ? null : (
            <p className="text-sm font-bold" role="status">
              {t('explore.out-of-book')}
            </p>
          )}
          {position.groups.map((group) => (
            <section
              key={`${position.fen}:${group.level}`}
              aria-label={t(GROUP_TITLE_KEY_BY_LEVEL[group.level])}
            >
              <h3 className="sticky top-0 z-[1] py-1 bg-page text-sm font-bold uppercase tracking-[0.06em] text-ink-muted">
                {t(GROUP_TITLE_KEY_BY_LEVEL[group.level])}
              </h3>
              {group.candidates.map((candidate) => (
                <ExplorerCandidateRow
                  key={candidate.moveUci}
                  candidate={candidate}
                  plyIndex={playedMovesUci.length}
                  side={side}
                  boardStyle={boardStyle}
                  onPlay={didPlayMove}
                />
              ))}
            </section>
          ))}
        </div>
        <ActionBar>
          <div className="flex gap-3 [&>*]:flex-1">
            <IconButton
              label={t('explore.back')}
              icon="undo"
              variant="outlined"
              isDisabled={playedMovesUci.length === 0}
              onActivate={() => showMoves(takeBackMove(playedMovesUci))}
            />
            <IconButton
              label={t('explore.reset')}
              icon="restart"
              variant="outlined"
              isDisabled={playedMovesUci.length === 0}
              onActivate={() => showMoves(NO_MOVES)}
            />
          </div>
          <Button
            label={t('explore.add.action')}
            variant="primary"
            isDisabled={isAddBlocked}
            onActivate={addLine}
          />
        </ActionBar>
      </div>
    </section>
  );
}

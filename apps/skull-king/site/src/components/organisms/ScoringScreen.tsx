import { useTranslation } from 'react-i18next';
import { selectCardCount } from '@domain/round.core';
import { cycleBonus, selectNextBidAdjustment, stepRascalBet } from '@site/lib/game-edits.core';
import { selectRound } from '@site/lib/game-scores.core';
import type { GameEntry, GameView } from '@site/lib/game-view.core';
import {
  useMovePhase,
  useReadLatestEntry,
  useWriteEntry,
  useWriteRound,
} from '@site/lib/queries/game.queries';
import { readRejectionCode } from '@site/lib/rejection-code.core';
import {
  isHarryLocked,
  isRascalLocked,
  selectClosingMove,
  selectMadeToggleEdit,
  selectRoundCheck,
  selectRoundEntries,
} from '@site/lib/round-results.core';
import { Button } from '../atoms/Button';
import { ErrorNote } from '../atoms/ErrorNote';
import { Glyph } from '../atoms/Glyph';
import { ScreenHeader } from '../atoms/ScreenHeader';
import { TrickTally } from '../atoms/TrickTally';
import { DiscardToggles } from '../molecules/DiscardToggles';
import { ResultCard } from './ResultCard';

export interface ScoringScreenProps {
  readonly game: GameView;
  readonly onScores: () => void;
  readonly onRoundClosed: () => void;
}

// @FollowsBlueprint organism-query-owning
export function ScoringScreen({ game, onScores, onRoundClosed }: ScoringScreenProps) {
  const { t } = useTranslation();
  const writeEntry = useWriteEntry(game.joinCode);
  const writeRound = useWriteRound(game.joinCode);
  const movePhase = useMovePhase(game.joinCode);
  const readLatestEntry = useReadLatestEntry(game.joinCode);

  const roundNumber = game.currentRound;
  const round = selectRound(game, roundNumber) ?? {
    number: roundNumber,
    cardCount: selectCardCount(roundNumber, game.players.length),
    isKrakenPlayed: false,
    isWhiteWhaleDiscard: false,
    entries: [],
  };
  const roundEntries = selectRoundEntries(
    round,
    game.players.map((player) => player.id),
  );
  const readLatest = (playerId: string, rendered: GameEntry): GameEntry =>
    readLatestEntry(roundNumber, playerId) ?? rendered;
  const check = selectRoundCheck({ ...round, entries: roundEntries });

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <header className="px-4 pt-4 pb-3">
        <ScreenHeader title={t('common.round', { number: roundNumber })}>
          <div className="flex gap-2">
            <Button
              variant="surface"
              aria-label={t('scoring.backToBids')}
              onClick={() => {
                movePhase.mutate({ round: roundNumber, phase: 'bidding' });
              }}
            >
              <Glyph name="pencil" className="size-5" />
            </Button>
            <Button variant="surface" aria-label={t('common.scores')} onClick={onScores}>
              <Glyph name="chart" className="size-5" />
            </Button>
          </div>
        </ScreenHeader>
      </header>

      <div className="flex flex-1 flex-col gap-2 px-4 pb-2">
        {game.players.map((player, seat) => {
          const entry = roundEntries[seat];
          if (entry === undefined) return null;
          return (
            <ResultCard
              key={player.id}
              player={player}
              entry={entry}
              cardCount={round.cardCount}
              isHarryLocked={isHarryLocked(roundEntries, entry)}
              isRascalLocked={isRascalLocked(roundEntries, entry)}
              onToggle={() => {
                writeEntry.mutate({
                  roundNumber,
                  playerId: player.id,
                  edit: selectMadeToggleEdit(readLatest(player.id, entry)),
                });
              }}
              onTricks={(tricks) => {
                writeEntry.mutate({
                  roundNumber,
                  playerId: player.id,
                  edit: { isMissed: true, tricks },
                });
              }}
              onCycleBonus={(kind) => {
                writeEntry.mutate({
                  roundNumber,
                  playerId: player.id,
                  edit: { bonuses: cycleBonus(readLatest(player.id, entry).bonuses, kind) },
                });
              }}
              onAdjustBid={(picked) => {
                writeEntry.mutate({
                  roundNumber,
                  playerId: player.id,
                  edit: {
                    bidAdjustment: selectNextBidAdjustment(
                      readLatest(player.id, entry).bidAdjustment,
                      picked,
                    ),
                  },
                });
              }}
              onStepRascalBet={(step) => {
                writeEntry.mutate({
                  roundNumber,
                  playerId: player.id,
                  edit: { rascalBet: stepRascalBet(readLatest(player.id, entry).rascalBet, step) },
                });
              }}
            />
          );
        })}
        <ErrorNote
          code={readRejectionCode(writeEntry.error ?? writeRound.error ?? movePhase.error)}
        />
      </div>

      <footer className="sticky bottom-0 flex items-center gap-2 border-t border-surface-2 px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-ground">
        <TrickTally
          counted={check.counted}
          expected={check.expected}
          isBalanced={check.isBalanced}
          label={t('scoring.tally', { counted: check.counted, expected: check.expected })}
          size="large"
        />
        <DiscardToggles
          round={round}
          onChange={(edit) => {
            writeRound.mutate({ roundNumber, edit });
          }}
        />
        <Button
          variant="primary"
          aria-label={check.isBalanced ? t('scoring.close') : t('scoring.closeBlocked')}
          disabled={!check.isBalanced}
          className="flex-1"
          onClick={() => {
            movePhase.mutate(selectClosingMove(roundNumber));
            onRoundClosed();
          }}
        >
          <Glyph name="check" className="size-6.5" strokeWidth={3} />
        </Button>
      </footer>
    </div>
  );
}

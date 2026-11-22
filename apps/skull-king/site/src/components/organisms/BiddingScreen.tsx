import { useTranslation } from 'react-i18next';
import { isEveryBidPlaced, ROUND_COUNT, selectCardCount } from '@domain/round.core';
import { selectEntry, selectRound, sumBids } from '@site/lib/game-scores.core';
import type { GameView } from '@site/lib/game-view.core';
import { useMovePhase, useWriteEntry } from '@site/lib/queries/game.queries';
import { readRejectionCode } from '@site/lib/rejection-code.core';
import clsx from 'clsx';
import { Button } from '../atoms/Button';
import { ErrorNote } from '../atoms/ErrorNote';
import { Glyph } from '../atoms/Glyph';
import { PlayerMark } from '../atoms/PlayerMark';
import { ProgressBar } from '../atoms/ProgressBar';
import { ScreenHeader } from '../atoms/ScreenHeader';
import { ChipRow } from '../molecules/ChipRow';

export interface BiddingScreenProps {
  readonly game: GameView;
  readonly onScores: () => void;
}

// @FollowsBlueprint organism-query-owning
export function BiddingScreen({ game, onScores }: BiddingScreenProps) {
  const { t } = useTranslation();
  const writeEntry = useWriteEntry(game.joinCode);
  const movePhase = useMovePhase(game.joinCode);
  const roundNumber = game.currentRound;
  const round = selectRound(game, roundNumber);
  const cardCount = round?.cardCount ?? selectCardCount(roundNumber, game.players.length);
  const bidSum = round === null ? 0 : sumBids(round);
  const canPlay = round !== null && isEveryBidPlaced(round.entries);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <header className="flex flex-col gap-3.5 px-4 pt-4 pb-5">
        <ScreenHeader title={t('common.round', { number: roundNumber })}>
          <Button variant="surface" aria-label={t('common.scores')} onClick={onScores}>
            <Glyph name="chart" className="size-5" />
          </Button>
        </ScreenHeader>
        <ProgressBar
          current={roundNumber}
          total={ROUND_COUNT}
          label={t('common.roundProgress', { number: roundNumber, total: ROUND_COUNT })}
        />
      </header>

      <div className="flex flex-1 flex-col gap-3.5 px-4">
        {game.players.map((player) => {
          const bid = round === null ? null : (selectEntry(round, player.id)?.bid ?? null);
          return (
            <div key={player.id} className="flex items-center gap-3">
              <PlayerMark
                icon={player.icon}
                color={player.color}
                size="large"
                emphasis={bid === null ? 'ringed' : 'plain'}
              />
              <ChipRow
                label={t('bidding.bidOf', { name: player.name })}
                highest={cardCount}
                chosen={bid}
                blocked={null}
                tone="accent"
                surface="ground"
                onPick={(value) => {
                  writeEntry.mutate({
                    roundNumber,
                    playerId: player.id,
                    edit: { bid: value === bid ? null : value },
                  });
                }}
              />
            </div>
          );
        })}
        <ErrorNote code={readRejectionCode(writeEntry.error ?? movePhase.error)} />
      </div>

      <footer className="sticky bottom-0 flex items-center gap-3 px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-ground">
        <span
          aria-label={t('bidding.bidSum', { count: bidSum, total: cardCount })}
          className={clsx(
            'min-w-18 text-3xl font-extrabold tabular-nums',
            bidSum === cardCount ? 'text-made' : 'text-text',
          )}
        >
          {bidSum}
          <span className="text-base text-muted-2"> / {cardCount}</span>
        </span>
        <Button
          variant="primary"
          aria-label={canPlay ? t('bidding.play') : t('bidding.playBlocked')}
          disabled={!canPlay}
          className="flex-1"
          onClick={() => {
            movePhase.mutate({ round: roundNumber, phase: 'scoring' });
          }}
        >
          <Glyph name="play" className="size-6" />
        </Button>
      </footer>
    </div>
  );
}

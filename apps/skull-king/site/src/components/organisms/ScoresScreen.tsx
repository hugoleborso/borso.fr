import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  selectLeaderIds,
  selectRound,
  selectScoredRounds,
  selectStandings,
} from '@site/lib/game-scores.core';
import type { GameView } from '@site/lib/game-view.core';
import { canClaimSeat, isMySeat } from '@site/lib/my-games.core';
import { useClaimSeat, useMe } from '@site/lib/queries/account.queries';
import { useRematch } from '@site/lib/queries/game.queries';
import { readRejectionCode } from '@site/lib/rejection-code.core';
import { hasUnbalancedClosedRound } from '@site/lib/round-results.core';
import { Button } from '../atoms/Button';
import { ErrorNote } from '../atoms/ErrorNote';
import { Glyph } from '../atoms/Glyph';
import { NamedMark } from '../atoms/NamedMark';
import { ScreenHeader } from '../atoms/ScreenHeader';
import { RankingTile } from '../molecules/RankingTile';
import { ScoreGrid } from '../molecules/ScoreGrid';
import { ShareButton } from '../molecules/ShareButton';
import { EntryCorrectionSheet } from './EntryCorrectionSheet';

export interface ScoresScreenProps {
  readonly game: GameView;
  readonly onContinue: () => void;
  readonly onRematch: (joinCode: string) => void;
}

interface OpenCell {
  readonly roundNumber: number;
  readonly playerId: string;
}

// @FollowsBlueprint organism-query-owning
export function ScoresScreen({ game, onContinue, onRematch }: ScoresScreenProps) {
  const { t } = useTranslation();
  const rematch = useRematch(game.joinCode);
  const claimSeat = useClaimSeat(game.joinCode);
  const accountId = useMe().data?.id ?? null;
  const isClaimable = canClaimSeat(game, accountId);
  const [openCell, setOpenCell] = useState<OpenCell | null>(null);
  const standings = selectStandings(game);
  const leaderIds = selectLeaderIds(standings);
  const isFinished = game.phase === 'finished';
  const isBlocked = hasUnbalancedClosedRound(game);
  const winners = game.players.filter((player) => leaderIds.includes(player.id));
  const openRound = openCell === null ? null : selectRound(game, openCell.roundNumber);
  const openPlayer = game.players.find((player) => player.id === openCell?.playerId);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <header className="px-4 pt-4 pb-3">
        <ScreenHeader title={t('common.scores')}>
          <ShareButton joinCode={game.joinCode} variant="surface" />
        </ScreenHeader>
      </header>

      {isFinished ? (
        <section
          aria-label={t('scores.winner')}
          className="flex flex-col items-center gap-2 px-4 pb-4"
        >
          <Glyph name="crown" className="size-8 text-accent" />
          <div className="flex flex-wrap justify-center gap-4">
            {winners.map((winner) => (
              <NamedMark
                key={winner.id}
                avatar={winner.avatar}
                color={winner.color}
                name={winner.name}
                size="big"
                layout="under"
                nameStyle="title"
                emphasis="ringed"
              />
            ))}
          </div>
        </section>
      ) : null}

      <ol className="m-0 grid list-none grid-cols-4 gap-2 px-4 pb-4">
        {standings.map((standing) => (
          <RankingTile
            key={standing.player.id}
            standing={standing}
            isLeader={leaderIds.includes(standing.player.id)}
            isMine={isMySeat(standing.player, accountId)}
            claimLabel={isClaimable ? t('account.claimSeat') : null}
            onClaim={() => {
              if (accountId === null) return;
              claimSeat.mutate({ playerId: standing.player.id, accountId });
            }}
          />
        ))}
      </ol>

      <div className="flex-1 sm:px-4">
        <ScoreGrid
          players={game.players}
          rounds={selectScoredRounds(game)}
          onOpenCell={(roundNumber, playerId) => {
            setOpenCell({ roundNumber, playerId });
          }}
        />
      </div>

      <footer className="sticky bottom-0 flex flex-col gap-3 px-4 pt-3 border-t border-outline pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-planks">
        <ErrorNote code={readRejectionCode(rematch.error ?? claimSeat.error)} />
        {isFinished ? (
          <Button
            variant="primary"
            className="w-full"
            disabled={rematch.isPending}
            onClick={() => {
              rematch.mutate(undefined, {
                onSuccess: (next) => {
                  onRematch(next.joinCode);
                },
              });
            }}
          >
            <Glyph name="replay" className="size-6" />
            {t('scores.rematch')}
          </Button>
        ) : (
          <Button
            variant="primary"
            className="w-full"
            disabled={isBlocked}
            aria-label={isBlocked ? t('scores.continueBlocked') : undefined}
            onClick={onContinue}
          >
            <Glyph name="play" />
            {t('common.round', { number: game.currentRound })}
          </Button>
        )}
      </footer>

      {openRound === null || openPlayer === undefined ? null : (
        <EntryCorrectionSheet
          joinCode={game.joinCode}
          round={openRound}
          player={openPlayer}
          onClose={() => {
            setOpenCell(null);
          }}
        />
      )}
    </div>
  );
}

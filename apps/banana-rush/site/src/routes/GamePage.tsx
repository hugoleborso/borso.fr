import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { normalizeJoinCode } from '@api/games/join-code.utils';
import { ChunkyButton } from '@site/components/atoms/ChunkyButton';
import { ErrorNote } from '@site/components/atoms/ErrorNote';
import { AppShell } from '@site/components/organisms/AppShell';
import { FinalScoreboard } from '@site/components/organisms/FinalScoreboard';
import { GameBoard } from '@site/components/organisms/GameBoard';
import { RoundRecap } from '@site/components/organisms/RoundRecap';
import { JoinGameForm } from '@site/components/organisms/JoinGameForm';
import { LobbyPanel } from '@site/components/organisms/LobbyPanel';
import { readRejectionCode } from '@site/lib/rejection-code.core';
import { useGameSocket } from '@site/lib/game-socket.hook';
import { loadSeat } from '@site/lib/player-session.store';
import {
  useClaimRematchSeat,
  useConfig,
  useGame,
  useJoinGame,
  usePlaceBid,
  useRematch,
  useResolveRound,
  useStartGame,
} from '@site/lib/queries/game.queries';
import { useRoundClock } from '@site/lib/round-clock.hook';
import { isJoinable, isRoundOver } from '@site/lib/game-phase.core';

/**
 * @Blueprint route-owning-its-live-connection
 * @BlueprintName Route Owning Its Live Connection
 * @BlueprintUsage Use for the one screen in an application that has to stay current with what other people are doing.
 * @BlueprintDescription Opens the push channel at the level that owns the record and lets every organism below read the same cache key, so no update is threaded through props and no child knows a socket exists. The seat is read from browser storage rather than from the address, which is what lets a player close the page and come back to the same monkey; a reader with no seat is shown the join form instead of being turned away, so one address serves both the invitation and the game. The only effect here fires the request a passing deadline calls for, guarded so a countdown sitting at zero asks once rather than on every tick.
 */
export function GamePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { code: rawCode } = useParams();
  const joinCode = normalizeJoinCode(rawCode ?? '');

  const seat = loadSeat(joinCode);
  const token = seat?.playerToken ?? null;

  const config = useConfig();
  const gameQuery = useGame(joinCode, token);
  useGameSocket(config.data?.websocketUrl ?? null, joinCode, token);

  const game = gameQuery.data;
  const startGame = useStartGame(joinCode, token ?? '');
  const placeBid = usePlaceBid(joinCode, token ?? '');
  const resolveRound = useResolveRound(joinCode, token ?? '');
  const rematch = useRematch(joinCode, token ?? '');
  const claimRematchSeat = useClaimRematchSeat(joinCode, token ?? '');
  const joinGame = useJoinGame();
  const [isRecapOpen, setIsRecapOpen] = useState(false);

  const secondsRemaining = useRoundClock(
    game?.roundOpenedAt ?? null,
    game?.roundTimerSeconds ?? null,
  );

  const askedForRound = useRef<number | null>(null);
  const isRoundExpired = isRoundOver(secondsRemaining, game?.status ?? null);
  const currentRound = game?.currentRound ?? null;

  // eslint-disable-next-line borso/no-use-effect -- synchronises with an external system: the round deadline passed on the wall clock and the server has to be told, which is a request rather than anything this component renders
  useEffect(() => {
    if (!isRoundExpired || currentRound === null || token === null) return;
    if (askedForRound.current === currentRound) return;
    askedForRound.current = currentRound;
    resolveRound.mutate(undefined, {
      onError: () => {
        askedForRound.current = null;
      },
    });
  }, [isRoundExpired, currentRound, token, resolveRound]);

  const rematchJoinCode = game?.rematchJoinCode ?? null;
  const claimedRematch = useRef<string | null>(null);

  // eslint-disable-next-line borso/no-use-effect -- synchronises with an external system: the rematch is announced by another phone over the socket, and this phone has to exchange its old token for the seat waiting for it before it can render the new table
  useEffect(() => {
    if (rematchJoinCode === null || token === null) return;
    if (claimedRematch.current === rematchJoinCode) return;
    if (loadSeat(rematchJoinCode) !== null) return;
    claimedRematch.current = rematchJoinCode;
    claimRematchSeat.mutate(undefined, {
      onSuccess: (seated) => {
        void navigate(`/partie/${seated.game.joinCode}`);
      },
      onError: () => {
        claimedRematch.current = null;
      },
    });
  }, [rematchJoinCode, token, claimRematchSeat, navigate]);

  const areYouSeated =
    seat !== null && game?.players.some((player) => player.id === seat.playerId) === true;
  const isHost = game?.players.find((player) => player.id === seat?.playerId)?.isHost ?? false;

  if (gameQuery.isPending) {
    return (
      <AppShell>
        <p className="py-16 text-center text-lg font-bold text-ink-soft">{t('common.loading')}</p>
      </AppShell>
    );
  }

  if (game === undefined) {
    return (
      <AppShell>
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-4">
          <ErrorNote code={readRejectionCode(gameQuery.error)} />
          <ChunkyButton
            tone="peel"
            onClick={() => {
              void gameQuery.refetch();
            }}
          >
            {t('errors.reload')}
          </ChunkyButton>
        </div>
      </AppShell>
    );
  }

  if (isJoinable(areYouSeated, game.status)) {
    return (
      <AppShell>
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <h1 className="shrink-0 text-2xl font-black">
            {t('join.title', { code: game.joinCode })}
          </h1>
          <ErrorNote code={readRejectionCode(joinGame.error)} />
          <JoinGameForm
            takenAvatars={game.players.map((player) => player.avatar)}
            submitting={joinGame.isPending}
            onSubmit={(values) => {
              joinGame.mutate({ joinCode, body: values });
            }}
          />
        </div>
      </AppShell>
    );
  }

  const isWaitingInLobby = game.status === 'lobby';
  const isPlaying = game.status === 'playing';
  const isFinished = game.status === 'finished';

  return (
    <AppShell>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <ErrorNote code={readRejectionCode(placeBid.error ?? startGame.error ?? rematch.error)} />
        {isWaitingInLobby ? (
          <LobbyPanel
            game={game}
            isHost={isHost}
            starting={startGame.isPending}
            onStart={() => {
              startGame.mutate(undefined);
            }}
          />
        ) : null}
        {isPlaying ? (
          <GameBoard
            game={game}
            secondsRemaining={secondsRemaining}
            submitting={placeBid.isPending}
            onBid={(amount) => {
              placeBid.mutate(amount);
            }}
          />
        ) : null}
        {isFinished && isRecapOpen ? (
          <RoundRecap
            game={game}
            onClose={() => {
              setIsRecapOpen(false);
            }}
          />
        ) : null}
        {isFinished && !isRecapOpen ? (
          <FinalScoreboard
            game={game}
            playingAgain={rematch.isPending || claimRematchSeat.isPending}
            onRecap={() => {
              setIsRecapOpen(true);
            }}
            onPlayAgain={() => {
              rematch.mutate(undefined);
            }}
            onHome={() => {
              void navigate('/');
            }}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

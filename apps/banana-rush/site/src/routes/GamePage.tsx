import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { normalizeJoinCode } from '@api/games/join-code.utils';
import { ErrorNote } from '@site/components/atoms/ErrorNote';
import { AppShell } from '@site/components/organisms/AppShell';
import { FinalScoreboard } from '@site/components/organisms/FinalScoreboard';
import { GameBoard } from '@site/components/organisms/GameBoard';
import { JoinGameForm } from '@site/components/organisms/JoinGameForm';
import { LobbyPanel } from '@site/components/organisms/LobbyPanel';
import { ApiError } from '@site/lib/api.client';
import { useGameSocket } from '@site/lib/game-socket.hook';
import { loadSeat } from '@site/lib/player-session.store';
import {
  useConfig,
  useGame,
  useJoinGame,
  usePlaceBid,
  useResolveRound,
  useStartGame,
} from '@site/lib/queries/game.queries';
import { useRoundClock } from '@site/lib/round-clock.hook';
import { isJoinable, isRoundOver } from '@site/lib/game-phase.core';

function failureCode(failure: unknown): string | null {
  return failure instanceof ApiError ? failure.code : null;
}

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
  const joinGame = useJoinGame();

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
        <div className="space-y-4">
          <ErrorNote code={failureCode(gameQuery.error)} />
        </div>
      </AppShell>
    );
  }

  if (isJoinable(areYouSeated, game.status)) {
    return (
      <AppShell>
        <div className="space-y-5">
          <h1 className="text-3xl font-black">{t('join.title', { code: game.joinCode })}</h1>
          <ErrorNote code={failureCode(joinGame.error)} />
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
      <div className="space-y-4">
        <ErrorNote code={failureCode(placeBid.error ?? startGame.error)} />
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
        {isFinished ? (
          <FinalScoreboard
            game={game}
            onHome={() => {
              void navigate('/');
            }}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

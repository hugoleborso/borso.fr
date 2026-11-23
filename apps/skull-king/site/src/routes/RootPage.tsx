import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  buildGameSearch,
  GAME_PARAMETER,
  readGameCode,
  readSideView,
  isWatchMoved,
  type RematchWatch,
  selectGameScreen,
  type SideView,
  VIEW_PARAMETER,
  watchRematch,
} from '@site/lib/game-address.core';
import { useGameSocket } from '@site/lib/game-socket.hook';
import { useConfig, useGame } from '@site/lib/queries/game.queries';
import { readRejectionCode } from '@site/lib/rejection-code.core';
import { Button } from '@site/components/atoms/Button';
import { ErrorNote } from '@site/components/atoms/ErrorNote';
import { Glyph } from '@site/components/atoms/Glyph';
import { BiddingScreen } from '@site/components/organisms/BiddingScreen';
import { HomeScreen } from '@site/components/organisms/HomeScreen';
import { InviteScreen } from '@site/components/organisms/InviteScreen';
import { ScoresScreen } from '@site/components/organisms/ScoresScreen';
import { ScoringScreen } from '@site/components/organisms/ScoringScreen';

// @FollowsBlueprint route-owning-its-live-connection
export function RootPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const joinCode = readGameCode(searchParams.get(GAME_PARAMETER)) ?? '';
  const view = readSideView(searchParams.get(VIEW_PARAMETER));

  const [rematchWatch, setRematchWatch] = useState<RematchWatch | null>(null);
  const config = useConfig();
  const gameQuery = useGame(joinCode);
  useGameSocket(config.data?.websocketUrl ?? null, joinCode);

  const show = (code: string, sideView: SideView | null) => {
    void navigate(buildGameSearch(code, sideView));
  };

  if (joinCode === '') return <HomeScreen />;

  const game = gameQuery.data;
  if (game === undefined) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
        {gameQuery.isPending ? (
          <p className="text-center text-muted">{t('common.loading')}</p>
        ) : (
          <>
            <ErrorNote code={readRejectionCode(gameQuery.error)} />
            <Button
              variant="primary"
              aria-label={t('common.back')}
              className="w-full"
              onClick={() => {
                void navigate('/');
              }}
            >
              <Glyph name="back" className="size-6" />
            </Button>
          </>
        )}
      </main>
    );
  }

  const watched = watchRematch(rematchWatch, game.joinCode, game.rematchJoinCode ?? null);
  const isMoved = isWatchMoved(rematchWatch, watched);
  if (isMoved) setRematchWatch(watched);
  if (watched.follow !== null) return <Navigate to={buildGameSearch(watched.follow, 'invite')} />;

  const screen = selectGameScreen(game.phase, view);
  if (screen === 'invite') {
    return (
      <InviteScreen
        game={game}
        onPlay={() => {
          show(joinCode, null);
        }}
      />
    );
  }
  if (screen === 'bidding') {
    return (
      <BiddingScreen
        game={game}
        onScores={() => {
          show(joinCode, 'scores');
        }}
      />
    );
  }
  if (screen === 'scoring') {
    return (
      <ScoringScreen
        key={game.currentRound}
        game={game}
        onScores={() => {
          show(joinCode, 'scores');
        }}
        onRoundClosed={() => {
          show(joinCode, 'scores');
        }}
      />
    );
  }
  return (
    <ScoresScreen
      game={game}
      onContinue={() => {
        show(joinCode, null);
      }}
      onRematch={(nextCode) => {
        show(nextCode, 'invite');
      }}
    />
  );
}

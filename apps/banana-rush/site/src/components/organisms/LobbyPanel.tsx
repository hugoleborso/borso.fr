import { MINIMUM_SEATS } from '@domain/game-setup.core';
import { useTranslation } from 'react-i18next';
import type { BroadcastGame } from '@site/lib/game-broadcast.core';
import { NO_FREE_SEATS } from '@site/lib/game-summary.core';
import { ChunkyButton } from '../atoms/ChunkyButton';
import { Chip } from '../atoms/Chip';
import { JoinCodeBadge } from '../molecules/JoinCodeBadge';
import { PlayerCard } from '../molecules/PlayerCard';

export interface LobbyPanelProps {
  readonly game: BroadcastGame;
  readonly isHost: boolean;
  readonly starting: boolean;
  readonly onStart: () => void;
}

// @FollowsBlueprint organism-presentational
export function LobbyPanel({ game, isHost, starting, onStart }: LobbyPanelProps) {
  const { t } = useTranslation();
  const isEnoughPlayers = game.players.length >= MINIMUM_SEATS;
  const isTableFull = game.freeSeats === NO_FREE_SEATS;
  const fullLabel = t('lobby.full');
  const seatsLeftLabel = t('lobby.seatsLeft', { count: game.freeSeats });

  return (
    <div className="space-y-4">
      <JoinCodeBadge joinCode={game.joinCode} />

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black">{t('lobby.title')}</h2>
          <Chip tone={isTableFull ? 'coral' : 'leaf'}>
            {isTableFull ? fullLabel : seatsLeftLabel}
          </Chip>
        </div>
        <ul className="space-y-2">
          {game.players.map((player) => (
            <PlayerCard
              key={player.id}
              nickname={player.nickname}
              avatar={player.avatar}
              stashBananas={player.stashBananas}
              isHost={player.isHost}
              isYou={player.id === game.viewerId}
              hasBid={player.hasBid}
              showBidState={false}
            />
          ))}
        </ul>
      </section>

      <section className="rounded-chunk border-[3px] border-ink bg-cream-sunk px-4 py-3">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
          {t('lobby.settings')}
        </h3>
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold">
          <span className="flex gap-1.5">
            <dt className="text-ink-soft">{t('create.seats')}</dt>
            <dd className="tabular-nums">{game.maxPlayers}</dd>
          </span>
          <span className="flex gap-1.5">
            <dt className="text-ink-soft">{t('create.winningScore')}</dt>
            <dd className="tabular-nums">{game.winningScore}</dd>
          </span>
          <span className="flex gap-1.5">
            <dt className="text-ink-soft">{t('create.timer')}</dt>
            <dd className="tabular-nums">
              {game.roundTimerSeconds === null
                ? t('create.timerNone')
                : t('create.timerSeconds', { count: game.roundTimerSeconds })}
            </dd>
          </span>
        </dl>
      </section>

      {isHost ? (
        <div className="space-y-2">
          <ChunkyButton tone="leaf" onClick={onStart} disabled={starting || !isEnoughPlayers}>
            {t('lobby.start')}
          </ChunkyButton>
          {isEnoughPlayers ? null : (
            <p className="text-center text-sm font-bold text-ink-soft">
              {t('lobby.needMorePlayers')}
            </p>
          )}
        </div>
      ) : (
        <p className="text-center text-sm font-bold text-ink-soft">{t('lobby.waitingForHost')}</p>
      )}
    </div>
  );
}

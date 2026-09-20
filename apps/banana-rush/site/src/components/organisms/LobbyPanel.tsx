import { MINIMUM_SEATS } from '@domain/game-setup.core';
import { useTranslation } from 'react-i18next';
import type { BroadcastGame } from '@site/lib/game-broadcast.core';
import { NO_FREE_SEATS } from '@site/lib/game-summary.core';
import { ChunkyButton } from '../atoms/ChunkyButton';
import { Chip } from '../atoms/Chip';
import { JoinCodeBadge } from '../molecules/JoinCodeBadge';
import { PlayerCard } from '../molecules/PlayerCard';
import { ShareInviteButton } from '../molecules/ShareInviteButton';

export interface LobbyPanelProps {
  readonly game: BroadcastGame;
  readonly isHost: boolean;
  readonly starting: boolean;
  readonly onStart: () => void;
}

/**
 * @Blueprint organism-screen-that-cannot-scroll
 * @BlueprintName Organism Screen That Cannot Scroll
 * @BlueprintUsage Use for a screen whose control at the bottom has to be reachable however much content sits above it.
 * @BlueprintDescription Lays the screen out as a column of fixed bands around one band that takes what is left, rather than as a stack that grows past the fold. The roster is the band that gives: it is the only part whose height depends on how many people are in the room, so it is the only part allowed to absorb the difference, and the control below it keeps its place at every table size. Laying the roster out in two columns is what makes the largest table the rules allow fit a short phone at all — eight full width rows are twice the height of the viewport they have to share with a code, a link and a button. With the page itself unable to scroll, a band that overflowed would put its content out of reach rather than below the fold, so every band here is sized against the fullest game instead of the typical one.
 */
export function LobbyPanel({ game, isHost, starting, onStart }: LobbyPanelProps) {
  const { t } = useTranslation();
  const isEnoughPlayers = game.players.length >= MINIMUM_SEATS;
  const isTableFull = game.freeSeats === NO_FREE_SEATS;
  const fullLabel = t('lobby.full');
  const seatsLeftLabel = t('lobby.seatsLeft', { count: game.freeSeats });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      <JoinCodeBadge joinCode={game.joinCode} />
      <ShareInviteButton joinCode={game.joinCode} />

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="mb-1 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-black">{t('lobby.title')}</h2>
          <Chip tone={isTableFull ? 'coral' : 'leaf'}>
            {isTableFull ? fullLabel : seatsLeftLabel}
          </Chip>
        </div>
        <ul className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 content-start gap-1">
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

      <dl className="flex shrink-0 flex-wrap justify-center gap-x-4 gap-y-0.5 text-xs font-bold">
        <span className="flex gap-1">
          <dt className="text-ink-soft">{t('create.seats')}</dt>
          <dd className="tabular-nums">{game.maxPlayers}</dd>
        </span>
        <span className="flex gap-1">
          <dt className="text-ink-soft">{t('create.winningScore')}</dt>
          <dd className="tabular-nums">{game.winningScore}</dd>
        </span>
        <span className="flex gap-1">
          <dt className="text-ink-soft">{t('create.timer')}</dt>
          <dd className="tabular-nums">
            {game.roundTimerSeconds === null
              ? t('create.timerNone')
              : t('create.timerSeconds', { count: game.roundTimerSeconds })}
          </dd>
        </span>
      </dl>

      {isHost ? (
        <div className="shrink-0 space-y-1">
          <ChunkyButton tone="leaf" onClick={onStart} disabled={starting || !isEnoughPlayers}>
            {t('lobby.start')}
          </ChunkyButton>
          {isEnoughPlayers ? null : (
            <p className="text-center text-xs font-bold text-ink-soft">
              {t('lobby.needMorePlayers')}
            </p>
          )}
        </div>
      ) : (
        <p className="shrink-0 text-center text-sm font-bold text-ink-soft">
          {t('lobby.waitingForHost')}
        </p>
      )}
    </div>
  );
}

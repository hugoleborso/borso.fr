import { useTranslation } from 'react-i18next';
import type { BroadcastGame } from '@site/lib/game-broadcast.core';
import { sortByStashDescending } from '@site/lib/game-summary.core';
import { ChunkyButton } from '../atoms/ChunkyButton';
import { MonkeyFace } from '../atoms/MonkeyFace';
import { BananaRain } from '../molecules/BananaRain';
import { PlayerCard } from '../molecules/PlayerCard';

const SINGLE_WINNER = 1;

export interface FinalScoreboardProps {
  readonly game: BroadcastGame;
  readonly onHome: () => void;
  readonly onRecap: () => void;
  readonly onPlayAgain: () => void;
  readonly playingAgain: boolean;
}

// @FollowsBlueprint organism-presentational
export function FinalScoreboard({
  game,
  onHome,
  onRecap,
  onPlayAgain,
  playingAgain,
}: FinalScoreboardProps) {
  const { t } = useTranslation();
  const winners = game.players.filter((player) => game.winnerIds.includes(player.id));
  const soleWinner = winners.length === SINGLE_WINNER ? winners[0] : undefined;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-3">
      <BananaRain />
      <section className="shrink-0 rounded-chunk border-[3px] border-ink bg-peel px-4 py-3 text-center shadow-chunk">
        <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
          {t('final.title')}
        </p>
        <div className="mt-1 flex items-center justify-center gap-2">
          {winners.map((winner) => (
            <MonkeyFace
              key={winner.id}
              avatar={winner.avatar}
              className="h-14 w-14 animate-victory-bounce"
            />
          ))}
        </div>
        <p className="mt-1 text-lg font-black">
          {soleWinner === undefined
            ? t('final.winners')
            : t('final.winner', { nickname: soleWinner.nickname })}
        </p>
      </section>

      <ul className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 content-start gap-1.5">
        {sortByStashDescending(game.players).map((player) => (
          <PlayerCard
            key={player.id}
            nickname={player.nickname}
            avatar={player.avatar}
            stashBananas={player.stashBananas}
            isHost={player.isHost}
            isYou={player.id === game.viewerId}
            hasBid={false}
            showBidState={false}
          />
        ))}
      </ul>

      <div className="flex shrink-0 gap-2">
        <ChunkyButton tone="cream" size="medium" className="min-w-0 flex-1 px-2" onClick={onRecap}>
          {t('final.recap')}
        </ChunkyButton>
        <ChunkyButton
          tone="leaf"
          size="medium"
          className="min-w-0 flex-1 px-2"
          disabled={playingAgain}
          onClick={onPlayAgain}
        >
          {t('final.playAgain')}
        </ChunkyButton>
        <ChunkyButton tone="cream" size="medium" className="min-w-0 flex-1 px-2" onClick={onHome}>
          {t('final.home')}
        </ChunkyButton>
      </div>
    </div>
  );
}

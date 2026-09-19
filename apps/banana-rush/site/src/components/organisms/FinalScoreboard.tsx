import { useTranslation } from 'react-i18next';
import type { BroadcastGame } from '@site/lib/game-broadcast.core';
import { sortByStashDescending } from '@site/lib/game-summary.core';
import { ChunkyButton } from '../atoms/ChunkyButton';
import { MonkeyFace } from '../atoms/MonkeyFace';
import { PlayerCard } from '../molecules/PlayerCard';

const SINGLE_WINNER = 1;

export interface FinalScoreboardProps {
  readonly game: BroadcastGame;
  readonly onHome: () => void;
}

// @FollowsBlueprint organism-presentational
export function FinalScoreboard({ game, onHome }: FinalScoreboardProps) {
  const { t } = useTranslation();
  const winners = game.players.filter((player) => game.winnerIds.includes(player.id));
  const soleWinner = winners.length === SINGLE_WINNER ? winners[0] : undefined;

  return (
    <div className="space-y-4">
      <section className="rounded-chunk border-[3px] border-ink bg-peel px-4 py-5 text-center shadow-chunk">
        <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
          {t('final.title')}
        </p>
        <div className="mt-2 flex items-center justify-center gap-2">
          {winners.map((winner) => (
            <MonkeyFace key={winner.id} avatar={winner.avatar} className="h-16 w-16" />
          ))}
        </div>
        <p className="mt-2 text-xl font-black">
          {soleWinner === undefined
            ? t('final.winners')
            : t('final.winner', { nickname: soleWinner.nickname })}
        </p>
      </section>

      <ul className="space-y-2">
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

      <ChunkyButton tone="cream" onClick={onHome}>
        {t('final.home')}
      </ChunkyButton>
    </div>
  );
}

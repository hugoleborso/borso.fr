import { useTranslation } from 'react-i18next';
import type { BroadcastGame } from '@site/lib/game-broadcast.core';
import { sortByStashDescending } from '@site/lib/game-summary.core';
import { CrateCard } from '../molecules/CrateCard';
import { PlayerCard } from '../molecules/PlayerCard';
import { RoundCountdown } from '../atoms/RoundCountdown';
import { BidPad } from './BidPad';
import { RoundReveal } from './RoundReveal';

export interface GameBoardProps {
  readonly game: BroadcastGame;
  readonly secondsRemaining: number | null;
  readonly submitting: boolean;
  readonly onBid: (amount: number) => void;
}

// @FollowsBlueprint organism-presentational
export function GameBoard({ game, secondsRemaining, submitting, onBid }: GameBoardProps) {
  const { t } = useTranslation();
  const isYouHaveBid = game.viewerBid !== null;

  return (
    <div className="space-y-4">
      <CrateCard
        crateBananas={game.crateBananas}
        roundNumber={game.currentRound}
        winningScore={game.winningScore}
      />

      <RoundCountdown secondsRemaining={secondsRemaining} />

      {isYouHaveBid ? (
        <section className="rounded-chunk border-[3px] border-ink bg-leaf-soft px-4 py-4 text-center shadow-chunk">
          <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
            {t('game.yourBid')}
          </p>
          <p className="text-5xl font-black tabular-nums leading-tight">{game.viewerBid}</p>
          <p className="mt-1 text-sm font-bold text-ink-soft">{t('game.waiting')}</p>
        </section>
      ) : (
        <BidPad onBid={onBid} submitting={submitting} />
      )}

      <ul className="space-y-2">
        {sortByStashDescending(game.players).map((player) => (
          <PlayerCard
            key={player.id}
            nickname={player.nickname}
            avatar={player.avatar}
            stashBananas={player.stashBananas}
            isHost={player.isHost}
            isYou={player.id === game.viewerId}
            hasBid={player.hasBid}
            showBidState
          />
        ))}
      </ul>

      <RoundReveal game={game} />
    </div>
  );
}

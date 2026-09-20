import { useTranslation } from 'react-i18next';
import type { BroadcastGame } from '@site/lib/game-broadcast.core';
import { sortByStashDescending } from '@site/lib/game-summary.core';
import { isLastRoundShowing } from '@site/lib/game-phase.core';
import { CrateCard } from '../molecules/CrateCard';
import { PlayerCard } from '../molecules/PlayerCard';
import { BidPad } from './BidPad';
import { RoundReveal } from './RoundReveal';

export interface GameBoardProps {
  readonly game: BroadcastGame;
  readonly secondsRemaining: number | null;
  readonly submitting: boolean;
  readonly onBid: (amount: number) => void;
}

/**
 * @Blueprint organism-one-band-answering-the-moment
 * @BlueprintName Organism One Band Answering The Moment
 * @BlueprintUsage Use where two panels each deserve the same space and a screen that cannot scroll has room for one.
 * @BlueprintDescription Gives the flexible band to whichever panel answers the question the player has right now, rather than stacking both and pushing the controls past the fold. Before a bid is placed the question is what the last round did to everyone, and the reveal answers it while carrying the stashes the decision needs; once the bid is in, the question becomes who is still thinking, and the roster answers that. Only one is ever mounted, so the band is sized once against the fullest table and neither panel has to shrink to accommodate the other.
 */
export function GameBoard({ game, secondsRemaining, submitting, onBid }: GameBoardProps) {
  const { t } = useTranslation();
  const isYouHaveBid = game.viewerBid !== null;
  const isRevealShowing = isLastRoundShowing(game.lastRound !== null, isYouHaveBid);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      <CrateCard
        crateBananas={game.crateBananas}
        roundNumber={game.currentRound}
        winningScore={game.winningScore}
        secondsRemaining={secondsRemaining}
      />

      {isYouHaveBid ? (
        <section className="shrink-0 rounded-chunk border-[3px] border-ink bg-leaf-soft px-4 py-2 text-center shadow-chunk">
          <p className="text-[0.625rem] font-extrabold uppercase tracking-widest text-ink-soft">
            {t('game.yourBid')}
          </p>
          <p className="text-4xl font-black leading-none tabular-nums">{game.viewerBid}</p>
          <p className="mt-1 text-xs font-bold text-ink-soft">{t('game.waiting')}</p>
        </section>
      ) : (
        <BidPad onBid={onBid} submitting={submitting} />
      )}

      {isRevealShowing ? (
        <RoundReveal game={game} />
      ) : (
        <ul className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 content-start gap-1">
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
      )}
    </div>
  );
}

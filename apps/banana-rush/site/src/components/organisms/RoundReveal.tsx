import { useTranslation } from 'react-i18next';
import type { BroadcastGame } from '@site/lib/game-broadcast.core';
import { buildRoundStories } from '@site/lib/game-summary.core';
import { RoundStoryRow } from '../molecules/RoundStoryRow';

const SHARED_CRATE_WINNERS = 1;

export interface RoundRevealProps {
  readonly game: BroadcastGame;
}

// @FollowsBlueprint organism-presentational
export function RoundReveal({ game }: RoundRevealProps) {
  const { t } = useTranslation();
  const stories = buildRoundStories(game);
  if (game.lastRound === null || stories.length === 0) return null;

  const crateWinners = stories.filter((story) => story.wonTheCrate).length;
  return (
    <section className="rounded-chunk border-[3px] border-ink bg-cream-sunk px-3 py-3 shadow-chunk">
      <h2 className="mb-2 text-center text-sm font-black uppercase tracking-widest text-ink-soft">
        {t('reveal.title', { number: game.lastRound.roundNumber })}
      </h2>
      <ul className="space-y-2">
        {stories.map((story) => (
          <RoundStoryRow
            key={story.playerId}
            story={story}
            isYou={story.playerId === game.viewerId}
            sharedCrate={crateWinners > SHARED_CRATE_WINNERS}
          />
        ))}
      </ul>
    </section>
  );
}

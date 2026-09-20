import { useTranslation } from 'react-i18next';
import type { BroadcastGame } from '@site/lib/game-broadcast.core';
import { buildRoundStories } from '@site/lib/game-summary.core';
import { RoundStoryRow } from '../molecules/RoundStoryRow';

export interface RoundRevealProps {
  readonly game: BroadcastGame;
}

// @FollowsBlueprint organism-presentational
export function RoundReveal({ game }: RoundRevealProps) {
  const { t } = useTranslation();
  const stories = buildRoundStories(game);
  if (game.lastRound === null || stories.length === 0) return null;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <h2 className="mb-1 shrink-0 text-center text-[0.625rem] font-black uppercase leading-tight tracking-widest text-ink-soft">
        {t('reveal.title', { number: game.lastRound.roundNumber })}
      </h2>
      <ul className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 content-start gap-1">
        {stories.map((story) => (
          <RoundStoryRow
            key={story.playerId}
            story={story}
            isYou={story.playerId === game.viewerId}
          />
        ))}
      </ul>
    </section>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BroadcastGame } from '@site/lib/game-broadcast.core';
import {
  buildRecapRounds,
  clampPageIndex,
  isNextStepBlocked,
  isPreviousStepBlocked,
  selectPage,
} from '@site/lib/game-recap.core';
import { useGameRounds } from '@site/lib/queries/game.queries';
import { ChunkyButton } from '../atoms/ChunkyButton';
import { StashCount } from '../atoms/StashCount';
import { RoundStoryRow } from '../molecules/RoundStoryRow';

export interface RoundRecapProps {
  readonly game: BroadcastGame;
  readonly onClose: () => void;
}

const ONE_PAGE = 1;
const FIRST_PAGE = 0;

/**
 * @Blueprint organism-history-one-page-at-a-time
 * @BlueprintName Organism Reading A History One Page At A Time
 * @BlueprintUsage Use for a screen showing a record that grows with every step of a game, on a page that is not allowed to scroll.
 * @BlueprintDescription Shows one round at a time between a fixed header and a fixed footer, so the flexible band in the middle is sized against the largest table the rules allow and never against the number of rounds played. A long game therefore costs steps rather than height, which is what keeps the controls reachable with a thumb on the shortest phone. The rows are the same ones the live reveal draws, so a round reads identically whether it is watched as it happens or read back afterwards, and the page index is held inside its range by a pure function rather than by a guard at each button.
 */
export function RoundRecap({ game, onClose }: RoundRecapProps) {
  const { t } = useTranslation();
  const roundsQuery = useGameRounds(game.joinCode);
  const [wantedPage, setWantedPage] = useState(FIRST_PAGE);

  const pages = buildRecapRounds(roundsQuery.data ?? [], game.players);
  const pageIndex = clampPageIndex(wantedPage, pages.length);
  const page = selectPage(pages, pageIndex);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <section className="flex shrink-0 items-center gap-2 rounded-chunk border-[3px] border-ink bg-peel px-2 py-2 shadow-chunk">
        <ChunkyButton
          tone="cream"
          size="small"
          className="min-h-11 min-w-11 shrink-0"
          aria-label={t('recap.previous')}
          disabled={isPreviousStepBlocked(pageIndex)}
          onClick={() => {
            setWantedPage(clampPageIndex(pageIndex - ONE_PAGE, pages.length));
          }}
        >
          <span aria-hidden="true">◀</span>
        </ChunkyButton>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-xs font-extrabold uppercase tracking-widest text-ink-soft">
            {page === undefined
              ? t('recap.empty')
              : t('recap.position', { number: page.roundNumber, total: pages.length })}
          </p>
          {page === undefined ? null : (
            <p className="flex items-center justify-center gap-1 text-sm font-black">
              <StashCount count={page.crateBefore} iconClassName="h-4 w-4" />
              <span aria-hidden="true">→</span>
              <span className="sr-only">{t('recap.crate')}</span>
              <StashCount count={page.crateAfter} iconClassName="h-4 w-4" />
            </p>
          )}
        </div>
        <ChunkyButton
          tone="cream"
          size="small"
          className="min-h-11 min-w-11 shrink-0"
          aria-label={t('recap.next')}
          disabled={isNextStepBlocked(pageIndex, pages.length)}
          onClick={() => {
            setWantedPage(clampPageIndex(pageIndex + ONE_PAGE, pages.length));
          }}
        >
          <span aria-hidden="true">▶</span>
        </ChunkyButton>
      </section>

      <ul className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 content-start gap-1">
        {page?.stories.map((story) => (
          <RoundStoryRow
            key={story.playerId}
            story={story}
            isYou={story.playerId === game.viewerId}
          />
        ))}
      </ul>

      <ChunkyButton tone="cream" className="shrink-0" onClick={onClose}>
        {t('recap.back')}
      </ChunkyButton>
    </div>
  );
}

import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import {
  hasPaidATariff,
  hasReceivedATariff,
  type RoundStory,
  selectStoryTone,
} from '@site/lib/game-summary.core';
import { Chip } from '../atoms/Chip';
import { MonkeyFace } from '../atoms/MonkeyFace';
import { StashCount } from '../atoms/StashCount';

export interface RoundStoryRowProps {
  readonly story: RoundStory;
  readonly isYou: boolean;
  readonly sharedCrate: boolean;
}

// @FollowsBlueprint molecule-view-selector
export function RoundStoryRow({ story, isYou, sharedCrate }: RoundStoryRowProps) {
  const { t } = useTranslation();
  const hasPaid = hasPaidATariff(story);
  const hasReceived = hasReceivedATariff(story);
  return (
    <li
      className={clsx(
        'rounded-chunk border-[3px] border-ink px-3 py-2.5 shadow-chunk-sm',
        selectStoryTone(story.busted, isYou),
      )}
    >
      <span className="flex items-center gap-3">
        <MonkeyFace avatar={story.avatar} asleep={story.busted} className="h-10 w-10 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-extrabold">{story.nickname}</span>
          <span className="block text-xs font-bold text-ink-soft">
            {t('game.yourBid')} <span className="tabular-nums text-ink">{story.bid}</span>
          </span>
        </span>
        <span className="shrink-0 text-right">
          <StashCount count={story.stashAfter} className="text-lg" iconClassName="h-5 w-5" />
          <span className="block text-xs font-bold tabular-nums text-ink-soft">
            {story.stashBefore} →
          </span>
        </span>
      </span>
      <span className="mt-2 flex flex-wrap gap-1.5">
        {story.busted ? <Chip tone="coral">{t('reveal.busted')}</Chip> : null}
        {story.wonTheCrate ? (
          <Chip tone="peel">{sharedCrate ? t('reveal.split') : t('reveal.wonCrate')}</Chip>
        ) : null}
        {hasPaid ? (
          <Chip tone="quiet">{t('reveal.paidTariff', { count: story.tariffPaid })}</Chip>
        ) : null}
        {hasReceived ? (
          <Chip tone="leaf">{t('reveal.receivedTariff', { count: story.tariffReceived })}</Chip>
        ) : null}
      </span>
    </li>
  );
}

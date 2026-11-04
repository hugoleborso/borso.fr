/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { ButtonLink } from '../atoms/ButtonLink';
import { PulsingDot } from '../atoms/PulsingDot';

export interface VoteInProgressBannerProps {
  readonly setlistId: string;
}

// @FollowsBlueprint molecule-presentational
export function VoteInProgressBanner({ setlistId }: VoteInProgressBannerProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      className="mb-3 flex items-center gap-3 rounded-md border border-accent bg-accent-soft px-4 py-3"
    >
      <PulsingDot tone="accent" />
      <div className="min-w-0 flex-1">
        <p className="m-0 font-medium text-ink">{t('voting.votingNow')}</p>
        <p className="m-0 text-meta text-ink-soft">{t('voting.votingNowHint')}</p>
      </div>
      <ButtonLink to={`/setlists/${setlistId}/vote`} icon="vote">
        {t('voting.goVote')}
      </ButtonLink>
    </div>
  );
}

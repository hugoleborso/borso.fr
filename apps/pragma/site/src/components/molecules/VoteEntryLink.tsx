/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { SetlistStatus } from '../../routes/setlists/setlist-status.core';
import { Badge } from '../atoms/Badge';

export interface VoteEntryLinkProps {
  readonly setlistId: string;
  readonly status: SetlistStatus;
}

// @FollowsBlueprint molecule-presentational
export function VoteEntryLink({ setlistId, status }: VoteEntryLinkProps): JSX.Element {
  const { t } = useTranslation();
  const isInVote = status === 'voting';
  return (
    <Link
      to={`/setlists/${setlistId}/vote`}
      className="inline-flex items-center gap-2 self-start min-h-11 text-ink-700 no-underline"
    >
      {isInVote ? (
        <Badge tone="accent">{t('voting.statusVoting')}</Badge>
      ) : (
        <span className="underline">{t('voting.openVote')}</span>
      )}
    </Link>
  );
}

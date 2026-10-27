/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigateTo } from '../../lib/navigation.hook';
import type { SetlistStatus } from '@domain/setlist-vote.core';
import { IconButton } from '../atoms/IconButton';

export interface VoteEntryLinkProps {
  readonly setlistId: string;
  readonly status: SetlistStatus;
}

const LABEL_BY_STATUS = {
  voting: 'voting.enterVote',
  locked: 'voting.openVote',
} as const satisfies Readonly<Record<SetlistStatus, string>>;

const VARIANT_BY_STATUS = {
  voting: 'secondary',
  locked: 'quiet',
} as const satisfies Readonly<Record<SetlistStatus, 'secondary' | 'quiet'>>;

// @FollowsBlueprint molecule-presentational
export function VoteEntryLink({ setlistId, status }: VoteEntryLinkProps): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();

  return (
    <IconButton
      variant={VARIANT_BY_STATUS[status]}
      icon="vote"
      label={t(LABEL_BY_STATUS[status])}
      onClick={() => navigateTo(`/setlists/${setlistId}/vote`)}
    />
  );
}

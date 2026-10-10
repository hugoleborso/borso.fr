/** @Feature setlist-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigateTo } from '../../lib/navigation.hook';
import type { SetlistStatus } from '@domain/setlist-vote.core';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';

export interface VoteEntryLinkProps {
  readonly setlistId: string;
  readonly status: SetlistStatus;
}

const LABEL_BY_STATUS = {
  voting: 'voting.enterVote',
  locked: 'voting.openVote',
} as const satisfies Readonly<Record<SetlistStatus, string>>;

const VARIANT_BY_STATUS = {
  voting: 'accent',
  locked: 'ghost',
} as const satisfies Readonly<Record<SetlistStatus, 'accent' | 'ghost'>>;

// @FollowsBlueprint molecule-presentational
export function VoteEntryLink({ setlistId, status }: VoteEntryLinkProps): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();

  return (
    <Button
      type="button"
      variant={VARIANT_BY_STATUS[status]}
      aria-label={t(LABEL_BY_STATUS[status])}
      title={t(LABEL_BY_STATUS[status])}
      className="w-11 px-0"
      onClick={() => navigateTo(`/setlists/${setlistId}/vote`)}
    >
      <Icon name="vote" size={18} />
    </Button>
  );
}

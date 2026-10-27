/** @Feature audience-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigateTo } from '../../lib/navigation.hook';
import { IconButton } from '../atoms/IconButton';

export interface AudienceVoteLinkProps {
  readonly setlistId: string;
}

// @FollowsBlueprint molecule-presentational
export function AudienceVoteLink({ setlistId }: AudienceVoteLinkProps): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();

  return (
    <IconButton
      icon="audience"
      label={t('audience.panelTitle')}
      onClick={() => navigateTo(`/setlists/${setlistId}/audience`)}
    />
  );
}

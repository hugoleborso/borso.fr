/** @Feature audience-voting */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigateTo } from '../../lib/navigation.hook';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';

export interface AudienceVoteLinkProps {
  readonly setlistId: string;
}

// @FollowsBlueprint molecule-presentational
export function AudienceVoteLink({ setlistId }: AudienceVoteLinkProps): JSX.Element {
  const { t } = useTranslation();
  const navigateTo = useNavigateTo();

  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={t('audience.panelTitle')}
      title={t('audience.panelTitle')}
      className="w-11 px-0"
      onClick={() => navigateTo(`/setlists/${setlistId}/audience`)}
    >
      <Icon name="audience" size={18} />
    </Button>
  );
}

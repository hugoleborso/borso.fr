/** @Feature sessions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { recordProductEvent } from '../../observability/product-event.adapter';
import type { SessionPills } from '../../routes/sessions/session-page.core';
import { BottomActions } from '../atoms/BottomActions';
import { Button } from '../atoms/Button';
import { ButtonLink } from '../atoms/ButtonLink';

export interface SessionPrimaryActionsProps {
  readonly pills: SessionPills;
  readonly isAddingSetlist: boolean;
  readonly onAddSetlist: () => void;
}

// @FollowsBlueprint molecule-presentational
export function SessionPrimaryActions({
  pills,
  isAddingSetlist,
  onAddSetlist,
}: SessionPrimaryActionsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <BottomActions>
      {pills.setlistPath === null ? null : (
        <ButtonLink icon="arrowR" variant={pills.setlistVariant} to={pills.setlistPath}>
          {t(pills.setlistLabelKey)}
        </ButtonLink>
      )}
      {pills.practicePath === null ? null : (
        <ButtonLink
          icon="play"
          variant="primary"
          to={pills.practicePath}
          onClick={() => recordProductEvent('practice_mode_started')}
        >
          {t('practice.start')}
        </ButtonLink>
      )}
      {pills.isAddSetlistShown ? (
        <Button icon="plus" variant="primary" disabled={isAddingSetlist} onClick={onAddSetlist}>
          {t('sessions.addSetlist')}
        </Button>
      ) : null}
    </BottomActions>
  );
}

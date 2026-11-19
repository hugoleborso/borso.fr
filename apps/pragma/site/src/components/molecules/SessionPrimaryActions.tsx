/** @Feature sessions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { recordProductEvent } from '../../observability/product-event.adapter';
import {
  isSessionPillRowCrowded,
  type SessionPills,
} from '../../routes/sessions/session-page.core';
import { BottomActions } from '../atoms/BottomActions';
import { Button } from '../atoms/Button';
import { ButtonLink } from '../atoms/ButtonLink';
import type { IconName } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';

export interface SessionPrimaryActionsProps {
  readonly pills: SessionPills;
  readonly isAddingSetlist: boolean;
  readonly onAddSetlist: () => void;
  readonly onChooseSongs: () => void;
  readonly orderSongs: { readonly order: () => void; readonly isPending: boolean };
}

interface PillActionProps {
  readonly icon: IconName;
  readonly variant: 'primary' | 'secondary';
  readonly label: string;
  readonly isRowCrowded: boolean;
  readonly disabled: boolean;
  readonly onClick: () => void;
}

function PillAction({
  icon,
  variant,
  label,
  isRowCrowded,
  disabled,
  onClick,
}: PillActionProps): JSX.Element {
  if (isRowCrowded && variant === 'secondary') {
    return (
      <IconButton
        icon={icon}
        variant="secondary"
        label={label}
        disabled={disabled}
        onClick={onClick}
      />
    );
  }
  return (
    <Button
      icon={icon}
      variant={variant}
      labelDisplay={variant === 'secondary' ? 'wide-only' : 'always'}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

// @FollowsBlueprint molecule-presentational
export function SessionPrimaryActions({
  pills,
  isAddingSetlist,
  onAddSetlist,
  onChooseSongs,
  orderSongs,
}: SessionPrimaryActionsProps): JSX.Element {
  const { t } = useTranslation();
  const isCrowded = isSessionPillRowCrowded(pills);
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
      {pills.isOrderSongsShown ? (
        <PillAction
          icon="reorder"
          variant="secondary"
          label={t('sessions.practiceSongs.order')}
          isRowCrowded={isCrowded}
          disabled={orderSongs.isPending}
          onClick={orderSongs.order}
        />
      ) : null}
      {pills.chooseSongsVariant === null ? null : (
        <PillAction
          icon="song"
          variant={pills.chooseSongsVariant}
          label={t('sessions.practiceSongs.choose')}
          isRowCrowded={isCrowded}
          disabled={false}
          onClick={onChooseSongs}
        />
      )}
      {pills.isAddSetlistShown ? (
        <Button icon="plus" variant="primary" disabled={isAddingSetlist} onClick={onAddSetlist}>
          {t('sessions.addSetlist')}
        </Button>
      ) : null}
    </BottomActions>
  );
}

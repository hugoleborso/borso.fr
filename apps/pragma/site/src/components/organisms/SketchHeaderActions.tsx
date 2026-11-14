/** @Feature compositions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { ButtonLink } from '../atoms/ButtonLink';

export interface SketchHeaderActionsProps {
  readonly songId: string | null;
  readonly isCataloguing: boolean;
  readonly onRename: () => void;
  readonly onCatalogue: () => void;
}

// @FollowsBlueprint organism-presentational
export function SketchHeaderActions({
  songId,
  isCataloguing,
  onRename,
  onCatalogue,
}: SketchHeaderActionsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button icon="edit" variant="quiet" size="md" onClick={onRename}>
        {t('compos.rename')}
      </Button>
      {songId === null ? (
        <Button
          icon="plus"
          variant="secondary"
          size="md"
          disabled={isCataloguing}
          onClick={onCatalogue}
        >
          {t('compos.addToCatalogue')}
        </Button>
      ) : (
        <ButtonLink icon="catalog" variant="secondary" size="md" to={`/catalog/${songId}`}>
          {t('compos.openSong')}
        </ButtonLink>
      )}
    </div>
  );
}

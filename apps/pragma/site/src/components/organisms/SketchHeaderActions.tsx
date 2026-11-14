/** @Feature compositions */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { ButtonLink } from '../atoms/ButtonLink';
import { HintText } from '../atoms/HintText';

export interface SketchHeaderActionsProps {
  readonly songId: string | null;
  readonly isCataloguing: boolean;
  readonly isCatalogueFailed: boolean;
  readonly onRename: () => void;
  readonly onCatalogue: () => void;
}

// @FollowsBlueprint organism-presentational
export function SketchHeaderActions({
  songId,
  isCataloguing,
  isCatalogueFailed,
  onRename,
  onCatalogue,
}: SketchHeaderActionsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-start gap-2">
      <Button icon="edit" variant="quiet" size="md" onClick={onRename}>
        {t('compos.rename')}
      </Button>
      {songId === null ? (
        <div className="flex flex-col items-end gap-1">
          <Button
            icon="plus"
            variant="secondary"
            size="md"
            disabled={isCataloguing}
            onClick={onCatalogue}
          >
            {t('compos.addToCatalogue')}
          </Button>
          {isCatalogueFailed ? (
            <div className="max-w-56 text-right">
              <HintText tone="danger" role="alert">
                {t('compos.catalogueFailed')}
              </HintText>
            </div>
          ) : null}
        </div>
      ) : (
        <ButtonLink icon="catalog" variant="secondary" size="md" to={`/catalog/${songId}`}>
          {t('compos.openSong')}
        </ButtonLink>
      )}
    </div>
  );
}

/** @Feature songs */

import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { Input } from '../atoms/Input';

interface SongLinkAdderProps {
  readonly newLinkUrl: string;
  readonly setNewLinkUrl: (value: string) => void;
  readonly onAdd: () => void;
  readonly children: ReactNode;
}

// @FollowsBlueprint organism-presentational
export function SongLinkAdder({
  newLinkUrl,
  setNewLinkUrl,
  onAdd,
  children,
}: SongLinkAdderProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <fieldset className="border border-line rounded-md p-3 mt-2">
      <legend className="text-xs tracking-wider uppercase text-ink-400 font-medium px-2">
        {t('catalog.linksTitle')}
      </legend>
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder={t('catalog.linkPlaceholder')}
          value={newLinkUrl}
          onChange={(event) => setNewLinkUrl(event.target.value)}
        />
        <Button type="button" variant="default" onClick={onAdd}>
          <Icon name="plus" size={14} />
          {t('common.add')}
        </Button>
      </div>
      {children}
    </fieldset>
  );
}

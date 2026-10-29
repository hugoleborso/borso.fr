/** @Feature songs */

import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
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
    <fieldset className="border border-rule rounded-md p-3">
      <legend className="text-label tracking-wider uppercase text-ink-soft font-medium px-2">
        {t('catalog.linksTitle')}
      </legend>
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder={t('catalog.linkPlaceholder')}
          value={newLinkUrl}
          onChange={(event) => setNewLinkUrl(event.target.value)}
        />
        <Button variant="secondary" icon="plus" onClick={onAdd}>
          {t('common.add')}
        </Button>
      </div>
      {children}
    </fieldset>
  );
}

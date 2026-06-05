/**
 * Inline "add an external link" fieldset rendered inside the song
 * edit form. The URL input is locally controlled by the parent
 * (`newLinkUrl` state); the `+ Add` button calls back to the parent's
 * `onAdd` handler which appends to the form's `links` field.
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/atoms/Button';
import { Icon } from '../../components/atoms/Icon';
import { Input } from '../../components/atoms/Input';

interface SongLinkAdderProps {
  readonly newLinkUrl: string;
  readonly setNewLinkUrl: (value: string) => void;
  readonly onAdd: () => void;
}

export function SongLinkAdder({
  newLinkUrl,
  setNewLinkUrl,
  onAdd,
}: SongLinkAdderProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <fieldset className="border border-line rounded-md p-3 mt-2">
      <legend className="text-[11px] tracking-wider uppercase text-ink-400 font-medium px-2">
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
    </fieldset>
  );
}

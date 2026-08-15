/**
 * Inline "add an external link" fieldset rendered inside the song
 * edit form. The URL input is locally controlled by the parent
 * (`newLinkUrl` state); the `+ Add` button calls back to the parent's
 * `onAdd` handler which appends to the form's `links` field.
 *
 * The list of links already on the song is the child, so what you add appears
 * directly under the field you added it in. It used to render a screenful
 * above, which on a phone made Add look like it had done nothing.
 */

import type { JSX, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/atoms/Button';
import { Icon } from '../../components/atoms/Icon';
import { Input } from '../../components/atoms/Input';

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

/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { HintText } from '../atoms/HintText';
import { Input } from '../atoms/Input';

export interface SongDeezerTrackIdFieldProps {
  readonly value: string | null;
  readonly onChange: (next: string | null) => void;
  readonly onBlur: () => void;
}

const FIELD_ID = 'song-deezer-track-id';
const LABEL_CLASS = 'text-xs tracking-wider uppercase text-ink-400 font-medium';

// @FollowsBlueprint molecule-presentational
export function SongDeezerTrackIdField({
  value,
  onChange,
  onBlur,
}: SongDeezerTrackIdFieldProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <label className={LABEL_CLASS} htmlFor={FIELD_ID}>
        {t('catalog.deezerTrackId')}
      </label>
      <Input
        id={FIELD_ID}
        type="text"
        inputMode="numeric"
        value={value ?? ''}
        onChange={(event) => {
          onChange(event.target.value === '' ? null : event.target.value);
        }}
        onBlur={onBlur}
        placeholder={t('catalog.deezerTrackIdPlaceholder')}
      />
      <HintText tone="muted">{t('catalog.deezerTrackIdHint')}</HintText>
    </>
  );
}

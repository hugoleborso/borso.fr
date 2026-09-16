/** @Feature songs */

import { SONG_ORIGINS, type SongOrigin } from '@domain/song-origin.core';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SONG_ORIGIN_LABEL_KEY,
  SONG_STATUS_LABEL_KEY,
  type SongStatus,
  songStatuses,
} from '../../routes/catalog/song-draft.core';
import { EnumSelectField } from './EnumSelectField';

export interface SongClassificationFieldsProps {
  readonly labelClassName: string;
  readonly status: SongStatus;
  readonly origin: SongOrigin;
  readonly onStatusChange: (status: SongStatus) => void;
  readonly onStatusBlur: () => void;
  readonly onOriginChange: (origin: SongOrigin) => void;
  readonly onOriginBlur: () => void;
}

// @FollowsBlueprint molecule-presentational
export function SongClassificationFields(props: SongClassificationFieldsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <EnumSelectField
        id="song-status"
        label={t('catalog.status')}
        labelClassName={props.labelClassName}
        value={props.status}
        options={songStatuses}
        labelOf={(status) => t(SONG_STATUS_LABEL_KEY[status])}
        onChange={props.onStatusChange}
        onBlur={props.onStatusBlur}
      />
      <EnumSelectField
        id="song-origin"
        label={t('catalog.origin')}
        labelClassName={props.labelClassName}
        value={props.origin}
        options={SONG_ORIGINS}
        labelOf={(origin) => t(SONG_ORIGIN_LABEL_KEY[origin])}
        onChange={props.onOriginChange}
        onBlur={props.onOriginBlur}
      />
    </>
  );
}

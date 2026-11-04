/** @Feature songs */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../atoms/Input';
import { FIELD_LABEL_CLASS, LabelledField } from '../atoms/LabelledField';
import { SongEnergyField } from './SongEnergyField';

export interface SongKeyEnergyFieldsProps {
  readonly tonalityStart: string;
  readonly tonalityEnd: string;
  readonly baseEnergy: number | null;
  readonly onTonalityStartChange: (value: string) => void;
  readonly onTonalityEndChange: (value: string) => void;
  readonly onBaseEnergyChange: (level: number) => void;
}

const TONALITY_MAX_LENGTH = 16;

// @FollowsBlueprint molecule-presentational
export function SongKeyEnergyFields(props: SongKeyEnergyFieldsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <div className="grid max-w-md grid-cols-2 gap-3">
        <LabelledField id="song-tonality-start" label={t('catalog.tonalityStart')}>
          <Input
            id="song-tonality-start"
            type="text"
            value={props.tonalityStart}
            onChange={(event) => props.onTonalityStartChange(event.target.value)}
            maxLength={TONALITY_MAX_LENGTH}
          />
        </LabelledField>
        <LabelledField id="song-tonality-end" label={t('catalog.tonalityEnd')}>
          <Input
            id="song-tonality-end"
            type="text"
            value={props.tonalityEnd}
            onChange={(event) => props.onTonalityEndChange(event.target.value)}
            maxLength={TONALITY_MAX_LENGTH}
          />
        </LabelledField>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={FIELD_LABEL_CLASS}>{t('catalog.baseEnergy')}</span>
        <SongEnergyField baseEnergy={props.baseEnergy} onChange={props.onBaseEnergyChange} />
      </div>
    </>
  );
}

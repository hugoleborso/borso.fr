/** @Feature songs */

import { ENERGY_MAX, ENERGY_MIN } from '@domain/input-limits.core';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../atoms/Input';
import { LabelledField } from '../atoms/LabelledField';

export interface SongKeyEnergyFieldsProps {
  readonly tonalityStart: string;
  readonly tonalityEnd: string;
  readonly baseEnergy: string;
  readonly onTonalityStartChange: (value: string) => void;
  readonly onTonalityEndChange: (value: string) => void;
  readonly onBaseEnergyChange: (value: string) => void;
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
      <LabelledField id="song-base-energy" label={t('catalog.baseEnergy')}>
        <Input
          id="song-base-energy"
          type="number"
          inputMode="numeric"
          min={ENERGY_MIN}
          max={ENERGY_MAX}
          value={props.baseEnergy}
          onChange={(event) => props.onBaseEnergyChange(event.target.value)}
          className="w-24"
        />
      </LabelledField>
    </>
  );
}

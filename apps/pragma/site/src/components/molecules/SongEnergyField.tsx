/** @Feature songs */

import { ENERGY_MAX, ENERGY_MIN } from '@domain/input-limits.core';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { EnergyMeter } from '../atoms/EnergyMeter';
import {
  isEnergyStored,
  resolveEnergyLevel,
  selectEnergyMeterAppearance,
} from './setlist-entry-energy.core';

export interface SongEnergyFieldProps {
  readonly baseEnergy: number | null;
  readonly onChange: (level: number) => void;
}

// @FollowsBlueprint molecule-presentational
export function SongEnergyField({ baseEnergy, onChange }: SongEnergyFieldProps): JSX.Element {
  const { t } = useTranslation();
  const state = { entryEnergy: null, songEnergy: baseEnergy };
  const level = resolveEnergyLevel(state);
  const isStored = isEnergyStored(state);
  const appearance = selectEnergyMeterAppearance(isStored);
  return (
    <EnergyMeter
      value={level}
      minimum={ENERGY_MIN}
      maximum={ENERGY_MAX}
      label={t('catalog.baseEnergy')}
      valueText={isStored ? undefined : t('setlist.energyUnset', { value: level })}
      filledClassName={appearance.filledClassName}
      emptyClassName={appearance.emptyClassName}
      className="self-start"
      onChange={onChange}
    />
  );
}

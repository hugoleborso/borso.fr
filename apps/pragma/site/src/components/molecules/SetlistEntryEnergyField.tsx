/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { EnergyMeter } from '../atoms/EnergyMeter';
import {
  ENERGY_MAX,
  ENERGY_MIN,
  isEnergyStored,
  resolveEnergyLevel,
  selectEnergyMeterAppearance,
} from './setlist-entry-energy.core';

export interface SetlistEntryEnergyFieldProps {
  readonly entryEnergy: number | null;
  readonly songEnergy: number | null;
  readonly onPublish: (level: number) => void;
}

// @FollowsBlueprint molecule-presentational
export function SetlistEntryEnergyField({
  entryEnergy,
  songEnergy,
  onPublish,
}: SetlistEntryEnergyFieldProps): JSX.Element {
  const { t } = useTranslation();
  const level = resolveEnergyLevel({ entryEnergy, songEnergy });
  const isStored = isEnergyStored({ entryEnergy, songEnergy });
  const appearance = selectEnergyMeterAppearance(isStored);
  return (
    <EnergyMeter
      value={level}
      minimum={ENERGY_MIN}
      maximum={ENERGY_MAX}
      label={t('setlist.energy')}
      valueText={isStored ? undefined : t('setlist.energyUnset', { value: level })}
      filledClassName={appearance.filledClassName}
      emptyClassName={appearance.emptyClassName}
      onChange={onPublish}
    />
  );
}

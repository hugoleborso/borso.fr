/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { EnergyMeter } from '../atoms/EnergyMeter';
import { isEnergyStored, selectEnergyMeterAppearance } from './setlist-entry-energy.core';
import { ENERGY_MAX, ENERGY_MIN, type SetlistEntryForm } from './setlist-entry-form.hook';

export interface SetlistEntryEnergyFieldProps {
  readonly form: SetlistEntryForm;
  readonly entryEnergy: number | null;
  readonly songEnergy: number | null;
  readonly onPublish: (level: number) => void;
}

// @FollowsBlueprint molecule-presentational
export function SetlistEntryEnergyField({
  form,
  entryEnergy,
  songEnergy,
  onPublish,
}: SetlistEntryEnergyFieldProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <form.Field name="energy">
      {(field) => {
        const isStored = isEnergyStored({
          isEdited: field.state.meta.isDirty,
          entryEnergy,
          songEnergy,
        });
        const appearance = selectEnergyMeterAppearance(isStored);
        return (
          <EnergyMeter
            value={field.state.value}
            minimum={ENERGY_MIN}
            maximum={ENERGY_MAX}
            label={t('setlist.energy')}
            valueText={
              isStored ? undefined : t('setlist.energyUnset', { value: field.state.value })
            }
            filledClassName={appearance.filledClassName}
            emptyClassName={appearance.emptyClassName}
            onChange={(next) => {
              field.handleChange(next);
              onPublish(next);
            }}
          />
        );
      }}
    </form.Field>
  );
}

import { useTranslation } from 'react-i18next';
import { CUSTOM_COLOR_SLOTS, type CustomColorSlot } from '../../art/mondrian/mondrian-labels.core';
import type { CustomColors, Palette } from '../../art/mondrian/palettes.utils';
import { EditableSwatch } from '../atoms/EditableSwatch';

export interface PaletteSwatchesProps {
  palette: Palette;
  customColors: CustomColors;
  onCustomColorChange: (slot: CustomColorSlot, nextHex: string) => void;
}

export function EditablePaletteSwatches({
  customColors,
  onCustomColorChange,
}: PaletteSwatchesProps) {
  const { t } = useTranslation();
  return (
    <>
      {CUSTOM_COLOR_SLOTS.map((descriptor) => {
        const name = t(descriptor.nameKey);
        return (
          <EditableSwatch
            key={descriptor.slot}
            color={customColors[descriptor.slot]}
            name={name}
            title={t('mondrian.swatch.change', { name })}
            editLabel={t('mondrian.swatch.edit', { name })}
            onColorChange={(nextHex) => {
              onCustomColorChange(descriptor.slot, nextHex);
            }}
          />
        );
      })}
    </>
  );
}

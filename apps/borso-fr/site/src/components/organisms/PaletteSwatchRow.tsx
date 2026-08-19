import type { ComponentType } from 'react';
import {
  type CustomColorSlot,
  selectSwatchRowKind,
  type SwatchRowKind,
} from '../../art/mondrian/mondrian-labels.core';
import type { CustomColors, Palette, PaletteKey } from '../../art/mondrian/palettes.utils';
import {
  EditablePaletteSwatches,
  type PaletteSwatchesProps,
} from '../molecules/EditablePaletteSwatches';
import { ReadOnlyPaletteSwatches } from '../molecules/ReadOnlyPaletteSwatches';

const SWATCHES_BY_KIND: Readonly<Record<SwatchRowKind, ComponentType<PaletteSwatchesProps>>> = {
  editable: EditablePaletteSwatches,
  'read-only': ReadOnlyPaletteSwatches,
};

interface PaletteSwatchRowProps {
  paletteKey: PaletteKey;
  palette: Palette;
  customColors: CustomColors;
  onCustomColorChange: (slot: CustomColorSlot, nextHex: string) => void;
}

// @FollowsBlueprint organism-table-dispatch
export function PaletteSwatchRow({
  paletteKey,
  palette,
  customColors,
  onCustomColorChange,
}: PaletteSwatchRowProps) {
  const Swatches = SWATCHES_BY_KIND[selectSwatchRowKind(paletteKey)];
  return (
    <div className="mt-[18px] flex flex-wrap gap-2 atelier-roomy:gap-2.5 [@media(hover:none)]:gap-x-4">
      <Swatches
        palette={palette}
        customColors={customColors}
        onCustomColorChange={onCustomColorChange}
      />
    </div>
  );
}

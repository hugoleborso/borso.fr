import { useTranslation } from 'react-i18next';
import { listDistinctFills } from '../../art/mondrian/palettes.utils';
import { ReadOnlySwatch } from '../atoms/ReadOnlySwatch';
import type { PaletteSwatchesProps } from './EditablePaletteSwatches';

export function ReadOnlyPaletteSwatches({ palette }: PaletteSwatchesProps) {
  const { t } = useTranslation();
  return (
    <>
      {listDistinctFills(palette).map((fill) => (
        <ReadOnlySwatch key={fill.hex} color={fill.hex} name={t(fill.nameKey)} />
      ))}
    </>
  );
}
